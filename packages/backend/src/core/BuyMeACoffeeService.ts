/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { DI } from '@/di-symbols.js';
import type { UserProfilesRepository } from '@/models/_.js';

const donationEvents = new Set(['donation.created', 'donation.refunded']);
const subscriptionEvents = new Set([
	'membership.started', 'membership.updated', 'membership.cancelled', 'membership.paused',
	'recurring_donation.started', 'recurring_donation.updated', 'recurring_donation.cancelled',
]);
const overlayEvents = new Set(['donation.created', 'membership.started', 'recurring_donation.started']);
const overlayLifetime = 3 * 60 * 60 * 1000;

interface WebhookEvent {
	type?: unknown;
	live_mode?: unknown;
	event_id?: unknown;
	created?: unknown;
	data?: {
		id?: unknown;
		supporter_name?: unknown;
		supporter_name_type?: unknown;
		supporter_id?: unknown;
		supporter_email?: unknown;
		amount?: unknown;
		currency?: unknown;
		started_at?: unknown;
		current_period_start?: unknown;
		membership_level_name?: unknown;
		status?: unknown;
		refunded?: unknown;
		paused?: unknown;
		cancel_at_period_end?: unknown;
		current_period_end?: unknown;
	};
}

interface OverlayAlert {
	id: string;
	type: string;
	name: string | null;
	amount: number | null;
	currency: string | null;
	months: number | null;
	level: string | null;
	test: boolean;
}

@Injectable()
export class BuyMeACoffeeService {
	constructor(
		@Inject(DI.db)
		private db: DataSource,
		@Inject(DI.userProfilesRepository)
		private userProfilesRepository: UserProfilesRepository,
		@Inject(DI.redis)
		private redis: Redis.Redis,
	) {}

	public async configure(creatorId: string, secret?: string | null, start = false) {
		if (secret === null) {
			await this.db.query('DELETE FROM "buy_me_a_coffee_connection" WHERE "creatorId" = $1', [creatorId]);
		} else if (secret !== undefined) {
			await this.db.query(`
				INSERT INTO "buy_me_a_coffee_connection" ("id", "creatorId", "secret", "emailKey") VALUES ($1, $2, $3, $4)
				ON CONFLICT ("creatorId") DO UPDATE SET "secret" = EXCLUDED."secret", "verified" = false
				WHERE "buy_me_a_coffee_connection"."secret" <> EXCLUDED."secret"`,
			[randomUUID(), creatorId, secret, randomBytes(32).toString('hex')]);
		}
		if (start && secret === undefined) {
			await this.db.query(`
				INSERT INTO "buy_me_a_coffee_connection" ("id", "creatorId", "secret", "emailKey") VALUES ($1, $2, '', $3)
				ON CONFLICT ("creatorId") DO NOTHING`, [randomUUID(), creatorId, randomBytes(32).toString('hex')]);
		}
		const [connection] = await this.db.query<{ id: string; verified: boolean; secret: string; emailKey: string }[]>(
			'SELECT "id", "verified", "secret", "emailKey" FROM "buy_me_a_coffee_connection" WHERE "creatorId" = $1', [creatorId]);
		if (!connection) return null;
		return {
			id: connection.id,
			verified: connection.verified,
			overlayToken: connection.verified ? this.overlayToken(connection.id, connection.secret, connection.emailKey) : null,
		};
	}

	public async receive(connectionId: string, rawBody: Buffer | undefined, signature: unknown, body: unknown): Promise<number> {
		if (!rawBody || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return 401;
		if (body == null || typeof body !== 'object') return 400;
		const event = body as WebhookEvent;
		return await this.db.transaction(async manager => {
			const [connection] = await manager.query<{ secret: string; emailKey: string }[]>(
				'SELECT "secret", "emailKey" FROM "buy_me_a_coffee_connection" WHERE "id" = $1 FOR UPDATE', [connectionId]);
			if (!connection) return 404;
			if (!connection.secret) return 401;
			const expected = createHmac('sha256', connection.secret).update(rawBody).digest();
			if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) return 401;

			if (typeof event.type !== 'string') return 400;
			const isDonation = donationEvents.has(event.type);
			if (!isDonation && !subscriptionEvents.has(event.type)) return 204;
			if (typeof event.live_mode !== 'boolean') return 400;
			if (!event.live_mode) {
				await manager.query('UPDATE "buy_me_a_coffee_connection" SET "verified" = true WHERE "id" = $1', [connectionId]);
				if (overlayEvents.has(event.type)) {
					const testId = typeof event.created === 'number' ? event.created : Date.now();
					await this.enqueueOverlayEvent(connectionId, this.overlayAlert(event, event.type, `test:${event.type}:${testId}`, true));
				}
				return 204;
			}

			const paymentId = event.data?.id;
			if (typeof paymentId !== 'number' || !Number.isSafeInteger(paymentId) || paymentId <= 0) return 400;
			const scope = event.type.split('.')[0];
			const email = event.data?.supporter_email;
			const emailHash = typeof email === 'string' && email.trim().length > 0
				? this.hashEmail(connection.emailKey, email)
				: null;

			if (isDonation) {
				const refunded = event.type === 'donation.refunded' || event.data?.refunded === 'true' || event.data?.status === 'refunded';
				if (!refunded && event.data?.status !== 'succeeded') return 400;
				await manager.query(`
					INSERT INTO "buy_me_a_coffee_entitlement" ("connectionId", "scope", "paymentId", "emailHash", "revoked")
					VALUES ($1, $2, $3, $4, $5)
					ON CONFLICT ("connectionId", "scope", "paymentId") DO UPDATE SET "revoked" = true, "emailHash" = NULL
					WHERE EXCLUDED."revoked"`, [connectionId, scope, paymentId, refunded ? null : emailHash, refunded]);
				if (!refunded) {
					await this.enqueueOverlayEvent(connectionId, this.overlayAlert(event, event.type, `${scope}:${paymentId}`));
				}
				return 204;
			}

			const created = event.created;
			const eventId = event.event_id;
			if (typeof created !== 'number' || !Number.isSafeInteger(created) || created <= 0) return 400;
			if (typeof eventId !== 'number' || !Number.isSafeInteger(eventId) || eventId <= 0) return 400;
			const cancelled = event.type.endsWith('.cancelled') || event.data?.status === 'canceled';
			const paused = event.type.endsWith('.paused') || event.data?.status === 'paused' || event.data?.paused === 'true';
			const active = !paused && (cancelled ? event.data?.cancel_at_period_end === 'true' : event.data?.status === 'active');
			const periodEnd = event.data?.current_period_end;
			if (active && (typeof periodEnd !== 'number' || !Number.isSafeInteger(periodEnd) || periodEnd <= 0 || periodEnd > 8_640_000_000_000)) return 400;
			const expiresAt = active && typeof periodEnd === 'number' ? new Date(periodEnd * 1000) : null;
			const starting = overlayEvents.has(event.type);
			let renewing = false;
			if (expiresAt && event.type.endsWith('.updated')) {
				const [previous] = await manager.query<{ expiresAt: Date | null; eventCreated: string; eventId: string }[]>(`
					SELECT "expiresAt", "eventCreated", "eventId" FROM "buy_me_a_coffee_entitlement"
					WHERE "connectionId" = $1 AND "scope" = $2 AND "paymentId" = $3`, [connectionId, scope, paymentId]);
				renewing = previous?.expiresAt != null && expiresAt > previous.expiresAt &&
					(created > Number(previous.eventCreated) || (created === Number(previous.eventCreated) && eventId > Number(previous.eventId)));
			}

			await manager.query(`
				INSERT INTO "buy_me_a_coffee_entitlement" ("connectionId", "scope", "paymentId", "emailHash", "revoked", "expiresAt", "eventCreated", "eventId")
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
				ON CONFLICT ("connectionId", "scope", "paymentId") DO UPDATE SET
					"emailHash" = EXCLUDED."emailHash", "revoked" = EXCLUDED."revoked", "expiresAt" = EXCLUDED."expiresAt",
					"eventCreated" = EXCLUDED."eventCreated", "eventId" = EXCLUDED."eventId"
				WHERE (EXCLUDED."eventCreated", EXCLUDED."eventId") >
					("buy_me_a_coffee_entitlement"."eventCreated", "buy_me_a_coffee_entitlement"."eventId")`,
			[connectionId, scope, paymentId, active ? emailHash : null, !active, expiresAt, created, eventId]);
			if (active && (starting || renewing)) {
				const period = event.data?.current_period_start ?? event.data?.started_at ?? periodEnd;
				const id = `${scope}:${paymentId}:${typeof period === 'number' ? period : eventId}`;
				await this.enqueueOverlayEvent(connectionId, this.overlayAlert(event, event.type, id));
			}
			return 204;
		});
	}

	private overlayAlert(event: WebhookEvent, type: string, id: string, test = false): OverlayAlert {
		const data = event.data;
		const name = typeof data?.supporter_name === 'string' ? data.supporter_name.trim().slice(0, 80) : '';
		const supporterId = data?.supporter_id;
		const anonymous = data?.supporter_name_type === 'anonymous';
		const amount = data?.amount;
		const currency = typeof data?.currency === 'string' ? data.currency.toUpperCase() : '';
		const start = data?.started_at;
		const date = data?.current_period_start ?? event.created;
		let months = type.endsWith('.started') ? 1 : null;
		if (typeof start === 'number' && Number.isSafeInteger(start) && start > 0 &&
			typeof date === 'number' && Number.isSafeInteger(date) && date >= start && date <= 8_640_000_000_000) {
			const first = new Date(start * 1000);
			const current = new Date(date * 1000);
			months = (current.getUTCFullYear() - first.getUTCFullYear()) * 12 + current.getUTCMonth() - first.getUTCMonth() + 1;
		}
		return {
			id,
			type,
			name: anonymous ? null : name && !/\S+@\S+\.\S+/.test(name) ? name :
				typeof supporterId === 'number' && Number.isSafeInteger(supporterId) && supporterId > 0 ? `#${supporterId}` : null,
			amount: typeof amount === 'number' && Number.isFinite(amount) && amount >= 0 ? amount : null,
			currency: /^[A-Z]{3}$/.test(currency) ? currency : null,
			months,
			level: typeof data?.membership_level_name === 'string' ? data.membership_level_name.trim().slice(0, 80) : null,
			test,
		};
	}

	private async enqueueOverlayEvent(connectionId: string, alert: OverlayAlert): Promise<void> {
		const key = `coffeeOverlayDetails:${connectionId}`;
		const now = Date.now();
		const results = await this.redis.multi()
			.zremrangebyscore(key, '-inf', now - overlayLifetime)
			.zadd(key, 'NX', now, JSON.stringify(alert))
			.pexpire(key, overlayLifetime)
			.exec();
		if (!results || results.some(([error]) => error)) throw new Error('Unable to queue the OBS alert.');
	}

	public async sendOverlayTest(connectionId: string, type: 'donation' | 'membership' | 'recurring_donation'): Promise<void> {
		const samples = {
			donation: { type: 'donation.created', name: 'Alex', amount: 15, months: null, level: null },
			membership: { type: 'membership.updated', name: 'Mika', amount: 8, months: 3, level: 'Gold' },
			recurring_donation: { type: 'recurring_donation.started', name: 'Jin', amount: 5, months: 1, level: null },
		};
		await this.enqueueOverlayEvent(connectionId, {
			...samples[type],
			id: `test:${randomUUID()}`,
			currency: 'USD',
			test: true,
		});
	}

	public async getOverlayEvents(connectionId: string, authorization: string | undefined, since: number) {
		const token = authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
		if (!token) return null;
		const [connection] = await this.db.query<{ secret: string; emailKey: string }[]>(
			'SELECT "secret", "emailKey" FROM "buy_me_a_coffee_connection" WHERE "id" = $1 AND "verified"', [connectionId]);
		if (!connection) return null;
		const expected = this.overlayToken(connectionId, connection.secret, connection.emailKey);
		if (!timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'))) return null;

		const time = Date.now();
		const rows = await this.redis.zrangebyscore(`coffeeOverlayDetails:${connectionId}`, Math.max(since, time - 120_000), time, 'WITHSCORES');
		const events: (OverlayAlert & { time: number })[] = [];
		for (let i = 0; i < rows.length; i += 2) {
			events.push({ ...JSON.parse(rows[i]) as OverlayAlert, time: Number(rows[i + 1]) });
		}
		return { time, events };
	}

	private overlayToken(connectionId: string, secret: string, emailKey: string): string {
		return createHmac('sha256', emailKey).update(`obs-overlay:${connectionId}:${secret}`).digest('hex');
	}

	public async canAccess(creatorId: string, viewerId?: string): Promise<boolean> {
		if (!viewerId) return false;
		if (creatorId === viewerId) return true;
		const profile = await this.userProfilesRepository.findOneBy({ userId: viewerId, emailVerified: true });
		if (!profile?.email) return false;
		const [connection] = await this.db.query<{ id: string; emailKey: string }[]>(
			'SELECT "id", "emailKey" FROM "buy_me_a_coffee_connection" WHERE "creatorId" = $1 AND "verified"', [creatorId]);
		if (!connection) return false;
		const rows = await this.db.query<unknown[]>(`
			SELECT 1 FROM "buy_me_a_coffee_entitlement" AS entitlement
			JOIN "buy_me_a_coffee_connection" AS connection ON connection."id" = entitlement."connectionId"
			WHERE connection."id" = $1 AND connection."verified" AND entitlement."emailHash" = $2 AND NOT entitlement."revoked"
				AND (entitlement."expiresAt" IS NULL OR entitlement."expiresAt" > NOW())
			LIMIT 1`, [connection.id, this.hashEmail(connection.emailKey, profile.email)]);
		return rows.length > 0;
	}

	private hashEmail(emailKey: string, email: string): string {
		return createHmac('sha256', emailKey).update(email.trim().toLowerCase()).digest('hex');
	}
}

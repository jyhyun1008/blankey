/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createHmac } from 'node:crypto';
import { describe, expect, test, vi } from 'vitest';
import type { DataSource } from 'typeorm';
import type Redis from 'ioredis';
import { BuyMeACoffeeService } from '@/core/BuyMeACoffeeService.js';
import type { UserProfilesRepository } from '@/models/_.js';

describe('Buy Me a Coffee OBS alerts', () => {
	const connectionId = '00000000-0000-0000-0000-000000000001';
	const connection = { id: connectionId, verified: true, secret: 'example signing secret', emailKey: 'example email key' };

	function setup() {
		const query = vi.fn().mockResolvedValue([connection]);
		const db = { query, transaction: (callback: (manager: { query: typeof query }) => Promise<number>) => callback({ query }) };
		const zadd = vi.fn().mockReturnThis();
		const transaction = {
			zadd,
			zremrangebyscore: vi.fn().mockReturnThis(),
			pexpire: vi.fn().mockReturnThis(),
			exec: vi.fn().mockResolvedValue([[null, 1]]),
		};
		const redis = { multi: () => transaction };
		const service = new BuyMeACoffeeService(db as unknown as DataSource, {} as UserProfilesRepository, redis as unknown as Redis.Redis);
		return { service, query, zadd };
	}

	test('signed dashboard samples carry the display name and amount without granting access', async () => {
		const { service, query, zadd } = setup();
		const event = {
			type: 'donation.created',
			live_mode: false,
			created: 1720000000,
			data: { supporter_name: 'Alex', supporter_email: 'private@example.com', amount: 15, currency: 'usd' },
		};
		const body = Buffer.from(JSON.stringify(event));
		expect(await service.receive(connectionId, body, '0'.repeat(64), event)).toBe(401);
		expect(zadd).not.toHaveBeenCalled();
		const signature = createHmac('sha256', connection.secret).update(body).digest('hex');
		expect(await service.receive(connectionId, body, signature, event)).toBe(204);
		expect(query.mock.calls.map(([sql]) => sql).join(' ')).not.toContain('buy_me_a_coffee_entitlement');
		const serialized = zadd.mock.calls[0][3];
		expect(JSON.parse(serialized)).toMatchObject({ name: 'Alex', amount: 15, currency: 'USD', test: true });
		expect(serialized).not.toContain('private@example.com');
	});

	test('a later billing period includes the membership level and current month', async () => {
		const { service, query, zadd } = setup();
		query.mockResolvedValueOnce([connection]).mockResolvedValueOnce([{
			expiresAt: new Date('2026-03-01T00:00:00Z'), eventCreated: '1769904000', eventId: '5',
		}]);
		const event = {
			type: 'membership.updated',
			live_mode: true,
			event_id: 6,
			created: Date.parse('2026-03-01') / 1000,
			data: {
				id: 3,
				status: 'active',
				started_at: Date.parse('2026-01-01') / 1000,
				current_period_start: Date.parse('2026-03-01') / 1000,
				current_period_end: Date.parse('2026-04-01') / 1000,
				membership_level_name: 'Gold',
				supporter_name: 'Mika',
			},
		};
		const body = Buffer.from(JSON.stringify(event));
		const signature = createHmac('sha256', connection.secret).update(body).digest('hex');
		expect(await service.receive(connectionId, body, signature, event)).toBe(204);
		expect(JSON.parse(zadd.mock.calls[0][3])).toMatchObject({ name: 'Mika', months: 3, level: 'Gold', test: false });
	});

	test('manual alerts use the OBS queue and repeated tests have distinct IDs', async () => {
		const { service, query, zadd } = setup();
		await service.sendOverlayTest(connectionId, 'donation');
		await service.sendOverlayTest(connectionId, 'membership');
		await service.sendOverlayTest(connectionId, 'recurring_donation');
		await service.sendOverlayTest(connectionId, 'donation');
		const alerts = zadd.mock.calls.map(([, , , payload]) => JSON.parse(payload));
		expect(alerts).toMatchObject([
			{ type: 'donation.created', amount: 15, test: true },
			{ type: 'membership.updated', months: 3, test: true },
			{ type: 'recurring_donation.started', months: 1, test: true },
			{ type: 'donation.created', amount: 15, test: true },
		]);
		expect(new Set(alerts.map(event => event.id)).size).toBe(4);
		expect(query).not.toHaveBeenCalled();
	});
});

/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createServer } from 'node:http';
import { createHmac, randomBytes } from 'node:crypto';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { MiUserProfile } from '@/models/UserProfile.js';
import { api, initTestDb, port, signup } from '../utils.js';

const liveOrigin = process.env.BLANKEY_PRIVATE_LIVE_ORIGIN;
const mediaServer = createServer((_request, response) => {
	response.end('#EXTM3U');
});

beforeAll(async () => {
	if (!liveOrigin) return;
	await new Promise<void>((resolve, reject) => {
		mediaServer.once('error', reject);
		mediaServer.listen(Number(new URL(liveOrigin).port), '127.0.0.1', resolve);
	});
});

afterAll(async () => {
	if (mediaServer.listening) await new Promise<void>(resolve => mediaServer.close(() => resolve()));
});

test('restricts page content to the creator and their verified, unrefunded supporters', async () => {
	const creator = await signup({ username: 'creator' });
	const otherCreator = await signup({ username: 'other_creator' });
	const supporter = await signup({ username: 'supporter' });
	const email = 'supporter@example.com';
	const db = await initTestDb(true);
	try {
		const profiles = db.getRepository(MiUserProfile);
		await profiles.update(supporter.id, { email, emailVerified: false });
		const secret = randomBytes(32).toString('hex');
		const createConnection = async (owner: typeof creator) => {
			const response = await api('i/buy-me-a-coffee', { start: true }, owner);
			expect(response.status).toBe(200);
			const url = new URL(response.body.webhookUrl!);
			const configured = await api('i/buy-me-a-coffee', { secret }, owner);
			expect(configured.body.verified).toBe(false);
			return `http://127.0.0.1:${port}${url.pathname}`;
		};
		const webhook = await createConnection(creator);
		const otherWebhook = await createConnection(otherCreator);
		const deliver = (
			url: string,
			type: string,
			liveMode: boolean,
			signingSecret = secret,
			eventId = 1,
			data: Record<string, unknown> = {},
		) => {
			const body = JSON.stringify({
				type,
				live_mode: liveMode,
				event_id: eventId,
				created: Math.floor(Date.now() / 1000),
				data: { id: 1, status: 'succeeded', supporter_email: email, ...data },
			});
			return fetch(url, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'x-signature-sha256': createHmac('sha256', signingSecret).update(body).digest('hex'),
				},
				body,
			});
		};

		const body = [{ id: 'text', type: 'text' as const, text: 'Visible to supporters' }];
		const createPage = async (owner: typeof creator) => {
			const response = await api('pages/create', {
				title: 'Supporter update',
				name: 'supporter-update',
				content: body,
				variables: [],
				script: '',
				supportersOnly: true,
			}, owner);
			expect(response.status).toBe(200);
			expect(response.body.content).toEqual(body);
			return response.body.id;
		};
		const pageId = await createPage(creator);
		const otherPageId = await createPage(otherCreator);
		const show = (id: string, viewer?: typeof supporter) => api('pages/show', { pageId: id }, viewer);

		expect((await show(pageId)).body.content).toEqual([]);
		expect((await deliver(webhook, 'donation.created', false, 'wrong-key')).status).toBe(401);
		expect((await deliver(webhook, 'donation.created', false)).status).toBe(204);
		expect((await deliver(otherWebhook, 'donation.created', false)).status).toBe(204);
		const overlay = new URL((await api('i/buy-me-a-coffee', {}, creator)).body.overlayUrl!);
		const otherOverlay = new URL((await api('i/buy-me-a-coffee', {}, otherCreator)).body.overlayUrl!);
		const overlayEvents = (url: URL, token?: string) => fetch(`http://127.0.0.1:${port}${url.pathname}/events?since=0`, {
			headers: token ? { authorization: `Bearer ${token}` } : undefined,
		});
		const overlayToken = overlay.hash.slice(1);
		expect((await overlayEvents(overlay)).status).toBe(403);
		expect((await overlayEvents(otherOverlay, overlayToken)).status).toBe(403);
		expect((await (await overlayEvents(overlay, overlayToken)).json()).events).toMatchObject([
			{ type: 'donation.created', test: true },
		]);
		const donation = { supporter_name: 'Alex', amount: 15, currency: 'USD' };
		expect((await deliver(webhook, 'donation.created', true, secret, 1, donation)).status).toBe(204);
		expect((await deliver(webhook, 'donation.created', true, secret, 1, donation)).status).toBe(204);
		expect((await show(pageId, supporter)).body.supportersOnlyLocked).toBe(true);

		await profiles.update(supporter.id, { emailVerified: true });
		expect((await show(pageId, supporter)).body.content).toEqual(body);
		expect((await show(otherPageId, supporter)).body.content).toEqual([]);

		let liveToken: string | null = null;
		const media = (id: string, token?: string | null) => fetch(`http://127.0.0.1:${port}/private-live/${id}/index.m3u8`, {
			headers: token ? { authorization: `Bearer ${token}` } : undefined,
		});
		if (liveOrigin) {
			const session = await api('i/private-live', { creatorId: creator.id }, supporter);
			expect(session.body.enabled).toBe(true);
			liveToken = session.body.token;
			expect((await media(creator.id)).status).toBe(403);
			expect((await media(otherCreator.id, liveToken)).status).toBe(403);
			expect(await (await media(creator.id, liveToken)).text()).toBe('#EXTM3U');
		}

		expect((await deliver(webhook, 'donation.refunded', true)).status).toBe(204);
		expect((await deliver(webhook, 'donation.created', true, secret, 1, donation)).status).toBe(204);
		expect((await show(pageId, supporter)).body.content).toEqual([]);
		expect((await show(pageId, creator)).body.content).toEqual(body);
		if (liveOrigin) expect((await media(creator.id, liveToken)).status).toBe(403);

		const periodEnd = Math.floor(Date.now() / 1000) + 3600;
		const membership = { status: 'active', current_period_end: periodEnd };
		expect((await deliver(webhook, 'membership.started', true, secret, 2, membership)).status).toBe(204);
		const alerts = (await (await overlayEvents(overlay, overlayToken)).json()).events;
		expect(alerts).toMatchObject([
			{ type: 'donation.created', test: true },
			{ type: 'donation.created', test: false, name: 'Alex', amount: 15, currency: 'USD' },
			{ type: 'membership.started', test: false, months: 1 },
		]);
		expect(JSON.stringify(alerts)).not.toContain(email);
		expect((await show(pageId, supporter)).body.content).toEqual(body);
		expect((await deliver(webhook, 'membership.cancelled', true, secret, 3, {
			...membership,
			status: 'canceled',
			cancel_at_period_end: 'true',
		})).status).toBe(204);
		expect((await show(pageId, supporter)).body.content).toEqual(body);
		expect((await deliver(webhook, 'membership.updated', true, secret, 4, {
			...membership,
			current_period_end: periodEnd - 7200,
		})).status).toBe(204);
		expect((await show(pageId, supporter)).body.content).toEqual([]);
		expect((await deliver(webhook, 'recurring_donation.started', true, secret, 5, membership)).status).toBe(204);
		const finalAlerts = (await (await overlayEvents(overlay, overlayToken)).json()).events;
		expect(finalAlerts).toMatchObject([
			{ type: 'donation.created', test: true },
			{ type: 'donation.created', test: false },
			{ type: 'membership.started', test: false },
			{ type: 'recurring_donation.started', test: false, months: 1 },
		]);
	} finally {
		await db.destroy();
	}
});

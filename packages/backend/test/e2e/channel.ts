/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

process.env.NODE_ENV = 'test';

import * as assert from 'assert';
import { describe, beforeAll, test } from 'vitest';
import { api, castAsError, initTestDb, signup } from '../utils.js';
import type * as misskey from 'misskey-js';
import { MiChannel } from '@/models/_.js';

describe('Channel', () => {
	let alice: misskey.entities.SignupResponse;
	beforeAll(async () => {
		alice = await signup({ username: 'alice' });
	});

	test('featured channels support recency and participation rankings', async () => {
		const older = (await api('channels/create', { name: 'More participants' }, alice)).body;
		const newer = (await api('channels/create', { name: 'Newer activity' }, alice)).body;
		const archived = (await api('channels/create', { name: 'Archived activity' }, alice)).body;
		const db = await initTestDb(true);
		try {
			const channels = db.getRepository(MiChannel);
			await channels.update(older.id, { lastNotedAt: new Date('2025-01-01'), usersCount: 5 });
			await channels.update(newer.id, { lastNotedAt: new Date('2025-01-02'), usersCount: 1 });
			await channels.update(archived.id, { lastNotedAt: new Date('2025-01-03'), usersCount: 10, isArchived: true });

			const recent = await api('channels/featured', {});
			assert.strictEqual(recent.status, 200);
			assert.deepStrictEqual(recent.body.map(channel => channel.id), [newer.id, older.id]);

			const popular = await api('channels/featured', { sort: 'popular' });
			assert.strictEqual(popular.status, 200);
			assert.deepStrictEqual(popular.body.map(channel => channel.id), [older.id, newer.id]);
		} finally {
			await db.destroy();
		}
	});

	describe('Follow', () => {
		let channel: misskey.entities.ChannelsCreateResponse;

		beforeAll(async () => {
			const res = await api('channels/create', { name: 'follow-test-channel' }, alice);
			channel = res.body;
		});

		test('フォローしているチャンネルを再度フォローするとALREADY_FOLLOWINGエラーになる', async () => {
			const res1 = await api('channels/follow', { channelId: channel.id }, alice);
			assert.strictEqual(res1.status, 204);

			const res2 = await api('channels/follow', { channelId: channel.id }, alice);
			assert.strictEqual(res2.status, 400);
			assert.strictEqual(castAsError(res2.body as any).error.code, 'ALREADY_FOLLOWING');
		});
	});
});

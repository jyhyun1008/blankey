/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { afterEach, expect, test, vi } from 'vitest';
import type Redis from 'ioredis';
import type { BuyMeACoffeeService } from '@/core/BuyMeACoffeeService.js';
import { PrivateLiveService } from '@/core/PrivateLiveService.js';

const viewer = { id: 'viewer', username: 'viewer', name: 'Viewer' };

function setup(canAccess: boolean) {
	vi.stubEnv('BLANKEY_PRIVATE_LIVE_ORIGIN', 'http://127.0.0.1:8888');
	const rows: string[] = [];
	const transaction = {
		rpush: vi.fn((_key: string, row: string) => {
			rows.push(row);
			return transaction;
		}),
		ltrim: vi.fn().mockReturnThis(),
		expire: vi.fn().mockReturnThis(),
		exec: vi.fn().mockResolvedValue([[null, 1]]),
	};
	const redis = {
		get: vi.fn(),
		set: vi.fn().mockResolvedValue('OK'),
		lrange: vi.fn().mockResolvedValue(rows),
		multi: () => transaction,
	};
	const access = { canAccess: vi.fn().mockResolvedValue(canAccess) };
	const service = new PrivateLiveService(redis as unknown as Redis.Redis, access as unknown as BuyMeACoffeeService);
	return { service, redis, transaction };
}

afterEach(() => vi.unstubAllEnvs());

test('denied viewers cannot read or write private live chat', async () => {
	const { service, redis } = setup(false);
	expect(await service.getChat('creator', viewer, 'Hello')).toEqual({ allowed: false, sent: false, messages: [] });
	expect(redis.lrange).not.toHaveBeenCalled();
	expect(redis.set).not.toHaveBeenCalled();
});

test('chat stores the trimmed message and enforces a sending cooldown', async () => {
	const { service, redis, transaction } = setup(true);
	redis.set.mockResolvedValueOnce('OK').mockResolvedValueOnce(null);
	expect(await service.getChat('creator', viewer, ' Hello ')).toMatchObject({
		allowed: true, sent: true, messages: [{ username: 'viewer', name: 'Viewer', text: 'Hello' }],
	});
	expect(await service.getChat('creator', viewer, 'Too soon')).toMatchObject({ allowed: true, sent: false });
	expect(transaction.rpush).toHaveBeenCalledTimes(1);
	expect(transaction.ltrim).toHaveBeenCalledWith('privateLiveChat:creator', -50, -1);
});

test('an OBS overlay token only reads its own room', async () => {
	const { service, redis } = setup(true);
	const token = 'a'.repeat(64);
	let currentToken = token;
	redis.get.mockImplementation(async key => key === 'privateLiveChatOverlay:creator' ? currentToken : null);
	redis.set.mockImplementation(async (_key, value) => {
		currentToken = value;
		return 'OK';
	});
	expect(await service.getChatOverlayToken('creator')).toBe(token);
	expect(await service.getOverlayChat('creator')).toBeNull();
	expect(await service.getOverlayChat('other', `Bearer ${token}`)).toBeNull();
	expect(await service.getOverlayChat('creator', `Bearer ${token}`)).toEqual([]);
	expect(redis.lrange).toHaveBeenCalledExactlyOnceWith('privateLiveChat:creator', 0, -1);
	const rotated = await service.getChatOverlayToken('creator', true);
	expect(rotated).not.toBe(token);
	expect(await service.getOverlayChat('creator', `Bearer ${token}`)).toBeNull();
});

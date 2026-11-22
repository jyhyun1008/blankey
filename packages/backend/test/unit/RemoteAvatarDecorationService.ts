/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';
import { RemoteAvatarDecorationService } from '@/core/RemoteAvatarDecorationService.js';
import type { MiRemoteUser } from '@/models/User.js';

function createService(response: unknown, current: Partial<MiRemoteUser> = {}) {
	const usersRepository = {
		findOneBy: vi.fn().mockResolvedValue({ id: 'remote', host: 'remote.example', avatarDecorations: [], ...current }),
		update: vi.fn().mockResolvedValue({ affected: 1 }),
	};
	const httpRequestService = {
		send: vi.fn().mockImplementation(async () => {
			if (response instanceof Error) throw response;
			return { json: async () => response };
		}),
	};
	const globalEventService = { publishInternalEvent: vi.fn() };
	const loggerService = { getLogger: () => ({ debug: vi.fn() }) };
	const service = new RemoteAvatarDecorationService(usersRepository as never, httpRequestService as never, globalEventService as never, loggerService as never);
	return { service, usersRepository, httpRequestService, globalEventService };
}

const user = {
	id: 'remote',
	username: 'Alice',
	usernameLower: 'alice',
	host: 'remote.example',
	uri: 'https://remote.example/users/alice',
} as MiRemoteUser;

describe('RemoteAvatarDecorationService', () => {
	test('parses and clamps decorations from a Misskey users/show response', () => {
		const { service } = createService(null);
		const result = service.parseDecorations({
			username: 'alice',
			host: null,
			avatarDecorations: [
				{ id: 'a1', url: 'https://cdn.example/a.png', angle: 0.9, flipH: true, offsetX: -1, offsetY: 0.1 },
				{ id: 'a1', url: 'https://cdn.example/dup.png' },
				{ id: 'bad id!', url: 'https://cdn.example/b.png' },
				{ id: 'http', url: 'http://cdn.example/c.png' },
				{ id: 'creds', url: 'https://user:pass@cdn.example/d.png' },
				{ id: 'b2', url: 'https://cdn.example/e.png', angle: 0 },
			],
		}, user);

		expect(result).toEqual([
			{ id: 'a1', url: 'https://cdn.example/a.png', angle: 0.5, flipH: true, offsetX: -0.25, offsetY: 0.1 },
			{ id: 'b2', url: 'https://cdn.example/e.png' },
		]);
	});

	test('rejects responses for another user or without decoration support', () => {
		const { service } = createService(null);
		expect(service.parseDecorations({ username: 'bob', host: null, avatarDecorations: [] }, user)).toBeNull();
		expect(service.parseDecorations({ username: 'alice', host: 'other.example', avatarDecorations: [] }, user)).toBeNull();
		expect(service.parseDecorations({ username: 'alice', host: null }, user)).toBeNull();
		expect(service.parseDecorations('nope', user)).toBeNull();
	});

	test('fetches users/show on the actor origin and stores changed decorations', async () => {
		const { service, httpRequestService, usersRepository, globalEventService } = createService({
			username: 'Alice',
			host: null,
			avatarDecorations: [{ id: 'a1', url: 'https://remote.example/files/a.png' }],
		});

		await service.sync(user);

		expect(httpRequestService.send).toHaveBeenCalledWith('https://remote.example/api/users/show', expect.objectContaining({
			method: 'POST',
			body: JSON.stringify({ username: 'Alice' }),
			size: 256 * 1024,
		}));
		expect(usersRepository.update).toHaveBeenCalledWith({ id: 'remote' }, { avatarDecorations: [{ id: 'a1', url: 'https://remote.example/files/a.png' }] });
		expect(globalEventService.publishInternalEvent).toHaveBeenCalledWith('remoteUserUpdated', { id: 'remote' });
	});

	test('keeps the previous state when the request fails or nothing changed', async () => {
		const failing = createService(new Error('404'));
		await failing.service.sync(user);
		expect(failing.usersRepository.update).not.toHaveBeenCalled();

		const same = [{ id: 'a1', url: 'https://remote.example/files/a.png' }];
		const unchanged = createService({ username: 'alice', host: null, avatarDecorations: same }, { avatarDecorations: same });
		await unchanged.service.sync(user);
		expect(unchanged.usersRepository.update).not.toHaveBeenCalled();
	});

	test('clears decorations when the remote user removed them', async () => {
		const { service, usersRepository } = createService(
			{ username: 'alice', host: null, avatarDecorations: [] },
			{ avatarDecorations: [{ id: 'a1', url: 'https://remote.example/files/a.png' }] },
		);
		await service.sync(user);
		expect(usersRepository.update).toHaveBeenCalledWith({ id: 'remote' }, { avatarDecorations: [] });
	});

	test('does not fetch non-https actors', async () => {
		const { service, httpRequestService } = createService({});
		await service.sync({ ...user, uri: 'http://remote.example/users/alice' });
		expect(httpRequestService.send).not.toHaveBeenCalled();
	});
});

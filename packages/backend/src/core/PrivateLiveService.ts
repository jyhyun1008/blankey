/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import * as Redis from 'ioredis';
import { load as loadYaml } from 'js-yaml';
import { path as configPath } from '@/config.js';
import { DI } from '@/di-symbols.js';
import { BuyMeACoffeeService } from './BuyMeACoffeeService.js';

interface LiveChatMessage {
	id: string;
	username: string;
	name: string | null;
	text: string;
	time: number;
}

@Injectable()
export class PrivateLiveService {
	private readonly origin: URL | null;
	public readonly originAuthorization = process.env.BLANKEY_PRIVATE_LIVE_ORIGIN_SECRET
		? `Bearer ${process.env.BLANKEY_PRIVATE_LIVE_ORIGIN_SECRET}`
		: undefined;

	constructor(
		@Inject(DI.redis)
		private redis: Redis.Redis,
		private buyMeACoffeeService: BuyMeACoffeeService,
	) {
		const configuredOrigin = process.env.BLANKEY_PRIVATE_LIVE_ORIGIN;
		this.origin = configuredOrigin ? new URL(configuredOrigin) : null;
		if (this.origin && !['http:', 'https:'].includes(this.origin.protocol)) {
			throw new Error('BLANKEY_PRIVATE_LIVE_ORIGIN must be an HTTP(S) origin.');
		}
	}

	public get enabled(): boolean {
		return this.origin !== null;
	}

	public async getChatOverlayToken(creatorId: string, rotate = false): Promise<string | null> {
		if (!this.enabled) return null;
		const key = `privateLiveChatOverlay:${creatorId}`;
		if (rotate) {
			const token = randomBytes(32).toString('hex');
			await this.redis.set(key, token);
			return token;
		}
		const existing = await this.redis.get(key);
		if (existing) return existing;
		const token = randomBytes(32).toString('hex');
		if (await this.redis.set(key, token, 'NX')) return token;
		return await this.redis.get(key);
	}

	public async getChat(creatorId: string, viewer: { id: string; username: string; name: string | null }, text?: string) {
		if (!this.enabled || !await this.buyMeACoffeeService.canAccess(creatorId, viewer.id)) {
			return { allowed: false, sent: false, messages: [] };
		}
		const key = `privateLiveChat:${creatorId}`;
		let sent = false;
		const messageText = text?.trim();
		if (messageText && await this.redis.set(`privateLiveChatCooldown:${creatorId}:${viewer.id}`, '1', 'EX', 2, 'NX')) {
			const message: LiveChatMessage = {
				id: randomUUID(),
				username: viewer.username,
				name: viewer.name,
				text: messageText,
				time: Date.now(),
			};
			const results = await this.redis.multi().rpush(key, JSON.stringify(message)).ltrim(key, -50, -1).expire(key, 7200).exec();
			if (!results || results.some(([error]) => error)) throw new Error('Unable to send the live chat message.');
			sent = true;
		}
		return { allowed: true, sent, messages: await this.getChatMessages(creatorId) };
	}

	public async getOverlayChat(creatorId: string, authorization?: string): Promise<LiveChatMessage[] | null> {
		const token = authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
		if (!this.enabled || !token) return null;
		const stored = await this.redis.get(`privateLiveChatOverlay:${creatorId}`);
		if (!stored || !timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(stored, 'hex'))) return null;
		return await this.getChatMessages(creatorId);
	}

	private async getChatMessages(creatorId: string): Promise<LiveChatMessage[]> {
		const rows = await this.redis.lrange(`privateLiveChat:${creatorId}`, 0, -1);
		const cutoff = Date.now() - 7_200_000;
		return rows.map(row => JSON.parse(row) as LiveChatMessage).filter(message => message.time >= cutoff);
	}

	public async getPublishSettings(creatorId: string, isStreamer: boolean): Promise<{ server: string; streamKey: string } | null> {
		const server = process.env.BLANKEY_PRIVATE_LIVE_PUBLISH_URL;
		if (!this.enabled || !server) return null;

		const url = new URL(server);
		if (!url.hostname || url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname)) return null;
		if (url.protocol === 'rtmp:' && ['127.0.0.1', 'localhost'].includes(url.hostname)) {
			return { server, streamKey: creatorId };
		}
		if (url.protocol !== 'rtmps:' || !isStreamer) return null;

		type MediaMtxConfig = {
			authInternalUsers?: {
				user?: string;
				pass?: string;
				permissions?: { action: string; path?: string }[];
			}[];
		};
		let settings: MediaMtxConfig | undefined;
		try {
			const config = await readFile(resolve(dirname(configPath), 'private-live/mediamtx.yml'), 'utf8');
			settings = loadYaml(config) as MediaMtxConfig | undefined;
		} catch {
			return null;
		}
		if (!Array.isArray(settings?.authInternalUsers)) return null;
		const obsCredential = /^[\w.~-]+$/;
		const publisher = settings.authInternalUsers.find(account => {
			if (typeof account?.user !== 'string' || !account.user || account.user === 'any' ||
				typeof account.pass !== 'string' || !account.pass ||
				!obsCredential.test(account.user) || !obsCredential.test(account.pass) ||
				!Array.isArray(account.permissions)) return false;
			const publishPermissions = account.permissions.filter(permission => permission?.action === 'publish');
			return publishPermissions.length === 1 && publishPermissions[0].path === creatorId;
		});
		if (!publisher?.user || !publisher.pass) return null;

		const credentials = new URLSearchParams({ user: publisher.user, pass: publisher.pass });
		return { server, streamKey: `${creatorId}?${credentials}` };
	}

	public async createSession(creatorId: string, viewerId: string): Promise<string | null> {
		if (!this.enabled || !await this.buyMeACoffeeService.canAccess(creatorId, viewerId)) return null;
		const token = randomBytes(32).toString('hex');
		await this.redis.set(`privateLive:${creatorId}:${token}`, viewerId, 'EX', 300);
		return token;
	}

	public async canPlay(creatorId: string, authorization?: string): Promise<boolean> {
		const token = authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
		if (!token) return false;
		const viewerId = await this.redis.get(`privateLive:${creatorId}:${token}`);
		return viewerId !== null && await this.buyMeACoffeeService.canAccess(creatorId, viewerId);
	}

	public getMediaUrl(creatorId: string, file: string): URL | null {
		if (!this.origin || !/^[a-zA-Z0-9]{1,32}$/.test(creatorId)) return null;
		if (!/^(?:[\w-]+\/)*[\w.-]+\.(?:m3u8|ts|m4s|mp4|aac)$/.test(file)) return null;
		return new URL(`/${creatorId}/${file}`, this.origin);
	}
}

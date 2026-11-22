/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { isDeepStrictEqual } from 'node:util';
import { DI } from '@/di-symbols.js';
import type { UsersRepository } from '@/models/_.js';
import type { MiRemoteUser, MiUser } from '@/models/User.js';
import { HttpRequestService } from '@/core/HttpRequestService.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { LoggerService } from '@/core/LoggerService.js';
import type Logger from '@/logger.js';
import { bindThis } from '@/decorators.js';

export type UserAvatarDecoration = MiUser['avatarDecorations'][number];

// Misskey の制限に合わせる (アバターデコレーションの最大数・角度・位置の範囲)
const MAX_DECORATIONS = 16;
const MAX_RESPONSE_SIZE = 256 * 1024;
const TIMEOUT = 5000;

function clamp(value: unknown, min: number, max: number): number | undefined {
	if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) return undefined;
	return Math.min(max, Math.max(min, value));
}

/**
 * リモートユーザーが付けているアバターデコレーションを取り込む。
 *
 * ActivityPub の Person にはデコレーションの標準プロパティがないため、Tempura / misskey-a と同じく
 * リモートユーザーの作成・更新時に同じオリジンの Misskey API (`/api/users/show`) を補助的に取得する。
 * 取り込んだデコレーションはそのユーザーの avatarDecorations にだけ保存し、ローカルのデコレーション一覧には登録しない。
 * 画像はメディアプロキシ経由で表示する (UserEntityService)。
 */
@Injectable()
export class RemoteAvatarDecorationService {
	private logger: Logger;

	constructor(
		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		private httpRequestService: HttpRequestService,
		private globalEventService: GlobalEventService,
		private loggerService: LoggerService,
	) {
		this.logger = this.loggerService.getLogger('remote-avatar-decoration');
	}

	/**
	 * リモートの users/show 応答からデコレーションを検証して取り出す。
	 * 応答がデコレーションに対応していない・不正な場合は null (呼び出し側は以前の状態を保つ)。
	 */
	@bindThis
	public parseDecorations(body: unknown, user: Pick<MiRemoteUser, 'usernameLower'>): UserAvatarDecoration[] | null {
		if (body == null || typeof body !== 'object') return null;
		const profile = body as Record<string, unknown>;
		// 相手サーバーから見たローカルユーザー本人であること
		if (typeof profile.username !== 'string' || profile.username.toLowerCase() !== user.usernameLower) return null;
		if (profile.host != null) return null;
		if (!Array.isArray(profile.avatarDecorations)) return null;

		const decorations: UserAvatarDecoration[] = [];
		const ids = new Set<string>();
		for (const raw of profile.avatarDecorations.slice(0, MAX_DECORATIONS)) {
			if (raw == null || typeof raw !== 'object') continue;
			const d = raw as Record<string, unknown>;
			if (typeof d.id !== 'string' || !/^[\w-]{1,128}$/.test(d.id) || ids.has(d.id)) continue;
			if (typeof d.url !== 'string' || d.url.length > 2048 || !URL.canParse(d.url)) continue;
			const url = new URL(d.url);
			if (url.protocol !== 'https:' || url.username || url.password) continue;
			ids.add(d.id);

			const angle = clamp(d.angle, -0.5, 0.5);
			const offsetX = clamp(d.offsetX, -0.25, 0.25);
			const offsetY = clamp(d.offsetY, -0.25, 0.25);
			decorations.push({
				id: d.id,
				url: url.href,
				...(angle !== undefined ? { angle } : {}),
				...(d.flipH === true ? { flipH: true } : {}),
				...(offsetX !== undefined ? { offsetX } : {}),
				...(offsetY !== undefined ? { offsetY } : {}),
			});
		}
		return decorations;
	}

	@bindThis
	public async sync(user: MiRemoteUser): Promise<void> {
		if (user.uri == null || !URL.canParse(user.uri)) return;
		const origin = new URL(user.uri);
		if (origin.protocol !== 'https:') return;

		let body: unknown;
		try {
			// HttpRequestService はプライベートアドレスへの接続を拒否する (SSRF 対策)
			const res = await this.httpRequestService.send(`${origin.origin}/api/users/show`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				body: JSON.stringify({ username: user.username }),
				timeout: TIMEOUT,
				size: MAX_RESPONSE_SIZE,
			});
			body = await res.json();
		} catch (err) {
			// API 非対応のサーバーや一時的な失敗では何もしない (以前の状態を保つ)
			this.logger.debug(`skip ${user.uri}: ${err instanceof Error ? err.message : String(err)}`);
			return;
		}

		const decorations = this.parseDecorations(body, user);
		if (decorations == null) return;

		const current = await this.usersRepository.findOneBy({ id: user.id, isDeleted: false });
		if (current == null || current.host == null) return;
		if (isDeepStrictEqual(current.avatarDecorations, decorations)) return;

		await this.usersRepository.update({ id: user.id }, { avatarDecorations: decorations });
		this.globalEventService.publishInternalEvent('remoteUserUpdated', { id: user.id });
	}
}

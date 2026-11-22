/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { IsNull } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { CustomEmojiService } from '@/core/CustomEmojiService.js';
import type { DriveFilesRepository, UsersRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requiredRolePolicy: 'canManageCustomEmojis',
	kind: 'write:admin:emoji',

	errors: {
		noSuchEmoji: {
			message: 'No such emoji.',
			code: 'NO_SUCH_EMOJI',
			id: '684dec9d-a8c2-4364-9aa8-456c49cb1dc8',
		},
		noSuchFile: {
			message: 'No such file.',
			code: 'NO_SUCH_FILE',
			id: '14fb9fd9-0731-4e2f-aeb9-f09e4740333d',
		},
		invalidStreamer: {
			message: 'Select a local streamer account.',
			code: 'INVALID_STREAMER',
			id: '617313a7-8b88-4201-828b-2f6a0b426fbe',
		},
		sameNameEmojiExists: {
			message: 'Emoji that have same name already exists.',
			code: 'SAME_NAME_EMOJI_EXISTS',
			id: '7180fe9d-1ee3-bff9-647d-fe9896d2ffb8',
		},
	},
} as const;

export const paramDef = {
	allOf: [
		{
			anyOf: [
				{
					type: 'object',
					properties: {
						id: { type: 'string', format: 'misskey:id' },
					},
					required: ['id'],
				},
				{
					type: 'object',
					properties: {
						name: { type: 'string', pattern: '^[a-zA-Z0-9_]+$' },
					},
					required: ['name'],
				},
			],
		},
		{
			type: 'object',
			properties: {
				fileId: { type: 'string', format: 'misskey:id' },
				category: {
					type: 'string',
					nullable: true,
					description: 'Use `null` to reset the category.',
				},
				aliases: { type: 'array', items: {
					type: 'string',
				} },
				license: { type: 'string', nullable: true },
				isSensitive: { type: 'boolean' },
				localOnly: { type: 'boolean' },
				streamerId: { type: 'string', format: 'misskey:id', nullable: true },
				roleIdsThatCanBeUsedThisEmojiAsReaction: { type: 'array', items: {
					type: 'string',
				} },
			},
		},
	],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.driveFilesRepository)
		private driveFilesRepository: DriveFilesRepository,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		private customEmojiService: CustomEmojiService,
	) {
		super(meta, paramDef, async (ps, me) => {
			if (ps.streamerId != null && !await this.usersRepository.existsBy({
				id: ps.streamerId,
				host: IsNull(),
				isStreamer: true,
			})) throw new ApiError(meta.errors.invalidStreamer);

			let driveFile;
			if (ps.fileId) {
				driveFile = await this.driveFilesRepository.findOneBy({ id: ps.fileId });
				if (driveFile == null) throw new ApiError(meta.errors.noSuchFile);
			}

			const required = 'id' in ps
				? { id: ps.id, name: 'name' in ps ? ps.name as string : undefined }
				: { name: ps.name };

			const error = await this.customEmojiService.update({
				...required,
				originalUrl: driveFile != null ? driveFile.url : undefined,
				publicUrl: driveFile != null ? (driveFile.webpublicUrl ?? driveFile.url) : undefined,
				fileType: driveFile != null ? (driveFile.webpublicType ?? driveFile.type) : undefined,
				category: ps.category,
				aliases: ps.aliases,
				license: ps.license,
				isSensitive: ps.isSensitive,
				localOnly: ps.localOnly,
				streamerId: ps.streamerId,
				roleIdsThatCanBeUsedThisEmojiAsReaction: ps.roleIdsThatCanBeUsedThisEmojiAsReaction,
			}, me);

			switch (error) {
				case null: return;
				case 'NO_SUCH_EMOJI': throw new ApiError(meta.errors.noSuchEmoji);
				case 'SAME_NAME_EMOJI_EXISTS': throw new ApiError(meta.errors.sameNameEmojiExists);
			}
			// 網羅性チェック
			const _mustBeNever: never = error;
		});
	}
}

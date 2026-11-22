/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import { EmojiEntityService } from '@/core/entities/EmojiEntityService.js';
import { CustomEmojiService } from '@/core/CustomEmojiService.js';
import { FILE_TYPE_IMAGE } from '@/const.js';
import type { DriveFilesRepository } from '@/models/_.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['account'],
	requireCredential: true,
	prohibitMoved: true,
	kind: 'write:account',

	limit: { duration: 60 * 60 * 1000, max: 30 },

	errors: {
		notStreamer: {
			message: 'A streamer account is required.',
			code: 'NOT_STREAMER',
			id: '9a4d3bb0-dc4c-430c-acc6-c42aff69c189',
		},
		noSuchFile: {
			message: 'No such file.',
			code: 'NO_SUCH_FILE',
			id: 'bd79e0e1-d5ec-4a06-aeb7-bf99b67eabd2',
		},
		invalidImage: {
			message: 'Choose a non-sensitive uploaded image up to 1 MiB.',
			code: 'INVALID_IMAGE',
			id: 'df3268e9-e798-4f28-b432-9f8e81b284e9',
		},
		duplicateName: {
			message: 'This emoji name is already in use.',
			code: 'DUPLICATE_NAME',
			id: '96eb517c-0388-4897-a8d3-6b7971b2643e',
		},
		nameTooLong: {
			message: 'The emoji name including the username suffix must be at most 128 characters.',
			code: 'NAME_TOO_LONG',
			id: 'a510eb4e-dade-4c14-857d-3ed51709471f',
		},
		limitExceeded: {
			message: 'You can register up to 20 custom emojis.',
			code: 'LIMIT_EXCEEDED',
			id: 'd30651a6-63cb-4d77-b9e3-e213a9649117',
		},
	},

	res: {
		type: 'object',
		optional: false, nullable: false,
		ref: 'EmojiDetailed',
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		name: { type: 'string', pattern: '^[a-z0-9_]+$', maxLength: 128, description: 'Base name before the username suffix.' },
		aliases: { type: 'array', maxItems: 32, items: { type: 'string', minLength: 1, maxLength: 128 } },
		license: { type: 'string', nullable: true, maxLength: 1024 },
		fileId: { type: 'string', format: 'misskey:id' },
	},
	required: ['name', 'fileId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.driveFilesRepository)
		driveFilesRepository: DriveFilesRepository,
		customEmojiService: CustomEmojiService,
		emojiEntityService: EmojiEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			if (!me.isStreamer) throw new ApiError(meta.errors.notStreamer);
			const file = await driveFilesRepository.findOneBy({ id: ps.fileId, userId: me.id });
			if (file == null) throw new ApiError(meta.errors.noSuchFile);
			if (file.isLink || file.isSensitive || !FILE_TYPE_IMAGE.includes(file.type) || file.size > 1024 * 1024) {
				throw new ApiError(meta.errors.invalidImage);
			}

			const emoji = await customEmojiService.addStreamerEmoji(me, {
				name: ps.name,
				aliases: ps.aliases ?? [],
				license: ps.license ?? null,
			}, file);
			if (emoji === 'NAME_TOO_LONG') throw new ApiError(meta.errors.nameTooLong);
			if (emoji === 'DUPLICATE_NAME') throw new ApiError(meta.errors.duplicateName);
			if (emoji === 'LIMIT_EXCEEDED') throw new ApiError(meta.errors.limitExceeded);

			return emojiEntityService.packDetailed(emoji);
		});
	}
}

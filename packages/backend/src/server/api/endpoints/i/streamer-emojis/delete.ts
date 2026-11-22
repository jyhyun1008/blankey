/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { CustomEmojiService } from '@/core/CustomEmojiService.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['account'],
	requireCredential: true,
	kind: 'write:account',

	limit: { duration: 60 * 60 * 1000, max: 30 },

	errors: {
		noSuchEmoji: {
			message: 'No such emoji.',
			code: 'NO_SUCH_EMOJI',
			id: 'bb350c97-7b35-4e7e-a6ca-4be015893ef4',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		id: { type: 'string', format: 'misskey:id' },
	},
	required: ['id'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(customEmojiService: CustomEmojiService) {
		super(meta, paramDef, async (ps, me) => {
			if (!await customEmojiService.delete(ps.id, undefined, me.id)) {
				throw new ApiError(meta.errors.noSuchEmoji);
			}
		});
	}
}

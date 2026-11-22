/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { PrivateLiveService } from '@/core/PrivateLiveService.js';
import { Endpoint } from '@/server/api/endpoint-base.js';

export const meta = {
	tags: ['account'],
	requireCredential: true,
	kind: 'write:account',
	secure: true,
	prohibitMoved: true,
	limit: { duration: 60_000, max: 120 },
	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			allowed: { type: 'boolean', optional: false, nullable: false },
			sent: { type: 'boolean', optional: false, nullable: false },
			messages: {
				type: 'array', optional: false, nullable: false,
				items: {
					type: 'object', optional: false, nullable: false,
					properties: {
						id: { type: 'string', optional: false, nullable: false },
						username: { type: 'string', optional: false, nullable: false },
						name: { type: 'string', optional: false, nullable: true },
						text: { type: 'string', optional: false, nullable: false },
						time: { type: 'integer', optional: false, nullable: false },
					},
				},
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		creatorId: { type: 'string', format: 'misskey:id', maxLength: 32 },
		text: { type: 'string', maxLength: 300 },
	},
	required: ['creatorId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(privateLiveService: PrivateLiveService) {
		super(meta, paramDef, async (ps, me) => await privateLiveService.getChat(ps.creatorId, me, ps.text));
	}
}

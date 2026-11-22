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
	secure: true,
	prohibitMoved: true,
	limit: { duration: 60_000, max: 30 },
	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			enabled: { type: 'boolean', optional: false, nullable: false },
			token: { type: 'string', optional: false, nullable: true },
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		creatorId: { type: 'string', format: 'misskey:id', maxLength: 32 },
	},
	required: ['creatorId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(privateLiveService: PrivateLiveService) {
		super(meta, paramDef, async (ps, me) => ({
			enabled: privateLiveService.enabled,
			token: await privateLiveService.createSession(ps.creatorId, me.id),
		}));
	}
}

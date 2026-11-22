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
	limit: { duration: 60_000, max: 30 },
	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			server: { type: 'string', optional: false, nullable: true },
			streamKey: { type: 'string', optional: false, nullable: true },
			chatOverlayUrl: { type: 'string', optional: false, nullable: true },
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		rotateChatOverlay: { type: 'boolean' },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(privateLiveService: PrivateLiveService) {
		super(meta, paramDef, async (ps, me) => {
			const settings = await privateLiveService.getPublishSettings(me.id, me.isStreamer);
			const token = settings ? await privateLiveService.getChatOverlayToken(me.id, ps.rotateChatOverlay) : null;
			return {
				server: settings?.server ?? null,
				streamKey: settings?.streamKey ?? null,
				chatOverlayUrl: token ? `/obs/live-chat/${me.id}#${token}` : null,
			};
		});
	}
}

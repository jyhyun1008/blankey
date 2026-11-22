/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { Config } from '@/config.js';
import { BuyMeACoffeeService } from '@/core/BuyMeACoffeeService.js';
import { DI } from '@/di-symbols.js';
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
			webhookUrl: { type: 'string', optional: false, nullable: true },
			overlayUrl: { type: 'string', optional: false, nullable: true },
			verified: { type: 'boolean', optional: false, nullable: false },
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		start: { type: 'boolean' },
		secret: { type: 'string', nullable: true, minLength: 16, maxLength: 256 },
		testOverlay: { type: 'string', enum: ['donation', 'membership', 'recurring_donation'] },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.config) config: Config,
		service: BuyMeACoffeeService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const connection = ps.testOverlay
				? await service.configure(me.id)
				: await service.configure(me.id, ps.secret, ps.start);
			if (ps.testOverlay && connection?.verified) {
				await service.sendOverlayTest(connection.id, ps.testOverlay);
			}
			return {
				webhookUrl: connection ? new URL('/webhooks/buy-me-a-coffee/' + connection.id, config.url).href : null,
				overlayUrl: connection?.overlayToken ? new URL(`/obs/buy-me-a-coffee/${connection.id}#${connection.overlayToken}`, config.url).href : null,
				verified: connection?.verified ?? false,
			};
		});
	}
}

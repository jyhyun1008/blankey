/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { tryParseUrl } from '@@/js/url.js';

export const streamingBannerFieldName = 'streaming:banner';

export function getStreamingBannerLink(value: unknown) {
	if (typeof value !== 'string') return '';
	const input = value.trim();
	if (!input.startsWith('https://')) return '';
	const url = tryParseUrl(input);
	return url?.protocol === 'https:' && !url.username && !url.password ? url.href : '';
}

export function getStreamingBanners(fields: readonly { name: string; value: string }[]) {
	const banners = new Map<string, { imageUrl: string; link: string }>();
	for (const field of fields) {
		if (field.name !== streamingBannerFieldName) continue;

		let imageUrl: unknown = field.value;
		let link = '';
		if (field.value.startsWith('{')) {
			try {
				const stored: { imageUrl?: unknown; link?: unknown } | null = JSON.parse(field.value);
				imageUrl = stored?.imageUrl;
				link = getStreamingBannerLink(stored?.link);
			} catch {
				continue;
			}
		}
		if (typeof imageUrl !== 'string') continue;
		const url = tryParseUrl(imageUrl);
		if (url && (url.protocol === 'https:' || url.protocol === 'http:') && !banners.has(url.href)) {
			banners.set(url.href, { imageUrl: url.href, link });
		}
	}
	return [...banners.values()];
}

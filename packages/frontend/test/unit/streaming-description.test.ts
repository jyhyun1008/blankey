/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import { parseStreamingDescription } from '@/utility/streaming-description.js';
import { getStreamingResources, getStreamingResourceThumbnail, streamingGoodsServicesFieldName, streamingVideoArchiveFieldName } from '@/utility/streaming-overview.js';

describe('parseStreamingDescription', () => {
	test('splits headings, https images and MFM text', () => {
		expect(parseStreamingDescription([
			'Intro **bold**',
			'',
			'# Details',
			'![sample](https://example.com/a.png)',
			'![bad](javascript:alert(1))',
			'#### deep',
			'```',
			'# not a heading',
			'```',
		].join('\n'))).toEqual([
			{ type: 'text', text: 'Intro **bold**' },
			{ type: 'heading', depth: 1, text: 'Details' },
			{ type: 'image', url: 'https://example.com/a.png', alt: 'sample' },
			{ type: 'text', text: '![bad](javascript:alert(1))' },
			{ type: 'heading', depth: 3, text: 'deep' },
			{ type: 'text', text: '```\n# not a heading\n```' },
		]);
	});
});

describe('goods thumbnail and price', () => {
	const value = JSON.stringify([{
		id: 'goods',
		title: 'Sticker',
		url: 'https://shop.example/sticker',
		thumbnailUrl: 'https://cdn.example/thumb.png',
		price: '  ₩5,000  ',
		portfolio: [{ title: 'Sample', imageUrl: 'https://cdn.example/sample.png' }],
	}, {
		id: 'nothumb',
		title: 'Commission',
		url: 'https://shop.example/commission',
		thumbnailUrl: 'javascript:alert(1)',
		portfolio: [{ title: 'Sample', imageUrl: 'https://cdn.example/sample.png' }],
	}]);

	test('parses thumbnail and price for goods and falls back to the portfolio image', () => {
		const [goods, fallback] = getStreamingResources([{ name: streamingGoodsServicesFieldName, value }], streamingGoodsServicesFieldName);
		expect(goods.thumbnailUrl).toBe('https://cdn.example/thumb.png');
		expect(goods.price).toBe('₩5,000');
		expect(fallback.thumbnailUrl).toBeUndefined();
		expect(getStreamingResourceThumbnail(fallback)).toBe('https://cdn.example/sample.png');
	});

	test('ignores thumbnail and price on video archive entries', () => {
		const [video] = getStreamingResources([{ name: streamingVideoArchiveFieldName, value }], streamingVideoArchiveFieldName);
		expect(video.thumbnailUrl).toBeUndefined();
		expect(video.price).toBeUndefined();
	});
});

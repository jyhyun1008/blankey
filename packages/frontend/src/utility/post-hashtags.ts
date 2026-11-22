/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as mfm from 'mfm-js';
import type { entities } from 'misskey-js';

function extractHashtags(text: string): string[] {
	if (!text.includes('#')) return [];
	return mfm.extract(mfm.parse(text), node => node.type === 'hashtag').flatMap(node =>
		node.type === 'hashtag' ? [node.props.hashtag] : []);
}

function normalizeHashtag(tag: string): string {
	return tag.normalize('NFKC').trim().replace(/^#/u, '').toLowerCase();
}

export function getGalleryPostHashtags(post: Pick<entities.GalleryPost, 'tags' | 'description'>): string[] {
	return [...new Set([...(post.tags ?? []), ...extractHashtags(post.description ?? '')].map(normalizeHashtag).filter(Boolean))];
}

export function getPageHashtags(page: Pick<entities.Page, 'content' | 'supportersOnlyLocked'>): string[] {
	if (page.supportersOnlyLocked) return [];

	const tags = new Set<string>();
	const blocks = [...page.content];
	while (blocks.length) {
		const block = blocks.pop();
		if (block?.type === 'section' && Array.isArray(block.children)) {
			for (const child of block.children) blocks.push(child);
		} else if (block?.type === 'text' && typeof block.text === 'string') {
			for (const tag of extractHashtags(block.text)) {
				const normalized = normalizeHashtag(tag);
				if (normalized) tags.add(normalized);
			}
		}
	}

	return [...tags];
}

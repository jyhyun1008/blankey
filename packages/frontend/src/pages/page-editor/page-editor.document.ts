/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { PageBlock } from 'misskey-js/entities.js';

type TextBlock = Extract<PageBlock, { type: 'text' }>;

export function insertPageContent(
	content: PageBlock[],
	source: TextBlock,
	position: number,
	inserted: Exclude<PageBlock, TextBlock>[],
	continuationId: string,
): PageBlock[] {
	const index = content.findIndex(block => block.id === source.id);
	if (index === -1) return [...content, ...inserted, { id: continuationId, type: 'text', text: '' }];

	const before = source.text.slice(0, position);
	const after = source.text.slice(position);
	return [
		...content.slice(0, index),
		...(before ? [{ ...source, text: before }] : []),
		...inserted,
		{ id: continuationId, type: 'text', text: after },
		...content.slice(index + 1),
	];
}

export function withoutEmptyPageText(content: PageBlock[]): PageBlock[] {
	return content
		.filter(block => block.type !== 'text' || block.text !== '')
		.map(block => block.type === 'section' ? { ...block, children: withoutEmptyPageText(block.children ?? []) } : block);
}

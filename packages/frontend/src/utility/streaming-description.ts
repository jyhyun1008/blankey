/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { parseStreamingImageUrl } from '@/utility/streaming-overview.js';

// 動画・グッズの説明文 (マークダウン風)。ブログのエディタと同じ書き方:
// - `# 見出し` 行 → 見出し (# の数が深さ、最大 3)
// - `![名前](画像URL)` だけの行 → 画像 (https かこのサーバーの URL)
// - それ以外 → MFM テキスト (コードフェンスの中はそのまま)
export type StreamingDescriptionNode =
	| { type: 'heading'; depth: 1 | 2 | 3; text: string }
	| { type: 'image'; url: string; alt: string }
	| { type: 'text'; text: string };

const HEADING = /^(#{1,6})[ \t]+(.*\S)[ \t]*$/;
const IMAGE = /^!\[([^\]\n]*)\]\((\S+)\)$/;
const FENCE = /^(`{3,}|~{3,})/;

export function imageMarkdownForUrl(url: string, name = '') {
	return `![${name.replace(/[[\]\n]/g, '')}](${url})`;
}

export function parseStreamingDescription(markdown: string): StreamingDescriptionNode[] {
	const nodes: StreamingDescriptionNode[] = [];
	let textLines: string[] = [];
	let fence: string | null = null;

	const flush = () => {
		const text = textLines.join('\n').replace(/^\s*\n|\n\s*$/g, '');
		textLines = [];
		if (text.trim() !== '') nodes.push({ type: 'text', text });
	};

	for (const line of markdown.replace(/\r\n?/g, '\n').split('\n')) {
		const fenceMatch = FENCE.exec(line);
		if (fence != null) {
			textLines.push(line);
			if (fenceMatch && line.startsWith(fence)) fence = null;
			continue;
		}
		if (fenceMatch) {
			fence = fenceMatch[1];
			textLines.push(line);
			continue;
		}

		const heading = HEADING.exec(line);
		if (heading) {
			flush();
			nodes.push({ type: 'heading', depth: Math.min(heading[1].length, 3) as 1 | 2 | 3, text: heading[2] });
			continue;
		}

		const image = IMAGE.exec(line.trim());
		const imageUrl = image ? parseStreamingImageUrl(image[2]) : undefined;
		if (image && imageUrl) {
			flush();
			nodes.push({ type: 'image', url: imageUrl.href, alt: image[1] });
			continue;
		}

		textLines.push(line);
	}
	flush();
	return nodes;
}

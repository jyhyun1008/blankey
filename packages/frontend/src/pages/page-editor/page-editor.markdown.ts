/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { PageBlock } from 'misskey-js/entities.js';

// Page の本文 (ブロック列) と、エディタで扱うマークダウン風テキストを相互変換する。
// - `# 見出し` 行 → section (# の数が入れ子の深さ)
// - `![名前](drive:ファイルID)` だけの行 → image
// - `{origin}/notes/{ID}` だけの行 → note
// - `<!-- block:ID -->` だけの行 → 表現できない既存ブロックをそのまま保持
// - それ以外 → text (MFM)

type SectionBlock = Extract<PageBlock, { type: 'section' }>;

const HEADING = /^(#{1,6})[ \t]+(.*\S)[ \t]*$/;
const IMAGE = /^!\[[^\]\n]*\]\(drive:([0-9A-Za-z]+)\)$/;
const PRESERVED = /^<!-- block:([0-9A-Za-z_-]+) -->$/;
const FENCE = /^(`{3,}|~{3,})/;

function escapeRegExp(text: string) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function noteLine(origin: string) {
	return new RegExp(`^${escapeRegExp(origin)}/notes/([0-9A-Za-z]+)/?$`);
}

export function imageMarkdown(fileId: string, name = '') {
	return `![${name.replace(/[[\]\n]/g, '')}](drive:${fileId})`;
}

export function noteMarkdown(origin: string, noteId: string) {
	return `${origin}/notes/${noteId}`;
}

export function blocksToMarkdown(blocks: PageBlock[], options: { origin: string; fileName?: (fileId: string) => string | undefined }, depth = 1): string {
	const parts: string[] = [];
	for (const block of blocks) {
		switch (block.type) {
			case 'text':
				if (block.text.trim() !== '') parts.push(block.text.replace(/^\n+|\n+$/g, ''));
				break;
			case 'section': {
				parts.push(`${'#'.repeat(Math.min(depth, 6))} ${block.title.replace(/\n/g, ' ')}`);
				const children = blocksToMarkdown(block.children ?? [], options, depth + 1);
				if (children) parts.push(children);
				break;
			}
			case 'image':
				if (block.fileId) parts.push(imageMarkdown(block.fileId, options.fileName?.(block.fileId)));
				break;
			case 'note':
				if (block.note) parts.push(noteMarkdown(options.origin, block.note));
				break;
			default:
				parts.push(`<!-- block:${(block as PageBlock).id} -->`);
		}
	}
	return parts.join('\n\n');
}

function collect(blocks: PageBlock[], into = new Map<string, PageBlock>()) {
	for (const block of blocks) {
		into.set(block.id, block);
		if (block.type === 'section') collect(block.children ?? [], into);
	}
	return into;
}

/**
 * @param previous 直前の変換結果または元のページ本文。ブロック ID・ノートの詳細表示設定・未対応ブロックを引き継ぐ。
 */
export function markdownToBlocks(markdown: string, options: { origin: string; previous?: PageBlock[]; genId: () => string }): PageBlock[] {
	const previous = collect(options.previous ?? []);
	// 同じ種類のブロックは出現順に前回の ID を再利用し、プレビューの再マウントを避ける
	const previousIds = new Map<string, string[]>();
	for (const block of previous.values()) {
		const ids = previousIds.get(block.type) ?? [];
		ids.push(block.id);
		previousIds.set(block.type, ids);
	}
	const usedIds = new Set<string>();
	const idFor = (type: string) => {
		const ids = previousIds.get(type);
		while (ids?.length) {
			const id = ids.shift()!;
			if (!usedIds.has(id)) {
				usedIds.add(id);
				return id;
			}
		}
		let id = options.genId();
		while (usedIds.has(id) || previous.has(id)) id = options.genId();
		usedIds.add(id);
		return id;
	};
	const previousNotes = new Map<string, boolean>();
	for (const block of previous.values()) {
		if (block.type === 'note' && block.note) previousNotes.set(block.note, block.detailed);
	}

	const isNote = noteLine(options.origin);
	const root: PageBlock[] = [];
	const stack: { level: number; children: PageBlock[] }[] = [{ level: 0, children: root }];
	let textLines: string[] = [];
	let fence: string | null = null;

	const current = () => stack[stack.length - 1].children;
	const flushText = () => {
		const text = textLines.join('\n').replace(/^\s*\n|\n\s*$/g, '');
		textLines = [];
		if (text.trim() === '') return;
		current().push({ id: idFor('text'), type: 'text', text });
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

		const trimmed = line.trim();
		const heading = HEADING.exec(line);
		if (heading) {
			flushText();
			const level = heading[1].length;
			while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
			const section: SectionBlock = { id: idFor('section'), type: 'section', title: heading[2], children: [] };
			current().push(section);
			stack.push({ level, children: section.children });
			continue;
		}

		const image = IMAGE.exec(trimmed);
		if (image) {
			flushText();
			current().push({ id: idFor('image'), type: 'image', fileId: image[1] });
			continue;
		}

		const note = isNote.exec(trimmed);
		if (note) {
			flushText();
			current().push({ id: idFor('note'), type: 'note', note: note[1], detailed: previousNotes.get(note[1]) ?? false });
			continue;
		}

		const preserved = PRESERVED.exec(trimmed);
		const original = preserved ? previous.get(preserved[1]) : undefined;
		if (original && !usedIds.has(original.id)) {
			flushText();
			usedIds.add(original.id);
			current().push(original);
			continue;
		}

		textLines.push(line);
	}
	flushText();

	return root;
}

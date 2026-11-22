/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import type { PageBlock } from 'misskey-js/entities.js';
import { blocksToMarkdown, markdownToBlocks } from '@/pages/page-editor/page-editor.markdown.js';

const origin = 'https://blankey.example';

function idGen() {
	let n = 0;
	return () => `gen${++n}`;
}

describe('markdownToBlocks', () => {
	test('splits headings, images, notes and MFM text into page blocks', () => {
		const blocks = markdownToBlocks([
			'Intro **bold**',
			'',
			'# Stream',
			'Line one',
			'line two',
			'',
			'![cover](drive:file1)',
			'## Detail',
			`${origin}/notes/note1`,
			'# Next',
			'#hashtag stays text',
		].join('\n'), { origin, genId: idGen() });

		expect(blocks).toEqual([
			{ id: 'gen1', type: 'text', text: 'Intro **bold**' },
			{ id: 'gen2', type: 'section', title: 'Stream', children: [
				{ id: 'gen3', type: 'text', text: 'Line one\nline two' },
				{ id: 'gen4', type: 'image', fileId: 'file1' },
				{ id: 'gen5', type: 'section', title: 'Detail', children: [
					{ id: 'gen6', type: 'note', note: 'note1', detailed: false },
				] },
			] },
			{ id: 'gen7', type: 'section', title: 'Next', children: [
				{ id: 'gen8', type: 'text', text: '#hashtag stays text' },
			] },
		]);
	});

	test('keeps heading-like lines and URLs inside code fences as text', () => {
		const text = ['```', '# not a heading', `${origin}/notes/x`, '```'].join('\n');
		expect(markdownToBlocks(text, { origin, genId: idGen() })).toEqual([
			{ id: 'gen1', type: 'text', text },
		]);
	});

	test('treats other servers\' note URLs as plain text', () => {
		const blocks = markdownToBlocks('https://other.example/notes/abc', { origin, genId: idGen() });
		expect(blocks.map(b => b.type)).toEqual(['text']);
	});

	test('reuses previous ids, note detail settings and unsupported blocks', () => {
		const previous = [
			{ id: 'n1', type: 'note', note: 'note1', detailed: true },
			{ id: 'dyn', type: 'dynamic' },
			{ id: 't1', type: 'text', text: 'old' },
		] as PageBlock[];
		const blocks = markdownToBlocks(`new text\n\n${origin}/notes/note1\n\n<!-- block:dyn -->`, { origin, previous, genId: idGen() });
		expect(blocks).toEqual([
			{ id: 't1', type: 'text', text: 'new text' },
			{ id: 'n1', type: 'note', note: 'note1', detailed: true },
			previous[1],
		]);
	});
});

describe('blocksToMarkdown', () => {
	test('round-trips existing page content', () => {
		const content = [
			{ id: 'a', type: 'text', text: 'Hello $[tada world]' },
			{ id: 'b', type: 'section', title: 'Section', children: [
				{ id: 'c', type: 'image', fileId: 'file1' },
				{ id: 'd', type: 'section', title: 'Nested', children: [
					{ id: 'e', type: 'note', note: 'note1', detailed: false },
					{ id: 'f', type: 'text', text: 'after' },
				] },
			] },
		] as PageBlock[];

		const markdown = blocksToMarkdown(content, { origin, fileName: id => id === 'file1' ? 'photo.png' : undefined });
		expect(markdown).toBe([
			'Hello $[tada world]',
			'# Section',
			'![photo.png](drive:file1)',
			'## Nested',
			`${origin}/notes/note1`,
			'after',
		].join('\n\n'));
		expect(markdownToBlocks(markdown, { origin, previous: content, genId: idGen() })).toEqual(content);
	});
});

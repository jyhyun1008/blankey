/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { cleanup, fireEvent, render, waitFor } from '@testing-library/vue';
import { afterEach, expect, test, vi } from 'vitest';
import { defineComponent, h, ref, shallowReactive } from 'vue';
import type { DriveFile, PageBlock } from 'misskey-js/entities.js';
import PageEditorDocument from '@/pages/page-editor/PageEditorDocument.vue';
import { withoutEmptyPageText } from '@/pages/page-editor/page-editor.document.js';
import { i18n } from '@/i18n.js';
import { mfmFunctionPicker } from '@/utility/mfm-function-picker.js';
import { selectFile } from '@/utility/drive.js';
import * as os from '@/os.js';

vi.mock('@/utility/mfm-function-picker.js', () => ({ mfmFunctionPicker: vi.fn() }));
vi.mock('@/utility/drive.js', () => ({ selectFile: vi.fn() }));
vi.mock('@/os.js', () => ({ inputText: vi.fn(), apiWithDialog: vi.fn(), alert: vi.fn(), launchUploader: vi.fn() }));
vi.mock('@/components/page/page.note.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkDriveFileThumbnail.vue', () => ({ default: { render: () => null } }));

afterEach(() => {
	cleanup();
	vi.resetAllMocks();
});

function renderDocument(initial: PageBlock[] = []) {
	const content = ref(initial);
	const images = shallowReactive(new Map<string, DriveFile>());
	const view = render(defineComponent({
		setup: () => () => h(PageEditorDocument, {
			modelValue: content.value,
			'onUpdate:modelValue': value => { content.value = value; },
			onAttachImage: file => { images.set(file.id, file); },
			images,
		}),
	}), { global: { components: { Mfm: { render: () => null } }, directives: { tooltip: {} } } });
	return { ...view, content };
}

test('inserts a photo at the caret and continues writing around inline note and heading inserts', async () => {
	const view = renderDocument();
	const editor = view.getByRole<HTMLTextAreaElement>('textbox', { name: i18n.ts._pages.contents });
	await fireEvent.update(editor, 'BeforeAfter');
	editor.setSelectionRange(6, 6);

	vi.mocked(selectFile).mockResolvedValue({ id: 'photo', type: 'image/png', url: 'https://example.com/photo.png', name: 'Photo' } as DriveFile);
	await fireEvent.click(view.getByRole('button', { name: i18n.ts._pages.blocks.image }));
	await waitFor(() => expect(view.content.value.map(block => block.type)).toEqual(['text', 'image', 'text']));
	expect(view.getByRole('img', { name: 'Photo' }).getAttribute('src')).toBe('https://example.com/photo.png');
	const afterImage = view.getAllByRole<HTMLTextAreaElement>('textbox', { name: i18n.ts._pages.contents })[1];
	await waitFor(() => expect(document.activeElement).toBe(afterImage));

	vi.mocked(os.inputText).mockResolvedValueOnce({ canceled: false, result: 'some-note' });
	vi.mocked(os.apiWithDialog).mockResolvedValueOnce({ id: 'some-note' });
	await fireEvent.click(view.getByRole('button', { name: i18n.ts._pages.blocks.note }));
	await waitFor(() => expect(view.content.value.map(block => block.type)).toEqual(['text', 'image', 'note', 'text']));

	const afterNote = view.getAllByRole<HTMLTextAreaElement>('textbox', { name: i18n.ts._pages.contents })[1];
	await waitFor(() => expect(document.activeElement).toBe(afterNote));
	afterNote.setSelectionRange(0, 0);

	vi.mocked(os.inputText).mockResolvedValueOnce({ canceled: false, result: 'Next heading' });
	await fireEvent.click(view.getByRole('button', { name: i18n.ts._pages.title }));
	await waitFor(() => expect(withoutEmptyPageText(view.content.value)).toEqual([
		expect.objectContaining({ type: 'text', text: 'Before' }),
		expect.objectContaining({ type: 'image', fileId: 'photo' }),
		expect.objectContaining({ type: 'note', note: 'some-note' }),
		expect.objectContaining({ type: 'section', title: 'Next heading' }),
		expect.objectContaining({ type: 'text', text: 'After' }),
	]));
});

test('edits nested sections and removes headings without discarding their text', async () => {
	const view = renderDocument([
		{ id: 'heading', type: 'section', title: 'Existing heading', children: [{ id: 'text', type: 'text', text: 'Original' }] },
	]);
	const [nestedEditor] = view.getAllByRole<HTMLTextAreaElement>('textbox', { name: i18n.ts._pages.contents });
	await fireEvent.update(nestedEditor, 'Updated');
	expect(view.content.value[0]).toMatchObject({
		type: 'section', children: [{ id: 'text', type: 'text', text: 'Updated' }],
	});

	await fireEvent.click(view.getByRole('button', { name: i18n.ts.remove }));
	expect(withoutEmptyPageText(view.content.value)).toEqual([{ id: 'text', type: 'text', text: 'Updated' }]);
});

test('pastes multiple images at the caret in upload order', async () => {
	const view = renderDocument([{ id: 'text', type: 'text', text: 'BeforeAfter' }]);
	const editor = view.getByRole<HTMLTextAreaElement>('textbox', { name: i18n.ts._pages.contents });
	editor.setSelectionRange(6, 6);
	const files = [new File([], 'first.png', { type: 'image/png' }), new File([], 'second.png', { type: 'image/png' })];
	vi.mocked(os.launchUploader).mockResolvedValue([
		{ id: 'first', type: 'image/png' } as DriveFile,
		{ id: 'second', type: 'image/png' } as DriveFile,
	]);

	await fireEvent.paste(editor, { clipboardData: { files } });
	expect(os.launchUploader).toHaveBeenCalledWith(files, { multiple: true });
	await waitFor(() => expect(withoutEmptyPageText(view.content.value)).toEqual([
		expect.objectContaining({ type: 'text', text: 'Before' }),
		expect.objectContaining({ type: 'image', fileId: 'first' }),
		expect.objectContaining({ type: 'image', fileId: 'second' }),
		expect.objectContaining({ type: 'text', text: 'After' }),
	]));
});

test('wraps selected text with the chosen MFM function and restores the selection', async () => {
	const view = renderDocument([{ id: 'text', type: 'text', text: 'Before word after' }]);
	const editor = view.getByRole<HTMLTextAreaElement>('textbox', { name: i18n.ts._pages.contents });
	editor.setSelectionRange(7, 11);
	vi.mocked(mfmFunctionPicker).mockImplementation((_anchor, onChosen, onClosed) => {
		onChosen('spin');
		onClosed?.();
	});

	await fireEvent.click(view.getByRole('button', { name: i18n.ts.addMfmFunction }));
	expect(view.content.value[0]).toMatchObject({ text: 'Before $[spin word] after' });
	expect(editor.value.slice(editor.selectionStart, editor.selectionEnd)).toBe('word');
	expect(document.activeElement).toBe(editor);
});

test.each([
	['Before word after', 7, 11, 'Before [word](https://example.com/path) after'],
	['Before after', 7, 7, 'Before <https://example.com/path>after'],
])('inserts a link in the body at the current selection', async (initialText, start, end, expected) => {
	const view = renderDocument([{ id: 'text', type: 'text', text: initialText }]);
	const editor = view.getByRole<HTMLTextAreaElement>('textbox', { name: i18n.ts._pages.contents });
	editor.setSelectionRange(start, end);
	vi.mocked(os.inputText).mockResolvedValueOnce({ canceled: false, result: 'https://example.com/path' });

	await fireEvent.click(view.getByRole('button', { name: 'URL' }));
	expect(view.content.value[0]).toMatchObject({ text: expected });
	expect(document.activeElement).toBe(editor);
});

test('displays heading depth and edits the title without storing the marker', async () => {
	const view = renderDocument([
		{ id: 'heading', type: 'section', title: 'Heading', children: [
			{ id: 'subheading', type: 'section', title: 'Subheading', children: [] },
		] },
	]);
	const headings = view.getAllByRole('textbox', { name: i18n.ts._pages.enterSectionTitle });
	expect(view.getByText('#').getAttribute('aria-hidden')).toBe('true');
	expect(view.getByText('##').getAttribute('aria-hidden')).toBe('true');
	await fireEvent.update(headings[1], 'Updated subheading');
	expect(view.content.value[0]).toMatchObject({ children: [{ title: 'Updated subheading' }] });
});

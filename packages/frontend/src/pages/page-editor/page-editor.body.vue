<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.editor">
	<div v-if="showTools" :class="$style.formats">
		<button
			v-for="format in formats"
			:key="format.icon"
			type="button"
			class="_button"
			:class="$style.toolButton"
			:aria-label="format.name"
			:title="format.name"
			@mousedown.prevent
			@click="insertFormat(format)"
		><i :class="format.icon" aria-hidden="true"></i></button>
		<button
			type="button"
			class="_button"
			:class="$style.toolButton"
			:aria-label="i18n.ts.addMfmFunction"
			:title="i18n.ts.addMfmFunction"
			aria-haspopup="menu"
			@mousedown.prevent
			@click="pickMfmFunction"
		>MFM</button>
		<button
			type="button"
			class="_button"
			:class="$style.toolButton"
			aria-label="URL"
			title="URL"
			aria-haspopup="dialog"
			@mousedown.prevent
			@click="insertLink"
		><i class="ti ti-link" aria-hidden="true"></i></button>
		<slot name="insert" :getPosition="getPosition" :buttonClass="$style.toolButton"/>
	</div>
	<textarea
		ref="inputEl"
		v-model="text"
		:aria-label="label ?? i18n.ts._pages.contents"
		:placeholder="label ?? i18n.ts._pages.contents"
		:class="$style.textarea"
		:rows="rows"
		:style="{ minHeight: `calc(${rows}lh + 26px)` }"
		@focus="emit('activate')"
		@paste="attachImages($event, $event.clipboardData?.files)"
		@dragover="allowFileDrop"
		@drop="attachImages($event, $event.dataTransfer?.files)"
	></textarea>
</div>
</template>

<script lang="ts" setup>
import { nextTick, useTemplateRef, onMounted, onUnmounted } from 'vue';
import { parse } from 'mfm-js';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { Autocomplete } from '@/utility/autocomplete.js';
import { mfmFunctionPicker } from '@/utility/mfm-function-picker.js';

defineProps<{
	rows: number;
	showTools: boolean;
	/** テキストエリアのラベル (省略時は「コンテンツ」) */
	label?: string;
}>();

const emit = defineEmits<{
	(ev: 'activate'): void;
	(ev: 'attachFiles', position: number, files: File[]): void;
}>();

const text = defineModel<string>({ required: true });

const formats = [
	{ name: i18n.ts._pages.mfmBold, icon: 'ti ti-bold', before: '**', after: '**' },
	{ name: i18n.ts._pages.mfmItalic, icon: 'ti ti-italic', before: '<i>', after: '</i>' },
	{ name: i18n.ts._pages.mfmStrike, icon: 'ti ti-strikethrough', before: '~~', after: '~~' },
	{ name: i18n.ts.code, icon: 'ti ti-code', before: '`', after: '`' },
];

let autocomplete: Autocomplete | undefined;

const inputEl = useTemplateRef('inputEl');

function getPosition() {
	return inputEl.value?.selectionEnd ?? text.value.length;
}

function allowFileDrop(event: DragEvent) {
	if (event.dataTransfer?.types.includes('Files')) event.preventDefault();
}

function attachImages(event: ClipboardEvent | DragEvent, files: FileList | undefined) {
	if (!files?.length) return;
	if (event.type === 'drop') event.preventDefault();
	const images = Array.from(files).filter(file => file.type.startsWith('image/'));
	if (images.length === 0) return;
	event.preventDefault();
	emit('attachFiles', getPosition(), images);
}

function focus() {
	inputEl.value?.focus();
	inputEl.value?.setSelectionRange(0, 0);
}

// 指定位置 (既定はキャレット) に、前後を空行で区切った独立行としてテキストを挿入する
function insertBlock(block: string, position?: number) {
	const input = inputEl.value;
	if (!input) return;
	const at = Math.min(position ?? input.selectionEnd, input.value.length);
	const before = input.value.slice(0, at);
	const after = input.value.slice(at);
	const lead = before === '' ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
	const trail = after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
	const inserted = lead + block + trail;
	input.setRangeText(inserted, at, at);
	text.value = input.value;
	input.focus();
	const caret = at + inserted.length;
	input.setSelectionRange(caret, caret);
}

// キャレットのある行の見出しレベルを # → ## → ### → なし の順に切り替える
function cycleHeading() {
	const input = inputEl.value;
	if (!input) return;
	const lineStart = input.value.lastIndexOf('\n', input.selectionStart - 1) + 1;
	const lineEndIndex = input.value.indexOf('\n', input.selectionStart);
	const lineEnd = lineEndIndex === -1 ? input.value.length : lineEndIndex;
	const line = input.value.slice(lineStart, lineEnd);
	const marker = /^(#{1,6})[ \t]+/.exec(line);
	const depth = marker ? marker[1].length : 0;
	const body = marker ? line.slice(marker[0].length) : line;
	const next = depth >= 3 ? body : `${'#'.repeat(depth + 1)} ${body}`;
	input.setRangeText(next, lineStart, lineEnd);
	text.value = input.value;
	input.focus();
	const caret = lineStart + next.length;
	input.setSelectionRange(caret, caret);
}

defineExpose({ focus, insertBlock, cycleHeading });

async function insertLink() {
	const input = inputEl.value;
	if (!input) return;
	const { selectionStart, selectionEnd } = input;
	const { canceled, result } = await os.inputText({ type: 'url', title: 'URL', autocomplete: 'url' });
	if (inputEl.value !== input) return;

	if (canceled || !result?.trim()) {
		input.focus();
		return;
	}

	const value = result.trim();
	const url = URL.canParse(value) ? new URL(value) : null;
	if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) {
		await os.alert({ type: 'error', text: i18n.ts.invalidValue });
		inputEl.value?.focus();
		return;
	}

	const selected = input.value.slice(selectionStart, selectionEnd);
	const labeledLink = `[${selected}](${url.href})`;
	const [node, extra] = selected.trim() ? parse(labeledLink) : [];
	const link = node?.type === 'link' && node.props.url === url.href && !extra
		? labeledLink
		: `${selected}${selected && !/\s$/.test(selected) ? ' ' : ''}<${url.href}>`;
	input.setRangeText(link, selectionStart, selectionEnd, 'end');
	text.value = input.value;
	input.focus();
}

function pickMfmFunction(event: MouseEvent) {
	const input = inputEl.value;
	if (!input) return;
	let { selectionStart, selectionEnd } = input;

	mfmFunctionPicker(event.currentTarget, tag => {
		if (inputEl.value !== input) return;
		const before = `$[${tag} `;
		const selected = input.value.slice(selectionStart, selectionEnd);
		input.setRangeText(`${before}${selected}]`, selectionStart, selectionEnd);
		text.value = input.value;
		selectionStart += before.length;
		selectionEnd = selectionStart + selected.length;
	}, () => {
		void nextTick(() => {
			if (inputEl.value !== input) return;
			input.focus();
			input.setSelectionRange(selectionStart, selectionEnd);
		});
	});
}

function insertFormat(format: typeof formats[number]) {
	const input = inputEl.value;
	if (!input) return;
	const { selectionStart, selectionEnd } = input;
	const selected = input.value.slice(selectionStart, selectionEnd);
	const formatted = selected === ''
		? format.before + format.after
		: selected.split('\n').map(line => line.trim() ? format.before + line + format.after : line).join('\n');
	input.setRangeText(formatted, selectionStart, selectionEnd);
	text.value = input.value;
	input.focus();
	if (selected === '') {
		const caret = selectionStart + format.before.length;
		input.setSelectionRange(caret, caret);
	} else {
		input.setSelectionRange(selectionStart, selectionStart + formatted.length);
	}
}

onMounted(() => {
	if (inputEl.value == null) return;
	autocomplete = new Autocomplete(inputEl.value, text);
});

onUnmounted(() => {
	autocomplete?.detach();
});
</script>

<style lang="scss" module>
.editor {
	min-width: 0;
}

.formats {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 4px;
	padding: 4px 0;
	font-size: 0.8em;
}

.toolButton {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 4px;
	min-width: 36px;
	min-height: 36px;
	padding: 6px 8px;
	line-height: 1;

	> i {
		font-size: 1.125em;
	}
	border-radius: var(--MI-radius-sm);
	background: transparent;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}
}

.textarea {
	display: block;
	-webkit-appearance: none;
	-moz-appearance: none;
	appearance: none;
	width: 100%;
	resize: vertical;
	field-sizing: content;
	overflow-wrap: anywhere;
	border: 1px solid transparent;
	border-radius: var(--MI-radius-sm);
	padding: 12px 0;
	background: transparent;
	color: var(--MI_THEME-fg);
	font: inherit;
	box-sizing: border-box;
}
</style>

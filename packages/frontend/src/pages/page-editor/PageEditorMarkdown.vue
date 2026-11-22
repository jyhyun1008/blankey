<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<div v-if="!props.readonly" :class="$style.modeTabs" role="tablist">
		<button
			type="button"
			role="tab"
			class="_button"
			:class="[$style.modeTab, { [$style.active]: mode === 'write' }]"
			:aria-selected="mode === 'write'"
			@click="mode = 'write'"
		><i class="ti ti-pencil" aria-hidden="true"></i> {{ i18n.ts._pages.write }}</button>
		<button
			type="button"
			role="tab"
			class="_button"
			:class="[$style.modeTab, { [$style.active]: mode === 'preview' }]"
			:aria-selected="mode === 'preview'"
			@click="mode = 'preview'"
		><i class="ti ti-eye" aria-hidden="true"></i> {{ i18n.ts.preview }}</button>
	</div>

	<div :class="[$style.panes, { [$style.single]: props.readonly, [$style.showPreview]: mode === 'preview' }]">
		<div v-if="!props.readonly" :class="$style.source">
			<XBody
				ref="editor"
				v-model="markdown"
				:rows="18"
				:showTools="true"
				:class="$style.body"
				@attachFiles="uploadImages"
			>
				<template #insert="{ buttonClass }">
					<span :class="$style.separator" aria-hidden="true"></span>
					<button
						type="button"
						class="_button"
						:class="buttonClass"
						:aria-label="i18n.ts._pages.blocks.section"
						:title="i18n.ts._pages.blocks.section"
						@mousedown.prevent
						@click="editor?.cycleHeading()"
					><i class="ti ti-heading" aria-hidden="true"></i></button>
					<button
						type="button"
						class="_button"
						:class="buttonClass"
						:aria-label="i18n.ts._pages.blocks.image"
						:title="i18n.ts._pages.blocks.image"
						@mousedown.prevent
						@click="insertImage($event)"
					><i class="ti ti-photo" aria-hidden="true"></i></button>
					<button
						type="button"
						class="_button"
						:class="buttonClass"
						:aria-label="i18n.ts._pages.blocks.note"
						:title="i18n.ts._pages.blocks.note"
						@mousedown.prevent
						@click="insertNote()"
					><i class="ti ti-note" aria-hidden="true"></i></button>
				</template>
			</XBody>
			<p :class="$style.help">{{ i18n.ts._pages.markdownHelp }}</p>
		</div>

		<div :class="$style.preview" :aria-label="i18n.ts.preview">
			<div :class="{ [$style.center]: props.alignCenter, [$style.serif]: props.font === 'serif' }">
				<PageEditorDocument v-if="props.blocks.length > 0" :modelValue="props.blocks" :images="props.images" readonly/>
				<p v-else :class="$style.empty">{{ i18n.ts._pages.contents }}</p>
			</div>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, useTemplateRef } from 'vue';
import type { DriveFile, PageBlock } from 'misskey-js/entities.js';
import { url } from '@@/js/config.js';
import XBody from './page-editor.body.vue';
import PageEditorDocument from './PageEditorDocument.vue';
import { imageMarkdown, noteMarkdown } from './page-editor.markdown.js';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { selectFile } from '@/utility/drive.js';
import { apLookup } from '@/utility/lookup.js';

const props = defineProps<{
	blocks: PageBlock[];
	images: ReadonlyMap<string, DriveFile>;
	readonly?: boolean;
	alignCenter?: boolean;
	font?: string;
}>();

const emit = defineEmits<{
	(ev: 'attachImage', file: DriveFile): void;
}>();

const markdown = defineModel<string>({ required: true });
const editor = useTemplateRef('editor');
const mode = ref<'write' | 'preview'>('write');

function attach(file: DriveFile) {
	emit('attachImage', file);
	return imageMarkdown(file.id, file.name);
}

async function insertImage(ev: MouseEvent) {
	const file = await selectFile({ anchorElement: ev.currentTarget, multiple: false }).catch(() => null);
	if (!file) return;
	if (!file.type.startsWith('image/')) {
		void os.alert({ type: 'error', text: i18n.ts.invalidValue });
		return;
	}
	editor.value?.insertBlock(attach(file));
}

async function uploadImages(position: number, files: File[]) {
	let uploaded: DriveFile[];
	try {
		uploaded = await os.launchUploader(files, { multiple: true });
	} catch {
		return;
	}
	if (uploaded.length === 0) return;
	editor.value?.insertBlock(uploaded.map(attach).join('\n\n'), position);
}

async function insertNote() {
	const { canceled, result } = await os.inputText({
		title: i18n.ts._pages.blocks._note.id,
		placeholder: i18n.ts._pages.blocks._note.idDescription,
	});
	if (canceled || !result?.trim()) return;
	const input = result.trim();
	try {
		const target = /^https?:\/\//i.test(input) ? new URL(input) : null;
		const localId = target?.origin === new URL(url).origin
			? /^\/notes\/([^/]+)\/?$/.exec(target.pathname)?.[1]
			: null;
		let noteId: string;
		if (target && !localId) {
			const resolved = await apLookup(target.href);
			if (resolved.type !== 'Note') {
				void os.alert({ type: 'error', text: i18n.ts.invalidValue });
				return;
			}
			noteId = resolved.object.id;
		} else {
			noteId = (await os.apiWithDialog('notes/show', { noteId: localId ?? input })).id;
		}
		editor.value?.insertBlock(noteMarkdown(url, noteId));
	} catch {
		// エラーダイアログは apiWithDialog / apLookup 側で表示される
	}
}
</script>

<style lang="scss" module>
.root {
	container-type: inline-size;
}

.modeTabs {
	display: none;
	gap: 4px;
	padding: 4px;
	margin-bottom: 12px;
	border-radius: var(--MI-radius-md);
	background: var(--MI-c-sunken);
}

.modeTab {
	flex: 1;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	height: 36px;
	border-radius: var(--MI-radius-sm);
	color: var(--MI-c-fgMuted);

	&.active {
		color: var(--MI_THEME-fg);
		font-weight: bold;
		background: var(--MI_THEME-panel);
		box-shadow: 0 0 0 1px var(--MI-c-border);
	}
}

.panes {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
	gap: 24px;
	align-items: start;

	&.single {
		grid-template-columns: minmax(0, 1fr);
	}
}

.source {
	min-width: 0;
}

.body {
	textarea {
		padding: 12px 14px;
		border-color: var(--MI-c-border);
		background: var(--MI-c-inset);
		font-family: var(--MI-monospace, ui-monospace, SFMono-Regular, Menlo, monospace);
		font-size: 0.95em;
		line-height: 1.7;
		tab-size: 4;

		&:focus {
			outline: none;
			border-color: var(--MI_THEME-accent);
			box-shadow: var(--MI-focusRing);
		}
	}
}

.separator {
	width: 1px;
	height: 20px;
	margin: 0 4px;
	background: var(--MI-c-border);
}

.help {
	margin: 8px 0 0;
	color: var(--MI-c-fgMuted);
	font-size: 0.85em;
}

.preview {
	position: sticky;
	top: calc(var(--MI-stickyTop, 0px) + 12px);
	max-height: calc(100dvh - var(--MI-stickyTop, 0px) - var(--MI-stickyBottom, 0px) - 24px);
	overflow: auto;
	min-width: 0;
	padding: 4px 4px 4px 24px;
	border-left: 1px solid var(--MI-c-border);
	overflow-wrap: anywhere;

	.single & {
		position: static;
		max-height: none;
		padding: 0;
		border-left: 0;
	}
}

.empty {
	margin: 12px 0;
	color: var(--MI-c-fgSubtle);
}

.center {
	text-align: center;
}

.serif {
	font-family: serif;
}

@container (max-width: 760px) {
	.modeTabs {
		display: flex;
	}

	.panes {
		grid-template-columns: minmax(0, 1fr);

		&:not(.single) {
			> .preview {
				display: none;
			}

			&.showPreview {
				> .source {
					display: none;
				}

				> .preview {
					display: block;
				}
			}
		}
	}

	.preview {
		position: static;
		max-height: none;
		padding: 0;
		border-left: 0;
	}
}
</style>

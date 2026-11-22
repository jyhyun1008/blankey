<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<div :class="$style.label">{{ label }}</div>
	<div :class="$style.modeTabs" role="tablist">
		<button type="button" role="tab" class="_button" :class="[$style.modeTab, { [$style.active]: mode === 'write' }]" :aria-selected="mode === 'write'" @click="mode = 'write'">
			<i class="ti ti-pencil" aria-hidden="true"></i> {{ i18n.ts._pages.write }}
		</button>
		<button type="button" role="tab" class="_button" :class="[$style.modeTab, { [$style.active]: mode === 'preview' }]" :aria-selected="mode === 'preview'" @click="mode = 'preview'">
			<i class="ti ti-eye" aria-hidden="true"></i> {{ i18n.ts.preview }}
		</button>
	</div>
	<!-- ブログのエディタと同じ: 広い画面では左に入力、右にプレビュー -->
	<div :class="[$style.panes, { [$style.showPreview]: mode === 'preview' }]">
		<div :class="$style.source">
			<XBody ref="editor" v-model="text" :rows="8" :showTools="true" :label="label" :class="$style.body" @attachFiles="uploadImages">
				<template #insert="{ buttonClass }">
					<span :class="$style.separator" aria-hidden="true"></span>
					<button type="button" class="_button" :class="buttonClass" :aria-label="i18n.ts._pages.blocks.section" :title="i18n.ts._pages.blocks.section" @mousedown.prevent @click="editor?.cycleHeading()">
						<i class="ti ti-heading" aria-hidden="true"></i>
					</button>
					<button type="button" class="_button" :class="buttonClass" :aria-label="i18n.ts._pages.blocks.image" :title="i18n.ts._pages.blocks.image" @mousedown.prevent @click="insertImage($event)">
						<i class="ti ti-photo" aria-hidden="true"></i>
					</button>
				</template>
			</XBody>
		</div>
		<div :class="$style.preview" :aria-label="i18n.ts.preview">
			<XDescription v-if="text.trim()" :text="text" :author="author"/>
			<p v-else :class="$style.empty">{{ label }}</p>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, useTemplateRef } from 'vue';
import type * as Misskey from 'misskey-js';
import XDescription from './streaming-description.vue';
import XBody from '@/pages/page-editor/page-editor.body.vue';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { selectFile } from '@/utility/drive.js';
import { imageMarkdownForUrl } from '@/utility/streaming-description.js';

defineProps<{
	label: string;
	author?: Misskey.entities.UserLite;
}>();

const text = defineModel<string>({ required: true });
const editor = useTemplateRef('editor');
const mode = ref<'write' | 'preview'>('write');

async function insertImage(ev: MouseEvent) {
	const file = await selectFile({ anchorElement: ev.currentTarget, multiple: false }).catch(() => null);
	if (!file) return;
	if (!file.type.startsWith('image/')) {
		void os.alert({ type: 'error', text: i18n.ts.invalidValue });
		return;
	}
	editor.value?.insertBlock(imageMarkdownForUrl(file.url, file.name));
}

async function uploadImages(position: number, files: File[]) {
	let uploaded: Misskey.entities.DriveFile[];
	try {
		uploaded = await os.launchUploader(files, { multiple: true });
	} catch {
		return;
	}
	if (uploaded.length === 0) return;
	editor.value?.insertBlock(uploaded.map(file => imageMarkdownForUrl(file.url, file.name)).join('\n\n'), position);
}
</script>

<style lang="scss" module>
.root {
	container-type: inline-size;
}

.label {
	margin-bottom: 6px;
	font-size: 0.85em;
	font-weight: bold;
}

.modeTabs {
	display: none;
	gap: 4px;
	padding: 4px;
	margin-bottom: 8px;
	border-radius: var(--MI-radius-md);
	background: var(--MI-c-sunken);
}

.modeTab {
	flex: 1;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	height: 34px;
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
	gap: 20px;
	align-items: start;
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

.preview {
	min-width: 0;
	max-height: 480px;
	overflow: auto;
	padding: 4px 4px 4px 20px;
	border-left: 1px solid var(--MI-c-border);
}

.empty {
	margin: 12px 0;
	color: var(--MI-c-fgSubtle);
}

@container (max-width: 640px) {
	.modeTabs {
		display: flex;
	}

	.panes {
		grid-template-columns: minmax(0, 1fr);

		> .preview {
			display: none;
			padding: 0;
			border-left: 0;
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
</style>

<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps_s">
	<template v-for="block in rows" :key="block.id">
		<template v-if="block.type === 'text'">
			<Mfm v-if="props.readonly" :text="block.text ?? ''" :isNote="false"/>
			<XBody
				v-else
				:ref="component => setEditor(block.id, component)"
				:modelValue="block.text ?? ''"
				:rows="props.depth === 2 && rows.length === 1 ? 14 : 2"
				:showTools="block.id === activeEditorId"
				@activate="activeEditor = block.id"
				@attachFiles="(position, files) => uploadImages(block.id, position, files)"
				@update:modelValue="text => updateText(block.id, text)"
			>
				<template #insert="{ getPosition, buttonClass }">
					<button
						v-for="item in insertItems"
						:key="item.type"
						type="button"
						class="_button"
						:class="buttonClass"
						:aria-label="item.label"
						:title="item.label"
						@mousedown.prevent
						@click="insert(block.id, getPosition(), item.type, $event)"
					><i :class="item.icon" aria-hidden="true"></i></button>
					<slot name="tools" :buttonClass="buttonClass"/>
				</template>
			</XBody>
		</template>

		<div v-else :class="[$style.embedded, { [$style.inline]: block.type === 'section' || block.type === 'image' }]">
			<div :class="$style.embedContent">
				<template v-if="block.type === 'section'">
					<component :is="'h' + headingDepth" v-if="props.readonly" :class="$style.heading" :style="headingStyle">{{ block.title }}</component>
					<div v-else :class="$style.headingEditor" :style="headingStyle">
						<span :class="$style.headingMarker" aria-hidden="true">{{ '#'.repeat(headingDepth - 1) }}</span>
						<input
							type="text"
							:class="$style.headingInput"
							:aria-label="i18n.ts._pages.enterSectionTitle"
							:placeholder="i18n.ts._pages.title"
							:value="block.title"
							@input="update({ ...block, title: ($event.target as HTMLInputElement).value })"
						/>
					</div>
					<PageEditorDocument
						v-if="block.children?.length"
						:modelValue="block.children"
						:images="props.images"
						:readonly="props.readonly"
						:depth="props.depth + 1"
						@attachImage="file => emit('attachImage', file)"
						@update:modelValue="children => update({ ...block, children })"
					/>
				</template>
				<template v-else-if="block.type === 'image'">
					<img
						v-if="block.fileId && props.images.get(block.fileId)?.type.startsWith('image/')"
						:src="props.images.get(block.fileId)!.thumbnailUrl ?? props.images.get(block.fileId)!.url"
						:alt="props.images.get(block.fileId)!.comment ?? props.images.get(block.fileId)!.name"
						:class="$style.photo"
						loading="lazy"
					/>
					<MkDriveFileThumbnail v-else-if="block.fileId && props.images.has(block.fileId)" :file="props.images.get(block.fileId)!" :class="$style.image" fit="contain"/>
					<span v-else>{{ i18n.ts._pages.blocks.image }}</span>
				</template>
				<template v-else-if="block.type === 'note'">
					<XNote v-if="block.note" :key="block.note" :block="block"/>
					<span v-else>{{ i18n.ts._pages.blocks.note }}</span>
					<MkSwitch v-if="!props.readonly" :modelValue="block.detailed" @update:modelValue="detailed => update({ ...block, detailed })">
						{{ i18n.ts._pages.blocks._note.detailed }}
					</MkSwitch>
				</template>
				<span v-else>{{ i18n.ts._pages.blocks.dynamic }}</span>
			</div>
			<div v-if="!props.readonly" :class="$style.embedActions">
				<button
					v-if="block.type === 'image' || block.type === 'note'"
					type="button"
					class="_button"
					:aria-label="i18n.ts.edit"
					:title="i18n.ts.edit"
					@click="replace(block, $event)"
				><i class="ti ti-pencil"></i></button>
				<button
					type="button"
					class="_button"
					:aria-label="i18n.ts.remove"
					:title="i18n.ts.remove"
					@click="remove(block)"
				><i class="ti ti-x"></i></button>
			</div>
		</div>
	</template>
</div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import type { DriveFile, PageBlock } from 'misskey-js/entities.js';
import { url } from '@@/js/config.js';
import XBody from './page-editor.body.vue';
import { insertPageContent } from './page-editor.document.js';
import XNote from '@/components/page/page.note.vue';
import MkDriveFileThumbnail from '@/components/MkDriveFileThumbnail.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { selectFile } from '@/utility/drive.js';
import { genId } from '@/utility/id.js';
import { apLookup } from '@/utility/lookup.js';

const props = withDefaults(defineProps<{
	images: ReadonlyMap<string, DriveFile>;
	readonly?: boolean;
	depth?: number;
}>(), { depth: 2 });

const emit = defineEmits<{
	(ev: 'attachImage', file: DriveFile): void;
}>();

const content = defineModel<PageBlock[]>({ required: true });
const headingDepth = computed(() => Math.min(props.depth, 6));
const headingStyle = computed(() => ({ fontSize: `${Math.max(1.05, 1.75 - (headingDepth.value - 2) * 0.2)}rem` }));
const tailId = ref(genId());
const activeEditor = ref<string>();
let pendingInsert: symbol | undefined;
const editors = new Map<string, InstanceType<typeof XBody>>();

const insertItems = [
	{ type: 'image', label: i18n.ts._pages.blocks.image, icon: 'ti ti-photo' },
	{ type: 'note', label: i18n.ts._pages.blocks.note, icon: 'ti ti-note' },
	{ type: 'section', label: i18n.ts._pages.title, icon: 'ti ti-heading' },
] as const;

const rows = computed<PageBlock[]>(() => {
	if (props.readonly) return content.value.filter(block => block.type !== 'text' || block.text !== '');
	if (content.value.at(-1)?.type === 'text') return content.value;
	return [...content.value, { id: tailId.value, type: 'text', text: '' }];
});

const activeEditorId = computed(() => {
	const textRows = rows.value.filter(block => block.type === 'text');
	return textRows.find(block => block.id === activeEditor.value)?.id ?? textRows[0]?.id;
});

onBeforeUnmount(() => {
	pendingInsert = undefined;
});

function setEditor(id: string, component: Element | ComponentPublicInstance | null) {
	if (component == null) editors.delete(id);
	else editors.set(id, component as InstanceType<typeof XBody>);
}

function update(block: PageBlock) {
	content.value = content.value.map(item => item.id === block.id ? block : item);
}

function updateText(id: string, text: string) {
	if (id === tailId.value) {
		content.value = [...content.value, { id, type: 'text', text }];
		tailId.value = genId();
	} else {
		update({ id, type: 'text', text });
	}
}

function remove(block: PageBlock) {
	content.value = content.value.flatMap(item => {
		if (item.id !== block.id) return [item];
		return item.type === 'section' ? item.children ?? [] : [];
	});
}

type InsertType = typeof insertItems[number]['type'];
type Insertable = Exclude<PageBlock, { type: 'text' }>;
type AttachmentBlock = Extract<PageBlock, { type: 'image' | 'note' }>;

async function pickContent(id: string, type: InsertType, anchor: EventTarget | null): Promise<Insertable | undefined> {
	try {
		if (type === 'image') {
			const file = await selectFile({ anchorElement: anchor, multiple: false });
			if (!file) return;
			if (!file.type.startsWith('image/')) {
				void os.alert({ type: 'error', text: i18n.ts.invalidValue });
				return;
			}
			emit('attachImage', file);
			return { id, type, fileId: file.id };
		} else if (type === 'note') {
			const { canceled, result } = await os.inputText({
				title: i18n.ts._pages.blocks._note.id,
				placeholder: i18n.ts._pages.blocks._note.idDescription,
			});
			if (canceled || !result?.trim()) return;
			const input = result.trim();
			const target = /^https?:\/\//i.test(input) ? new URL(input) : null;
			const noteId = target?.origin === new URL(url).origin
				? /^\/notes\/([^/]+)\/?$/.exec(target.pathname)?.[1]
				: null;
			if (target && !noteId) {
				const resolved = await apLookup(target.href);
				if (resolved.type !== 'Note') {
					void os.alert({ type: 'error', text: i18n.ts.invalidValue });
					return;
				}
				return { id, type, detailed: false, note: resolved.object.id };
			} else {
				const note = await os.apiWithDialog('notes/show', { noteId: noteId ?? input });
				return { id, type, detailed: false, note: note.id };
			}
		} else {
			const { canceled, result } = await os.inputText({ title: i18n.ts._pages.enterSectionTitle });
			if (canceled || !result?.trim()) return;
			return { id, type, title: result.trim(), children: [] };
		}
	} catch (error) {
		if (error instanceof TypeError) {
			void os.alert({ type: 'error', text: i18n.ts.somethingHappened });
		}
		return;
	}
}

async function replace(block: AttachmentBlock, ev: MouseEvent) {
	const request = Symbol();
	pendingInsert = request;
	const replacement = await pickContent(block.id, block.type, ev.currentTarget);
	if (!replacement || pendingInsert !== request || props.readonly) return;
	const existing = content.value.find(item => item.id === block.id);
	if (replacement.type === 'note' && existing?.type === 'note') {
		update({ ...existing, note: replacement.note });
	} else {
		update(replacement);
	}
}

async function insert(sourceId: string, position: number, type: InsertType, ev: MouseEvent) {
	const request = Symbol();
	pendingInsert = request;
	const inserted = await pickContent(genId(), type, ev.currentTarget);
	if (!inserted) return;

	await finishInsert(request, sourceId, position, [inserted]);
}

async function uploadImages(sourceId: string, position: number, files: File[]) {
	const request = Symbol();
	pendingInsert = request;
	let uploaded: DriveFile[];
	try {
		uploaded = await os.launchUploader(files, { multiple: true });
	} catch {
		return;
	}
	if (pendingInsert !== request || props.readonly || uploaded.length === 0) return;
	const inserted = uploaded.map(file => {
		emit('attachImage', file);
		return { id: genId(), type: 'image' as const, fileId: file.id };
	});
	await finishInsert(request, sourceId, position, inserted);
}

async function finishInsert(request: symbol, sourceId: string, position: number, inserted: Insertable[]) {
	if (pendingInsert !== request || props.readonly) return;
	const source = rows.value.find(block => block.id === sourceId);
	if (source?.type !== 'text') return;

	const continuationId = genId();
	content.value = insertPageContent(content.value, { ...source, text: source.text ?? '' }, position, inserted, continuationId);
	activeEditor.value = continuationId;
	await nextTick();
	editors.get(continuationId)?.focus();
}
</script>

<style lang="scss" module>
.embedded {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	padding: 8px;
	border-radius: var(--MI-radius);
	background: var(--MI_THEME-panel);
}

.inline {
	padding: 0;
	background: transparent;
}

.embedContent {
	flex: 1;
	min-width: 0;
}

.heading {
	margin: 0;
}

.headingEditor {
	display: flex;
	align-items: baseline;
	gap: .5em;
	margin: 8px 0;
}

.headingMarker {
	opacity: .5;
	font-family: monospace;
}

.headingInput {
	flex: 1;
	min-width: 0;
	border: 0;
	border-radius: var(--MI-radius-sm);
	background: transparent;
	color: inherit;
	font: inherit;
	font-weight: bold;
}

.photo {
	display: block;
	max-width: 100%;
	max-height: 480px;
	object-fit: contain;
}

.image {
	height: 180px;
}

.embedActions {
	display: flex;

	> button {
		padding: 8px;
	}
}
</style>

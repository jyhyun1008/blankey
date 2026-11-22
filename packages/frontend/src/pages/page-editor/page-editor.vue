<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader>
	<div class="_spacer" :style="{ '--MI_SPACER-w': readonly ? '800px' : '1240px' }">
		<MkError v-if="loadError" @retry="init()"/>
		<MkLoading v-else-if="!ready"/>
		<div v-else class="_gaps_m" :class="$style.editorPanel">
			<div v-if="!readonly || eyeCatchingImage" :class="$style.cover">
				<img v-if="eyeCatchingImage" :src="eyeCatchingImage.url" :alt="eyeCatchingImage.name" :class="$style.coverImage"/>
				<div :class="$style.coverBar">
					<span><i class="ti ti-photo" aria-hidden="true"></i> {{ i18n.ts._pages.eyeCatchingImageSet }}</span>
					<div v-if="!readonly" :class="$style.coverActions">
						<MkButton small inline @click="setCover('upload')">{{ i18n.ts.upload }}</MkButton>
						<MkButton small inline @click="setCover('drive')">{{ i18n.ts.fromDrive }}</MkButton>
						<MkButton v-if="eyeCatchingImage" small inline @click="removeCover">{{ i18n.ts.remove }}</MkButton>
					</div>
				</div>
			</div>

			<div :class="$style.articleMetadata">
				<input v-model="title" type="text" :readonly="readonly" :class="$style.title" :aria-label="i18n.ts._pages.title" :placeholder="i18n.ts._pages.title"/>
				<input v-model="summary" type="text" :readonly="readonly" :class="$style.summary" :aria-label="i18n.ts._pages.summary" :placeholder="`${i18n.ts._pages.summary} (${i18n.ts.optional})`"/>
			</div>

			<div :class="$style.document">
				<PageEditorMarkdown
					v-model="markdown"
					:blocks="previewBlocks"
					:images="images"
					:readonly="readonly"
					:alignCenter="alignCenter"
					:font="font"
					@attachImage="file => images.set(file.id, file)"
				/>
			</div>

			<details :class="$style.settings">
				<summary>{{ i18n.ts.advancedSettings }}</summary>
				<div class="_gaps_m" :class="$style.settingsFields">
					<MkInput v-model="name" :readonly="readonly">
						<template #prefix>{{ url }}/@{{ author?.username ?? '???' }}/pages/</template>
						<template #label>{{ i18n.ts._pages.url }}</template>
					</MkInput>

					<MkSwitch v-model="supportersOnly" :disabled="readonly">
						{{ i18n.ts._pages.supportersOnly }}
						<template #caption>{{ i18n.ts._pages.supportersOnlyHelp }}</template>
					</MkSwitch>

					<MkSwitch v-model="alignCenter" :disabled="readonly">{{ i18n.ts._pages.alignCenter }}</MkSwitch>

					<MkSelect v-model="font" :items="fontDef" :readonly="readonly">
						<template #label>{{ i18n.ts._pages.font }}</template>
					</MkSelect>

					<MkSwitch v-model="hideTitleWhenPinned" :disabled="readonly">{{ i18n.ts._pages.hideTitleWhenPinned }}</MkSwitch>
				</div>
			</details>

			<div :class="$style.actions">
				<MkButton v-if="pageId && author != null" inline type="routerLink" :to="`/@${ author.username }/pages/${ currentName }`"><i class="ti ti-external-link"></i> {{ i18n.ts._pages.viewPage }}</MkButton>
				<MkButton v-if="!readonly" inline primary @click="save"><i class="ti ti-device-floppy"></i> {{ i18n.ts.save }}</MkButton>
				<MkButton v-if="pageId" inline @click="duplicate"><i class="ti ti-copy"></i> {{ i18n.ts.duplicate }}</MkButton>
				<MkButton v-if="pageId && !readonly" inline danger @click="del"><i class="ti ti-trash"></i> {{ i18n.ts.delete }}</MkButton>
			</div>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, shallowReactive, watch } from 'vue';
import * as Misskey from 'misskey-js';
import { url } from '@@/js/config.js';
import PageEditorMarkdown from './PageEditorMarkdown.vue';
import { blocksToMarkdown, markdownToBlocks } from './page-editor.markdown.js';
import MkButton from '@/components/MkButton.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkInput from '@/components/MkInput.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { chooseDriveFile, chooseFileFromPcAndUpload } from '@/utility/drive.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import { $i } from '@/i.js';
import { mainRouter } from '@/router.js';
import { useMkSelect } from '@/composables/use-mkselect.js';
import { genId } from '@/utility/id.js';

const props = defineProps<{
	initPageId?: string;
	initPageName?: string;
	initUser?: string;
}>();

const author = ref<Misskey.entities.User | null>($i);
const readonly = computed(() => !props.initPageId && !!(props.initPageName && props.initUser));
const ready = ref(false);
const loadError = ref(false);
const pageId = ref<string | null>(null);
const currentName = ref<string | null>(null);
const title = ref('');
const summary = ref<string | null>(null);
const name = ref(Date.now().toString());
const eyeCatchingImage = ref<Misskey.entities.DriveFile | null>(null);
let coverRequest: symbol | undefined;

const {
	model: font,
	def: fontDef,
} = useMkSelect({
	items: [
		{ label: i18n.ts._pages.fontSansSerif, value: 'sans-serif' },
		{ label: i18n.ts._pages.fontSerif, value: 'serif' },
	],
	initialValue: 'sans-serif',
});
const markdown = ref('');
// プレビューと保存に使うブロック列。ID を引き継ぐため直前の変換結果を previous として渡す
const previewBlocks = ref<Misskey.entities.PageBlock[]>([]);
let parseTimer: number | undefined;

function parseMarkdown() {
	window.clearTimeout(parseTimer);
	parseTimer = undefined;
	previewBlocks.value = markdownToBlocks(markdown.value, { origin: url, previous: previewBlocks.value, genId });
	return previewBlocks.value;
}

watch(markdown, () => {
	window.clearTimeout(parseTimer);
	parseTimer = window.setTimeout(parseMarkdown, 200);
});

onBeforeUnmount(() => {
	window.clearTimeout(parseTimer);
});
const images = shallowReactive(new Map<string, Misskey.entities.DriveFile>());
const alignCenter = ref(false);
const supportersOnly = ref(false);
const hideTitleWhenPinned = ref(false);

function getSaveOptions(): Misskey.entities.PagesCreateRequest {
	return {
		title: title.value.trim(),
		name: name.value.trim(),
		summary: summary.value,
		font: font.value,
		script: '',
		hideTitleWhenPinned: hideTitleWhenPinned.value,
		alignCenter: alignCenter.value,
		supportersOnly: supportersOnly.value,
		content: parseMarkdown(),
		variables: [],
		eyeCatchingImageId: eyeCatchingImage.value?.id ?? null,
	};
}

async function save() {
	const options = getSaveOptions();

	if (pageId.value) {
		const updateOptions: Misskey.entities.PagesUpdateRequest = {
			pageId: pageId.value,
			...options,
		};

		await os.apiWithDialog('pages/update', updateOptions, undefined, {
			'2298a392-d4a1-44c5-9ebb-ac1aeaa5a9ab': {
				title: i18n.ts.somethingHappened,
				text: i18n.ts._pages.nameAlreadyExists,
			},
		});

		currentName.value = name.value.trim();
	} else {
		const created = await os.apiWithDialog('pages/create', options, undefined, {
			'4650348e-301c-499a-83c9-6aa988c66bc1': {
				title: i18n.ts.somethingHappened,
				text: i18n.ts._pages.nameAlreadyExists,
			},
		});

		pageId.value = created.id;
		currentName.value = name.value.trim();
		mainRouter.replace('/pages/edit/:initPageId', {
			params: {
				initPageId: pageId.value,
			},
		});
	}
}

async function del() {
	if (!pageId.value) return;

	const { canceled } = await os.confirm({
		type: 'warning',
		text: i18n.tsx.removeAreYouSure({ x: title.value.trim() }),
	});

	if (canceled) return;

	await os.apiWithDialog('pages/delete', {
		pageId: pageId.value,
	});

	mainRouter.replace('/pages');
}

async function duplicate() {
	title.value = title.value + ' - copy';
	name.value = name.value + '-copy';

	const created = await os.apiWithDialog('pages/create', getSaveOptions(), undefined, {
		'4650348e-301c-499a-83c9-6aa988c66bc1': {
			title: i18n.ts.somethingHappened,
			text: i18n.ts._pages.nameAlreadyExists,
		},
	});

	pageId.value = created.id;
	currentName.value = name.value.trim();

	mainRouter.push('/pages/edit/:initPageId', {
		params: {
			initPageId: pageId.value,
		},
	});
}

async function setCover(source: 'upload' | 'drive') {
	const request = Symbol();
	coverRequest = request;
	try {
		const [file] = source === 'upload' ? await chooseFileFromPcAndUpload() : await chooseDriveFile();
		if (!file || coverRequest !== request) return;
		if (!file.type.startsWith('image/')) {
			void os.alert({ type: 'error', text: i18n.ts.invalidValue });
			return;
		}
		eyeCatchingImage.value = file;
	} catch {
		if (coverRequest === request) void os.alert({ type: 'error', text: i18n.ts.somethingHappened });
	}
}

function removeCover() {
	coverRequest = undefined;
	eyeCatchingImage.value = null;
}

async function init() {
	loadError.value = false;
	let page: Misskey.entities.Page | null = null;
	try {
		if (props.initPageId) {
			page = await misskeyApi('pages/show', {
				pageId: props.initPageId,
			});
		} else if (props.initPageName && props.initUser) {
			page = await misskeyApi('pages/show', {
				name: props.initPageName,
				username: props.initUser,
			});
		}
	} catch {
		loadError.value = true;
		return;
	}

	if (page) {
		author.value = page.user;
		pageId.value = page.id;
		title.value = page.title;
		name.value = page.name;
		currentName.value = page.name;
		summary.value = page.summary;
		font.value = page.font;
		hideTitleWhenPinned.value = page.hideTitleWhenPinned;
		alignCenter.value = page.alignCenter;
		supportersOnly.value = page.supportersOnly ?? false;
		for (const file of page.attachedFiles) images.set(file.id, file);
		previewBlocks.value = page.content;
		markdown.value = blocksToMarkdown(page.content, { origin: url, fileName: id => images.get(id)?.name });
		eyeCatchingImage.value = page.eyeCatchingImage;
	}
	ready.value = true;
}

init();

definePage(() => ({
	title: props.initPageId ? i18n.ts._pages.editPage
	: props.initPageName && props.initUser ? i18n.ts._pages.readPage
	: i18n.ts._pages.newPage,
	icon: 'ti ti-pencil',
}));
</script>

<style lang="scss" module>
.editorPanel {
	padding: clamp(16px, 4vw, 32px);
	border-radius: var(--MI-radius);
	background: var(--MI_THEME-panel);
}

.actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.cover {
	border: 1px solid var(--MI_THEME-divider);
	border-radius: var(--MI-radius);
	overflow: hidden;
	color: var(--MI_THEME-fg);
}

.coverImage {
	display: block;
	width: 100%;
	max-height: 260px;
	object-fit: cover;
}

.coverBar,
.coverActions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}

.coverBar {
	justify-content: space-between;
	padding: 12px 16px;
}

.articleMetadata {
	display: grid;
	gap: 12px;
}

.title,
.summary {
	width: 100%;
	box-sizing: border-box;
	border: 0;
	border-radius: var(--MI-radius-sm);
	padding: 4px 0;
	color: inherit;
	background: transparent;
	font: inherit;

	&::placeholder {
		color: var(--MI_THEME-fg);
		opacity: .6;
	}
}

.title {
	font-size: clamp(1.6rem, 4.5vw, 2.4rem);
	font-weight: 750;
}

.summary {
	font-size: 1.125em;
}

.document {
	border-top: 1px solid var(--MI_THEME-divider);
	padding-top: 8px;
}

.settings {
	border-top: 1px solid var(--MI_THEME-divider);

	> summary {
		padding: 16px 0;
		font-weight: bold;
		cursor: pointer;
	}
}

.settingsFields {
	padding-bottom: 16px;
}
</style>

<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps_m">
	<!-- グッズ・サービス: サムネイル (アップロード / ドライブ) -->
	<div v-if="!isVideo" :class="$style.thumbnailField">
		<div :class="$style.thumbnailPreview">
			<img v-if="draft.thumbnailUrl" :src="getStreamingImageSrc(draft.thumbnailUrl, 'preview')" alt=""/>
			<i v-else class="ti ti-photo" aria-hidden="true"></i>
		</div>
		<div class="_gaps_s">
			<div :class="$style.fieldLabel">{{ i18n.ts._profile.streamingThumbnail }}</div>
			<div class="_buttons">
				<MkButton small :disabled="disabled" @click="chooseThumbnail"><i class="ti ti-upload"></i> {{ i18n.ts.upload }} / {{ i18n.ts.fromDrive }}</MkButton>
				<MkButton v-if="draft.thumbnailUrl" small danger :disabled="disabled" @click="draft.thumbnailUrl = ''">{{ i18n.ts.remove }}</MkButton>
			</div>
		</div>
	</div>
	<MkInput v-model="draft.title" :disabled="disabled">
		<template #label>{{ i18n.ts.title }}</template>
	</MkInput>
	<MkInput v-model="draft.url" :disabled="disabled" type="url" inputmode="url" placeholder="https://">
		<template #label>{{ isVideo ? i18n.ts._profile.streamingResourceUrl : i18n.ts._profile.streamingSalesUrl }}</template>
	</MkInput>
	<MkInput v-if="!isVideo" v-model="draft.price" :disabled="disabled">
		<template #label>{{ i18n.ts._profile.streamingPrice }} ({{ i18n.ts.optional }})</template>
	</MkInput>
	<MkInput v-model="draft.hashtags" :disabled="disabled" placeholder="#… #…">
		<template #label>{{ i18n.ts.hashtags }} ({{ i18n.ts.optional }})</template>
	</MkInput>
	<XDescriptionEditor v-model="draft.body" :label="isVideo ? i18n.ts._profile.streamingResourceBody : i18n.ts._profile.streamingDescription" :author="user"/>
	<fieldset v-if="!isVideo" class="_gaps_s" :class="$style.portfolio">
		<legend>{{ i18n.ts._profile.streamingPortfolio }}</legend>
		<div v-for="item in draft.portfolio" :key="item.id" class="_gaps_s" :class="$style.portfolioItem">
			<MkInput v-model="item.title" :disabled="disabled">
				<template #label>{{ i18n.ts.title }}</template>
			</MkInput>
			<MkInput v-model="item.imageUrl" :disabled="disabled" type="url" inputmode="url">
				<template #label>{{ i18n.ts.imageUrl }} ({{ i18n.ts.optional }})</template>
			</MkInput>
			<MkInput v-model="item.url" :disabled="disabled" type="url" inputmode="url">
				<template #label>{{ i18n.ts._profile.streamingResourceUrl }} ({{ i18n.ts.optional }})</template>
			</MkInput>
			<div><MkButton small danger :disabled="disabled" @click="draft.portfolio = draft.portfolio.filter(card => card.id !== item.id)">{{ i18n.ts.remove }}</MkButton></div>
		</div>
		<div><MkButton :disabled="disabled" @click="draft.portfolio.push({ id: genId(), title: '', imageUrl: '', url: '' })"><i class="ti ti-plus"></i> {{ i18n.ts._profile.streamingPortfolioAdd }}</MkButton></div>
	</fieldset>
</div>
</template>

<script lang="ts" setup>
import type * as Misskey from 'misskey-js';
import XDescriptionEditor from './streaming-description-editor.vue';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { selectFile } from '@/utility/drive.js';
import { genId } from '@/utility/id.js';
import { getStreamingImageSrc } from '@/utility/streaming-overview.js';
import type { StreamingResourceDraft } from '@/utility/streaming-resource-draft.js';

defineProps<{
	isVideo: boolean;
	user: Misskey.entities.UserLite;
	disabled?: boolean;
}>();

const draft = defineModel<StreamingResourceDraft>({ required: true });

async function chooseThumbnail(ev: MouseEvent) {
	const file = await selectFile({ anchorElement: ev.currentTarget, multiple: false }).catch(() => null);
	if (!file) return;
	if (!file.type.startsWith('image/')) {
		void os.alert({ type: 'error', text: i18n.ts.invalidValue });
		return;
	}
	draft.value.thumbnailUrl = file.url;
}
</script>

<style lang="scss" module>
.thumbnailField {
	display: flex;
	align-items: center;
	gap: 16px;
}

.thumbnailPreview {
	display: grid;
	place-items: center;
	flex: none;
	width: 112px;
	aspect-ratio: 1;
	overflow: hidden;
	border-radius: var(--MI-radius-md);
	background: var(--MI-c-inset);
	color: var(--MI-c-fgSubtle);
	font-size: 1.6em;
	box-shadow: 0 0 0 1px var(--MI-c-border);

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
}

.fieldLabel {
	font-size: 0.85em;
	font-weight: bold;
}

.portfolio {
	margin: 0;
	padding: 0;
	border: 0;

	> legend {
		margin-bottom: 8px;
		padding: 0;
		font-size: 0.85em;
		font-weight: bold;
	}
}

.portfolioItem {
	padding: 12px;
	border-radius: var(--MI-radius-md);
	box-shadow: 0 0 0 1px var(--MI-c-border);
}
</style>

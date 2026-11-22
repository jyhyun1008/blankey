<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<figure v-if="image" :class="$style.root">
	<div :class="$style.frame" :style="frameStyle">
		<MkMediaImage
			v-if="image.type.startsWith('image')"
			:image="image"
			:marker="marker"
			disableImageLink
			:class="$style.media"
			@mediaClick="open"
		/>
		<MkMediaList v-else :mediaList="[image]" :user="page.user"/>
	</div>
	<figcaption v-if="image.comment" :class="$style.caption">{{ image.comment }}</figcaption>
</figure>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import * as Misskey from 'misskey-js';
import MkMediaImage from '@/components/MkMediaImage.vue';
import MkMediaList from '@/components/MkMediaList.vue';
import { genId } from '@/utility/id.js';
import { openMediaLightbox } from '@/utility/open-media-lightbox.js';

const props = defineProps<{
	block: Extract<Misskey.entities.PageBlock, { type: 'image' }>,
	page: Misskey.entities.Page,
}>();

const image = computed(() => props.page.attachedFiles.find(x => x.id === props.block.fileId) ?? null);
const marker = `page-image:${genId()}`;

// 本文画像は元の縦横比のまま、高さ 70vh までに収める (レターボックスを出さない)
const frameStyle = computed(() => {
	const { width, height } = image.value?.properties ?? {};
	if (!image.value?.type.startsWith('image') || !width || !height) return {};
	return { aspectRatio: `${width} / ${height}`, width: `min(100%, calc(70vh * ${width / height}))` };
});

function open() {
	if (!image.value) return;
	const images = props.page.attachedFiles.filter(file => file.type.startsWith('image'));
	void openMediaLightbox(images.length ? images : [image.value], image.value.id, { user: props.page.user, sourceMarker: marker });
}
</script>

<style lang="scss" module>
.root {
	margin: 0.4em 0;
	text-align: center;
}

.frame {
	max-width: 100%;
	margin: 0 auto;
	overflow: hidden;
	border-radius: var(--MI-radius-md);
	box-shadow: 0 0 0 1px var(--MI-c-border);
}

.media {
	width: 100%;
	height: 100%;
	background: transparent !important;
}

.caption {
	margin-top: 8px;
	color: var(--MI-c-fgMuted);
	font-size: 0.85em;
	line-height: 1.5;
}
</style>

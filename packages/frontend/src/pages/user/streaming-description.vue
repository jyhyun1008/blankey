<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<template v-for="(node, index) in nodes" :key="index">
		<component :is="`h${node.depth + 1}`" v-if="node.type === 'heading'" :class="[$style.heading, $style[`h${node.depth}`]]">{{ node.text }}</component>
		<figure v-else-if="node.type === 'image'" :class="$style.figure">
			<img :src="getStreamingImageSrc(node.url)" :alt="node.alt" :class="$style.image" loading="lazy"/>
			<figcaption v-if="node.alt" :class="$style.caption">{{ node.alt }}</figcaption>
		</figure>
		<div v-else :class="$style.text"><Mfm :text="node.text" :author="author" :isNote="false" class="_selectable"/></div>
	</template>
</div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import type * as Misskey from 'misskey-js';
import { parseStreamingDescription } from '@/utility/streaming-description.js';
import { getStreamingImageSrc } from '@/utility/streaming-overview.js';

const props = defineProps<{
	text: string;
	author?: Misskey.entities.UserLite;
}>();

const nodes = computed(() => parseStreamingDescription(props.text));
</script>

<style lang="scss" module>
.root {
	display: grid;
	gap: 0.9em;
	line-height: 1.85;
	overflow-wrap: anywhere;

	:global(a) {
		color: var(--MI-c-accentInk);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, currentColor 35%, transparent);
		text-underline-offset: 0.2em;
	}
}

.heading {
	margin: 0.6em 0 0;
	line-height: 1.35;
}

.h1 {
	padding-bottom: 0.3em;
	border-bottom: 1px solid var(--MI-c-border);
	font-size: 1.4em;
}

.h2 {
	font-size: 1.2em;
}

.h3 {
	font-size: 1.05em;
}

.figure {
	margin: 0;
	text-align: center;
}

.image {
	display: block;
	max-width: 100%;
	max-height: 70vh;
	margin: 0 auto;
	border-radius: var(--MI-radius-md);
	box-shadow: 0 0 0 1px var(--MI-c-border);
}

.caption {
	margin-top: 6px;
	color: var(--MI-c-fgMuted);
	font-size: 0.85em;
}
</style>

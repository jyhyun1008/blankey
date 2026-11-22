<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<ul v-if="tags.length" :class="[$style.tags, { [$style.singleLine]: singleLine }]" :aria-label="i18n.ts.hashtags">
	<li v-for="tag in tags" :key="tag" :class="$style.tag">#{{ tag }}</li>
</ul>
</template>

<script lang="ts" setup>
import { i18n } from '@/i18n.js';

defineProps<{
	tags: string[];
	singleLine?: boolean;
}>();
</script>

<style module>
.tags {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	margin: var(--hashtag-pills-margin-start, 0) 0 var(--hashtag-pills-margin-end, 0);
	padding: 0;
	list-style: none;
	min-width: 0;
}

.singleLine {
	flex-wrap: nowrap;
	overflow: hidden;
}

.tag {
	flex: none;
	max-width: 100%;
	box-sizing: border-box;
	overflow: hidden;
	padding: 2px 8px;
	border-radius: var(--MI-radius-full);
	background: color-mix(in srgb, var(--MI_THEME-panel) 86%, var(--MI_THEME-accent));
	color: var(--MI_THEME-fg);
	font-size: 0.8em;
	line-height: 1.4;
	text-overflow: ellipsis;
	text-shadow: none;
	white-space: nowrap;
}
</style>

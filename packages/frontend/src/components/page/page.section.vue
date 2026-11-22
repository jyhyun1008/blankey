<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<section>
	<component
		:is="'h' + Math.min(h, 6)"
		:id="`page-section-${block.id}`"
		:class="[$style.heading, {
			[$style.h2]: h === 2,
			[$style.h3]: h === 3,
		}]"
	>
		{{ block.title }}
	</component>

	<div class="_gaps">
		<XBlock v-for="child in block.children" :key="child.id" :page="page" :block="child" :h="h + 1"/>
	</div>
</section>
</template>

<script lang="ts" setup>
import { defineAsyncComponent } from 'vue';
import * as Misskey from 'misskey-js';

const XBlock = defineAsyncComponent(() => import('./page.block.vue'));

defineProps<{
	block: Extract<Misskey.entities.PageBlock, { type: 'section' }>,
	h: number,
	page: Misskey.entities.Page,
}>();
</script>

<style lang="scss" module>
.heading {
	margin: 0.6em 0 0.2em;
	font-size: 1em;
	line-height: 1.35;
	scroll-margin-top: calc(var(--MI-stickyTop, 0px) + 16px);
	overflow-wrap: anywhere;
}

.h2 {
	margin-top: 1.4em;
	padding-bottom: 0.3em;
	border-bottom: 1px solid var(--MI-c-border);
	font-size: 1.5em;
}

.h3 {
	font-size: 1.2em;
	margin-top: 0.9em;
}
</style>

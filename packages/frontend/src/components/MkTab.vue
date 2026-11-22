<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
	<div :class="$style.tabsRoot">
		<button
			v-for="option in tabs"
			:key="option.key"
			:class="['_button', $style.tabButton, { [$style.active]: modelValue === option.key }]"
			:disabled="modelValue === option.key"
			@click="update(option.key)"
		>
			<i v-if="option.icon" :class="[option.icon, $style.icon]"></i>
			{{ option.label }}
		</button>
	</div>
</template>

<script lang="ts">
export type Tab<T = string> = {
	key: T;
	icon?: string;
	label?: string;
};
</script>

<script setup lang="ts" generic="const T extends Tab">
import { defineProps, defineEmits } from 'vue';

defineProps<{
	tabs: T[];
}>();

const model = defineModel<T['key']>();

function update(key: T['key']) {
	model.value = key;
}
</script>

<style module lang="scss">
.tabsRoot {
	display: flex;
	gap: 4px;
	padding: 4px;
	font-size: 90%;
	background: var(--MI-c-sunken);
	border-radius: var(--MI-radius-md);
}

.tabButton {
	flex: 1;
	min-height: var(--MI-controlHeightSm);
	padding: 6px 8px;
	border-radius: calc(var(--MI-radius-md) - 4px);
	color: var(--MI-c-fgMuted);
	transition:
		background var(--MI-duration-fast) var(--MI-ease),
		color var(--MI-duration-fast) var(--MI-ease),
		box-shadow var(--MI-duration) var(--MI-ease);

	&:disabled {
		opacity: 1 !important;
		cursor: default;
	}

	&.active {
		font-weight: bold;
		color: var(--MI-c-accentInk);
		background: light-dark(var(--MI_THEME-panel), color-mix(in srgb, var(--MI_THEME-fg) 14%, var(--MI_THEME-panel)));
		box-shadow: 0 0 0 1px var(--MI-c-border);
	}

	&:not(.active):hover {
		color: var(--MI_THEME-fgHighlighted);
		background: var(--MI-c-hover);
	}

	> .icon {
		margin-right: 6px;
	}
}

@container (max-width: 500px) {
	.tabsRoot {
		font-size: 85%;
	}
}
</style>

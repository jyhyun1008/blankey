<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<button
	class="_button"
	:class="[$style.root, { [$style.wait]: wait, [$style.active]: isFollowing, [$style.full]: full }]"
	:disabled="wait"
	@click="onClick"
>
	<template v-if="!wait">
		<template v-if="isFollowing">
			<span v-if="full" :class="$style.text">{{ i18n.ts.unfollow }}</span><i class="ti ti-minus"></i>
		</template>
		<template v-else>
			<span v-if="full" :class="$style.text">{{ i18n.ts.follow }}</span><i class="ti ti-plus"></i>
		</template>
	</template>
	<template v-else>
		<span v-if="full" :class="$style.text">{{ i18n.ts.processing }}</span><MkLoading :em="true"/>
	</template>
</button>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import * as Misskey from 'misskey-js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { i18n } from '@/i18n.js';

const props = withDefaults(defineProps<{
	channel: Misskey.entities.Channel;
	full?: boolean;
}>(), {
	full: false,
});

const isFollowing = ref(props.channel.isFollowing);
const wait = ref(false);

async function onClick() {
	wait.value = true;

	try {
		if (isFollowing.value) {
			await misskeyApi('channels/unfollow', {
				channelId: props.channel.id,
			});
			isFollowing.value = false;
		} else {
			await misskeyApi('channels/follow', {
				channelId: props.channel.id,
			});
			isFollowing.value = true;
		}
	} catch (err) {
		console.error(err);
	} finally {
		wait.value = false;
	}
}
</script>

<style lang="scss" module>
.root {
	position: relative;
	display: inline-block;
	font-weight: bold;
	color: var(--MI-c-accentInk);
	background: var(--MI_THEME-panel);
	border: solid 1px color(from var(--MI_THEME-accent) srgb r g b / 0.5);
	padding: 0;
	height: var(--MI-controlHeightSm);
	font-size: 16px;
	border-radius: var(--MI-radius-full);
	transition:
		background var(--MI-duration-fast) var(--MI-ease),
		border-color var(--MI-duration-fast) var(--MI-ease),
		transform var(--MI-duration) var(--MI-easeSpring);

	&.full {
		padding: 0 10px 0 14px;
		font-size: 14px;
	}

	&:not(.full) {
		width: var(--MI-controlHeightSm);
	}

	&:focus-visible {
		outline-offset: 2px;
	}

	&:not(:disabled):hover {
		background: var(--MI-c-accentSoft);
		border-color: var(--MI_THEME-accent);
	}

	&:not(:disabled):active {
		background: var(--MI-c-accentSoftHover);
		transform: scale(0.97);
	}

	&.active {
		color: var(--MI-c-fgOnAccent);
		background: var(--MI_THEME-accent);
		border-color: var(--MI_THEME-accent);

		&:not(:disabled):hover {
			background: var(--MI-c-accentHover);
			border-color: var(--MI-c-accentHover);
		}

		&:not(:disabled):active {
			background: var(--MI-c-accentPressed);
			border-color: var(--MI-c-accentPressed);
		}
	}

	&.wait {
		cursor: wait !important;
		opacity: 0.7;
	}
}

@media (prefers-reduced-motion: reduce) {
	.root:not(:disabled):active {
		transform: none;
	}
}

.text {
	margin-right: 6px;
}
</style>

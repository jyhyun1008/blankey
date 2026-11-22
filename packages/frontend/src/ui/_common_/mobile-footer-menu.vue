<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div ref="rootEl" :class="$style.root">
	<button :class="$style.item" class="_button" @click="drawerMenuShowing = true">
		<div :class="$style.itemInner">
			<i :class="$style.itemIcon" class="ti ti-menu-2"></i><span v-if="menuIndicated" :class="$style.itemIndicator" class="_blink"><i class="_indicatorCircle"></i></span>
		</div>
	</button>

	<button :class="$style.item" class="_button" :aria-label="i18n.ts.home" @click="mainRouter.push('/')">
		<div :class="$style.itemInner">
			<i :class="$style.itemIcon" class="ti ti-home"></i>
		</div>
	</button>

	<button :class="$style.item" class="_button" @click="mainRouter.push('/my/notifications')">
		<div :class="$style.itemInner">
			<i :class="$style.itemIcon" class="ti ti-bell"></i>
			<span v-if="$i?.hasUnreadNotification" :class="$style.itemIndicator" class="_blink">
				<span class="_indicateCounter" :class="$style.itemIndicateValueIcon">{{ $i.unreadNotificationsCount > 99 ? '99+' : $i.unreadNotificationsCount }}</span>
			</span>
		</div>
	</button>

	<button :class="[$style.item, $style.post]" class="_button" @click="os.post()">
		<div :class="$style.itemInner">
			<i :class="$style.itemIcon" class="ti ti-pencil"></i>
		</div>
	</button>
</div>
</template>

<script lang="ts" setup>
import { computed, ref, useTemplateRef, watch } from 'vue';
import { i18n } from '@/i18n.js';
import { $i } from '@/i.js';
import * as os from '@/os.js';
import { mainRouter } from '@/router.js';
import { navbarItemDef } from '@/navbar.js';

const drawerMenuShowing = defineModel<boolean>('drawerMenuShowing');

const rootEl = useTemplateRef('rootEl');

const menuIndicated = computed(() => {
	for (const def in navbarItemDef) {
		if (def === 'notifications') continue; // 通知は下にボタンとして表示されてるから
		if (navbarItemDef[def].indicated) return true;
	}
	return false;
});

const rootElHeight = ref(0);

watch(rootEl, () => {
	if (rootEl.value) {
		rootElHeight.value = rootEl.value.offsetHeight;
		window.document.body.style.setProperty('--MI-minBottomSpacing', 'var(--MI-minBottomSpacingMobile)');
	} else {
		rootElHeight.value = 0;
		window.document.body.style.setProperty('--MI-minBottomSpacing', '0px');
	}
}, {
	immediate: true,
});
</script>

<style lang="scss" module>
.root {
	position: relative;
	z-index: 1;
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	margin: 0 10px max(10px, env(safe-area-inset-bottom, 0px));
	padding: 6px;
	box-sizing: border-box;
	background: var(--MI_THEME-navBg);
	color: var(--MI_THEME-navFg);
	border-radius: var(--MI-radius-xl);
	box-shadow: var(--MI-shadow-pop);
}

.item {
	padding: 2px 0;

	&.post {
		.itemInner {
			color: var(--MI-c-fgOnAccent);
			background: linear-gradient(90deg, var(--MI_THEME-buttonGradateA), var(--MI_THEME-buttonGradateB));
			box-shadow: 0 6px 14px -6px color(from var(--MI_THEME-accent) srgb r g b / 0.6);

			&:hover {
				background: linear-gradient(90deg, var(--MI_THEME-buttonGradateA), var(--MI_THEME-buttonGradateB));
				filter: brightness(1.05);
			}
		}
	}
}

.itemInner {
	position: relative;
	display: grid;
	place-items: center;
	width: 100%;
	max-width: 52px;
	height: 44px;
	margin: auto;
	border-radius: var(--MI-radius-md);
	transition:
		background var(--MI-duration-fast) var(--MI-ease),
		transform var(--MI-duration) var(--MI-easeSpring);

	&:hover {
		background: var(--MI-c-hover);
	}

	&:active {
		background: var(--MI-c-pressed);
		transform: scale(0.94);
	}
}

.itemIcon {
	font-size: 18px;
}

.itemIndicator {
	position: absolute;
	top: 2px;
	right: 6px;
	color: var(--MI_THEME-indicator);
	font-size: 10px;
	pointer-events: none;

	&:has(.itemIndicateValueIcon) {
		animation: none;
		font-size: 8px;
	}
}

@media (prefers-reduced-motion: reduce) {
	.itemInner:active {
		transform: none;
	}
}
</style>

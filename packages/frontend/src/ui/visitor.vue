<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<a v-if="isWelcome" href="https://github.com/misskey-dev/misskey" target="_blank" class="github-corner" aria-label="View source on GitHub"><svg width="80" height="80" viewBox="0 0 250 250" style="fill:var(--MI_THEME-panel); color:var(--MI_THEME-fg); position: fixed; z-index: 10; top: 0; border: 0; right: 0;" aria-hidden="true"><path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path><path d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2" fill="currentColor" style="transform-origin: 130px 106px;" class="octo-arm"></path><path d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z" fill="currentColor" class="octo-body"></path></svg></a>

	<nav v-if="showSide" :class="$style.side" :aria-label="i18n.ts.menu">
		<button v-tooltip.noDelay.right="instanceName" class="_button" :class="$style.brand" :aria-label="instanceName" @click="openInstanceMenu">
			<img :src="instance.iconUrl || '/favicon.ico'" alt="" :class="$style.brandIcon"/>
		</button>
		<div :class="$style.sideMiddle">
			<MkA v-for="item in navItems" :key="item.to" :to="item.to" :class="$style.item" :activeClass="$style.active" :exact="item.to === '/'">
				<i :class="[item.icon, $style.itemIcon]" class="ti-fw" aria-hidden="true"></i><span>{{ item.label }}</span>
			</MkA>
		</div>
		<div :class="$style.sideBottom">
			<button class="_button" :class="$style.signin" data-testid="visitor-signin" @click="openSigninDialog">
				<i class="ti ti-login-2 ti-fw" :class="$style.itemIcon" aria-hidden="true"></i><span>{{ i18n.ts.login }}</span>
			</button>
			<button class="_button" :class="$style.signup" data-testid="visitor-signup" @click="openSignupDialog">
				<i class="ti ti-user-plus ti-fw" :class="$style.itemIcon" aria-hidden="true"></i><span>{{ i18n.ts.signup }}</span>
			</button>
		</div>
	</nav>

	<div :class="[$style.main, { [$style.inset]: showSide }]">
		<div v-if="narrow && !isWelcome" :class="$style.header">
			<button v-tooltip.noDelay.right="instanceName" class="_button" :class="$style.brand" :aria-label="instanceName" @click="openInstanceMenu">
				<img :src="instance.iconUrl || '/favicon.ico'" alt="" :class="$style.brandIcon"/>
			</button>
			<MkButton small rounded :class="$style.headerButton" @click="openSigninDialog">{{ i18n.ts.login }}</MkButton>
			<MkButton small primary rounded @click="openSignupDialog">{{ i18n.ts.signup }}</MkButton>
		</div>
		<div :class="$style.content">
			<RouterView/>
		</div>
	</div>
</div>
<XCommon/>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, provide, ref, computed } from 'vue';
import { instanceName } from '@@/js/config.js';
import XCommon from './_common_/common.vue';
import type { PageMetadata } from '@/page.js';
import { instance } from '@/instance.js';
import { provideMetadataReceiver, provideReactiveMetadata } from '@/page.js';
import { i18n } from '@/i18n.js';
import { mainRouter } from '@/router.js';
import { DI } from '@/di.js';
import MkButton from '@/components/MkButton.vue';
import { openInstanceMenu, openSigninDialog, openSignupDialog } from '@/ui/_common_/common.js';

const isRoot = computed(() => mainRouter.currentRoute.value.name === 'index');

const isWelcome = computed(() => mainRouter.currentRoute.value.path === '/welcome');

// ログイン時のサイドバー (navbar.vue) と同じ見た目の簡易ナビ
const navItems = [
	{ to: '/', label: i18n.ts.home, icon: 'ti ti-home' },
	{ to: '/explore', label: i18n.ts.explore, icon: 'ti ti-hash' },
	{ to: '/pages', label: i18n.ts.contentHub, icon: 'ti ti-layout-grid' },
	{ to: '/announcements', label: i18n.ts.announcements, icon: 'ti ti-speakerphone' },
];

const NARROW_THRESHOLD = 900;

const pageMetadata = ref<null | PageMetadata>(null);

provide(DI.router, mainRouter);
provideMetadataReceiver((metadataGetter) => {
	const info = metadataGetter();
	pageMetadata.value = info;
	if (pageMetadata.value) {
		if (isRoot.value && pageMetadata.value.title === instanceName) {
			window.document.title = pageMetadata.value.title;
		} else {
			window.document.title = `${pageMetadata.value.title} | ${instanceName}`;
		}
	}
});
provideReactiveMetadata(pageMetadata);

const narrow = ref(window.innerWidth < NARROW_THRESHOLD);
const showSide = computed(() => !narrow.value && !isWelcome.value);

function onResize() {
	narrow.value = window.innerWidth < NARROW_THRESHOLD;
}

onMounted(() => {
	window.addEventListener('resize', onResize, { passive: true });
});

onUnmounted(() => {
	window.removeEventListener('resize', onResize);
});
</script>

<style>
.github-corner:hover .octo-arm{animation:octocat-wave 560ms ease-in-out}@keyframes octocat-wave{0%,100%{transform:rotate(0)}20%,60%{transform:rotate(-25deg)}40%,80%{transform:rotate(10deg)}}@media (max-width:500px){.github-corner:hover .octo-arm{animation:none}.github-corner .octo-arm{animation:octocat-wave 560ms ease-in-out}}
</style>

<style lang="scss" module>
.root {
	display: flex;
	height: 100dvh;
	overflow: clip;
	background: var(--MI-c-shell);
}

// サイドバー: navbar.vue のフル表示と同じ寸法・配色
.side {
	display: flex;
	flex-direction: column;
	flex: 0 0 250px;
	box-sizing: border-box;
	overflow: auto;
	background: var(--MI-c-shell);
}

.brand {
	display: flex;
	align-items: center;
	gap: 10px;
	min-width: 0;
	text-align: left;
	font-weight: bold;

	&:hover {
		text-decoration: none;
	}
}

.side > .brand {
	// ログイン時のサイドバー (navbar.vue) と同じ位置・大きさ: 高さ 72px、左 20px にアイコンだけ
	align-self: flex-start;
	height: 72px;
	padding: 0 20px;
	flex-shrink: 0;
}

.brandIcon {
	flex-shrink: 0;
	width: 36px;
	aspect-ratio: 1;
	border-radius: var(--MI-radius-sm);
}

.sideMiddle {
	flex: 1;
	padding: 0 12px;
}

.item {
	display: flex;
	align-items: center;
	gap: 12px;
	margin: 2px 0;
	padding: 0 12px;
	height: 40px;
	box-sizing: border-box;
	color: var(--MI_THEME-navFg);
	border-radius: var(--MI-radius-md);
	white-space: nowrap;
	transition:
		background var(--MI-duration-fast) var(--MI-ease),
		color var(--MI-duration-fast) var(--MI-ease);

	&:hover {
		text-decoration: none;
		color: var(--MI_THEME-fgHighlighted);
		background: var(--MI-c-hover);
	}

	&.active {
		font-weight: bold;
		color: var(--MI-c-accentInk);
		background: var(--MI-c-accentSoft);
	}
}

.itemIcon {
	flex-shrink: 0;
	width: 20px;
	font-size: 1.1em;
}

.sideBottom {
	position: sticky;
	bottom: 0;
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 16px 12px 12px;
	background: var(--MI-c-shell);
}

.signin,
.signup {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 0 12px;
	height: 44px;
	box-sizing: border-box;
	font-weight: bold;
	border-radius: var(--MI-radius-full);
	transition:
		transform var(--MI-duration) var(--MI-easeSpring),
		background var(--MI-duration-fast) var(--MI-ease),
		filter var(--MI-duration-fast) var(--MI-ease);

	&:active {
		transform: scale(0.97);
	}

	&:focus-visible {
		outline: 2px solid var(--MI_THEME-focus);
		outline-offset: 2px;
	}
}

.signin {
	color: var(--MI-c-fgOnAccent);
	background: linear-gradient(90deg, var(--MI_THEME-buttonGradateA), var(--MI_THEME-buttonGradateB));

	&:hover {
		filter: brightness(1.05);
	}
}

.signup {
	color: var(--MI_THEME-fg);
	background: var(--MI_THEME-panel);
	box-shadow: 0 0 0 1px var(--MI-c-border);

	&:hover {
		background: var(--MI-c-hover);
	}
}

.main {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
	background: var(--MI_THEME-bg);
}

// universal.vue の本文パネルと同じ浮いた面
.inset {
	// サイドバー下部 (sticky) が枠線の上に重ならないよう、こちらを前面にする
	position: relative;
	margin: 10px 10px 10px 0;
	border-radius: var(--MI-radius-xl);
	box-shadow: 0 0 0 1px var(--MI-c-border);
	overflow: clip;
}

.header {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 16px;
	border-bottom: 1px solid var(--MI-c-border);
	background: var(--MI_THEME-bg);
}

.header .brandIcon {
	width: 32px;
}

.headerButton {
	margin-left: auto;
}

.content {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
}
</style>

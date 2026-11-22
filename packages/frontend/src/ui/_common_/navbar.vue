<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="[$style.root, { [$style.iconOnly]: iconOnly }]">
	<div :class="$style.body">
		<div :class="$style.top">
			<button v-tooltip.noDelay.right="instance.name ?? i18n.ts.instance" class="_button" :class="$style.instance" @click="openInstanceMenu">
				<img :src="instance.iconUrl || '/favicon.ico'" alt="" :class="$style.instanceIcon" style="view-transition-name: navbar-serverIcon;"/>
			</button>
			<button v-if="!iconOnly" v-tooltip.noDelay.right="i18n.ts.realtimeMode" class="_button" :class="[$style.realtimeMode, store.r.realtimeMode.value ? $style.on : null]" @click="toggleRealtimeMode">
				<i v-if="store.r.realtimeMode.value" class="ti ti-bolt ti-fw"></i>
				<i v-else class="ti ti-bolt-off ti-fw"></i>
			</button>
		</div>
		<div :class="$style.middle">
			<MkA v-tooltip.noDelay.right="i18n.ts.home" :class="$style.item" :activeClass="$style.active" to="/" exact>
				<i :class="$style.itemIcon" class="ti ti-home ti-fw" style="view-transition-name: navbar-homeIcon;"></i><span :class="$style.itemText">{{ i18n.ts.home }}</span>
			</MkA>
			<MkA v-tooltip.noDelay.right="i18n.ts.timeline" :class="$style.item" :activeClass="$style.active" to="/timeline" exact>
				<i :class="$style.itemIcon" class="ti ti-message-circle ti-fw"></i><span :class="$style.itemText">{{ i18n.ts.timeline }}</span>
			</MkA>
			<template v-for="item in menu" :key="item === '-' ? undefined : item">
				<div v-if="item === '-'" :class="$style.divider"></div>
				<component
					:is="navbarItemDef[item].to ? 'MkA' : 'button'"
					v-else-if="navbarItemDef[item] && (navbarItemDef[item].show == null || navbarItemDef[item].show.value !== false)"
					v-tooltip.noDelay.right="navbarItemDef[item].title"
					class="_button"
					:class="[$style.item]"
					:activeClass="$style.active"
					:to="navbarItemDef[item].to"
					v-on="navbarItemDef[item].action ? { click: navbarItemDef[item].action } : {}"
				>
					<i class="ti-fw" :class="[$style.itemIcon, navbarItemDef[item].icon]" :style="{ viewTransitionName: 'navbar-item-' + item }"></i><span :class="$style.itemText">{{ navbarItemDef[item].title }}</span>
					<span v-if="navbarItemDef[item].indicated" :class="$style.itemIndicator" class="_blink">
						<span v-if="navbarItemDef[item].indicateValue" class="_indicateCounter" :class="$style.itemIndicateValueIcon">{{ navbarItemDef[item].indicateValue }}</span>
						<i v-else class="_indicatorCircle"></i>
					</span>
				</component>
			</template>
			<div :class="$style.divider"></div>
			<MkA v-if="$i != null && ($i.isAdmin || $i.isModerator)" v-tooltip.noDelay.right="i18n.ts.controlPanel" :class="$style.item" :activeClass="$style.active" to="/admin">
				<i :class="$style.itemIcon" class="ti ti-dashboard ti-fw" style="view-transition-name: navbar-controlPanel;"></i><span :class="$style.itemText">{{ i18n.ts.controlPanel }}</span>
			</MkA>
			<button class="_button" :class="$style.item" @click="more">
				<i :class="$style.itemIcon" class="ti ti-grid-dots ti-fw" style="view-transition-name: navbar-more;"></i><span :class="$style.itemText">{{ i18n.ts.more }}</span>
				<span v-if="otherMenuItemIndicated" :class="$style.itemIndicator" class="_blink"><i class="_indicatorCircle"></i></span>
			</button>
			<template v-if="$i">
				<MkA
					v-for="item in visibleFixedSidebarItems"
					:key="item"
					v-tooltip.noDelay.right="navbarItemDef[item].title"
					:class="$style.item"
					:activeClass="$style.active"
					:to="navbarItemDef[item].to!"
				>
					<i class="ti-fw" :class="[$style.itemIcon, navbarItemDef[item].icon]" :style="{ viewTransitionName: 'navbar-item-' + item }"></i><span :class="$style.itemText">{{ navbarItemDef[item].title }}</span>
					<span v-if="navbarItemDef[item].indicated" :class="$style.itemIndicator" class="_blink"><i class="_indicatorCircle"></i></span>
				</MkA>
			</template>
			<MkA v-tooltip.noDelay.right="i18n.ts.settings" :class="$style.item" :activeClass="$style.active" to="/settings">
				<i :class="$style.itemIcon" class="ti ti-settings ti-fw" style="view-transition-name: navbar-settings;"></i><span :class="$style.itemText">{{ i18n.ts.settings }}</span>
			</MkA>
		</div>
		<div :class="$style.bottom">
			<div v-if="!forceIconOnly && prefer.r.showNavbarSubButtons.value" :class="$style.subButtons">
				<button v-tooltip.noDelay.right="i18n.ts.navbar" class="_button" :class="$style.subButton" :aria-label="i18n.ts.navbar" @click="menuEdit"><i class="ti ti-settings-2"></i></button>
				<button v-if="!props.asDrawer" v-tooltip.noDelay.right="iconOnly ? i18n.ts._menuDisplay.sideFull : i18n.ts._menuDisplay.sideIcon" class="_button" :class="$style.subButton" :aria-label="iconOnly ? i18n.ts._menuDisplay.sideFull : i18n.ts._menuDisplay.sideIcon" @click="toggleIconOnly"><i v-if="iconOnly" class="ti ti-layout-sidebar-left-expand"></i><i v-else class="ti ti-layout-sidebar-left-collapse"></i></button>
			</div>
			<button v-if="iconOnly" v-tooltip.noDelay.right="i18n.ts.realtimeMode" class="_button" :class="[$style.realtimeMode, store.r.realtimeMode.value ? $style.on : null]" @click="toggleRealtimeMode">
				<i v-if="store.r.realtimeMode.value" class="ti ti-bolt ti-fw"></i>
				<i v-else class="ti ti-bolt-off ti-fw"></i>
			</button>
			<button v-tooltip.noDelay.right="i18n.ts.note" class="_button" :class="[$style.post]" data-testid="open-post-form" @click="() => { os.post(); }">
				<i class="ti ti-pencil ti-fw" :class="$style.postIcon"></i><span :class="$style.postText">{{ i18n.ts.note }}</span>
			</button>
			<button v-if="$i != null" v-tooltip.noDelay.right="`${i18n.ts.account}: @${$i.username}`" class="_button" :class="[$style.account]" @click="openAccountMenu">
				<MkAvatar :user="$i" :class="$style.avatar" style="view-transition-name: navbar-avatar;"/><MkAcct class="_nowrap" :class="$style.acct" :user="$i"/>
			</button>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, ref, watch } from 'vue';
import { openInstanceMenu } from './common.js';
import * as os from '@/os.js';
import { fixedSidebarItems, getCoveredMenuItems, navbarItemDef } from '@/navbar.js';
import { store } from '@/store.js';
import { i18n } from '@/i18n.js';
import { instance } from '@/instance.js';
import { getHTMLElementOrNull } from '@/utility/get-dom-node-or-null.js';
import { useRouter } from '@/router.js';
import { prefer } from '@/preferences.js';
import { getAccountMenu } from '@/accounts.js';
import { $i } from '@/i.js';

const router = useRouter();

const props = defineProps<{
	asDrawer?: boolean;
}>();

const forceIconOnly = ref(!props.asDrawer && window.innerWidth <= 1279);
const iconOnly = computed(() => {
	return !props.asDrawer && (forceIconOnly.value || (store.r.menuDisplay.value === 'sideIcon'));
});
const menu = computed(() => prefer.r.menu.value.filter(item => !fixedSidebarItems.includes(item)));
const visibleFixedSidebarItems = computed(() => fixedSidebarItems.filter(item => navbarItemDef[item].show?.value !== false));

const otherMenuItemIndicated = computed(() => {
	const covered = getCoveredMenuItems(prefer.r.menu.value);
	for (const def in navbarItemDef) {
		if (prefer.r.menu.value.includes(def) || fixedSidebarItems.includes(def) || covered.includes(def)) continue;
		if (navbarItemDef[def].indicated) return true;
	}
	return false;
});

function calcViewState() {
	forceIconOnly.value = window.innerWidth <= 1279;
}

window.addEventListener('resize', calcViewState);

watch(store.r.menuDisplay, () => {
	calcViewState();
});

function toggleIconOnly() {
	if (window.document.startViewTransition && prefer.s.animation) {
		window.document.startViewTransition(() => {
			store.set('menuDisplay', iconOnly.value ? 'sideFull' : 'sideIcon');
		});
	} else {
		store.set('menuDisplay', iconOnly.value ? 'sideFull' : 'sideIcon');
	}
}

function toggleRealtimeMode(ev: PointerEvent) {
	os.popupMenu([{
		type: 'label',
		text: i18n.ts.realtimeMode,
	}, {
		text: store.s.realtimeMode ? i18n.ts.turnItOff : i18n.ts.turnItOn,
		icon: store.s.realtimeMode ? 'ti ti-bolt-off' : 'ti ti-bolt',
		action: () => {
			store.set('realtimeMode', !store.s.realtimeMode);
			window.location.reload();
		},
	}], ev.currentTarget ?? ev.target);
}

async function openAccountMenu(ev: PointerEvent) {
	const menuItems = await getAccountMenu({
		withExtraOperation: true,
	});

	os.popupMenu(menuItems, ev.currentTarget ?? ev.target);
}

async function more(ev: PointerEvent) {
	const target = getHTMLElementOrNull(ev.currentTarget ?? ev.target);
	if (!target) return;
	const { dispose } = await os.popupAsyncWithDialog(import('@/components/MkLaunchPad.vue').then(x => x.default), {
		anchorElement: target,
		excludeItems: [...fixedSidebarItems, ...getCoveredMenuItems(prefer.s.menu)],
	}, {
		closed: () => dispose(),
	});
}

function menuEdit() {
	router.push('/settings/navbar');
}
</script>

<style lang="scss" module>
.root {
	--nav-width: 250px;
	--nav-icon-only-width: 80px;
	--nav-bg-transparent: color(from var(--MI-c-shell) srgb r g b / 0.5);

	flex: 0 0 var(--nav-width);
	width: var(--nav-width);
	box-sizing: border-box;
}

.body {
	position: relative;
	width: var(--nav-icon-only-width);
	height: 100%;
	box-sizing: border-box;
	overflow: auto;
	overflow-x: clip;
	overscroll-behavior: contain;
	background: var(--MI-c-shell);
	contain: strict;

	/* 画面が縦に長い、設置している項目数が少ないなどの環境においても確実にbottomを最下部に表示するため */
	display: flex;
	flex-direction: column;

	direction: rtl; /* スクロールバーを左に表示したいため */
}

.top {
	flex-shrink: 0;
	direction: ltr;

	/* 疑似progressive blur */
	&::before {
		position: absolute;
		z-index: -1;
		inset: 0;
		content: "";
		backdrop-filter: blur(8px);
		mask-image: linear-gradient(
			to top,
			rgb(0 0 0 / 0%) 0%,
			rgb(0 0 0 / 4.9%) 7.75%,
			rgb(0 0 0 / 10.4%) 11.25%,
			rgb(0 0 0 / 45%) 23.55%,
			rgb(0 0 0 / 55%) 26.45%,
			rgb(0 0 0 / 89.6%) 38.75%,
			rgb(0 0 0 / 95.1%) 42.25%,
			rgb(0 0 0 / 100%) 50%
		);
	}

	&::after {
		position: absolute;
		z-index: -1;
		inset: 0;
		bottom: 25%;
		content: "";
		backdrop-filter: blur(16px);
		mask-image: linear-gradient(
			to top,
			rgb(0 0 0 / 0%) 0%,
			rgb(0 0 0 / 4.9%) 15.5%,
			rgb(0 0 0 / 10.4%) 22.5%,
			rgb(0 0 0 / 45%) 47.1%,
			rgb(0 0 0 / 55%) 52.9%,
			rgb(0 0 0 / 89.6%) 77.5%,
			rgb(0 0 0 / 95.1%) 91.9%,
			rgb(0 0 0 / 100%) 100%
		);
	}
}

.middle {
	flex: 1;
	direction: ltr;
}

.bottom {
	flex-shrink: 0;
	direction: ltr;

	/* 疑似progressive blur */
	&::before {
		position: absolute;
		z-index: -1;
		inset: -30px 0 0 0;
		content: "";
		backdrop-filter: blur(8px);
		mask-image: linear-gradient(
			to bottom,
			rgb(0 0 0 / 0%) 0%,
			rgb(0 0 0 / 4.9%) 7.75%,
			rgb(0 0 0 / 10.4%) 11.25%,
			rgb(0 0 0 / 45%) 23.55%,
			rgb(0 0 0 / 55%) 26.45%,
			rgb(0 0 0 / 89.6%) 38.75%,
			rgb(0 0 0 / 95.1%) 42.25%,
			rgb(0 0 0 / 100%) 50%
		);
		pointer-events: none;
	}

	&::after {
		position: absolute;
		z-index: -1;
		inset: 0;
		top: 25%;
		content: "";
		backdrop-filter: blur(16px);
		mask-image: linear-gradient(
			to bottom,
			rgb(0 0 0 / 0%) 0%,
			rgb(0 0 0 / 4.9%) 15.5%,
			rgb(0 0 0 / 10.4%) 22.5%,
			rgb(0 0 0 / 45%) 47.1%,
			rgb(0 0 0 / 55%) 52.9%,
			rgb(0 0 0 / 89.6%) 77.5%,
			rgb(0 0 0 / 95.1%) 91.9%,
			rgb(0 0 0 / 100%) 100%
		);
	}
}

.subButtons {
	display: flex;
	justify-content: flex-end;
	gap: 4px;
}

.subButton {
	display: grid;
	place-items: center;
	width: 32px;
	height: 32px;
	border-radius: var(--MI-radius-md);
	color: var(--MI-c-fgSubtle);
	transition:
		background var(--MI-duration-fast) var(--MI-ease),
		color var(--MI-duration-fast) var(--MI-ease);

	&:hover {
		color: var(--MI_THEME-fgHighlighted);
		background: var(--MI-c-hover);
	}
}

.realtimeMode {
	border-radius: var(--MI-radius-md);
	color: var(--MI-c-fgSubtle);
	transition:
		background var(--MI-duration-fast) var(--MI-ease),
		color var(--MI-duration-fast) var(--MI-ease);

	&:hover {
		color: var(--MI_THEME-fgHighlighted);
		background: var(--MI-c-hover);
	}

	&.on {
		color: var(--MI-c-accentInk);
	}
}

.item {
	position: relative;
	box-sizing: border-box;
	color: var(--MI_THEME-navFg);
	border-radius: var(--MI-radius-md);
	transition:
		background var(--MI-duration-fast) var(--MI-ease),
		color var(--MI-duration-fast) var(--MI-ease);

	&:hover {
		text-decoration: none;
		color: var(--MI_THEME-fgHighlighted);
		background: var(--MI-c-hover);

		.itemIcon {
			transform: translateY(-1px) rotate(-8deg) scale(1.1);
		}
	}

	&.active {
		font-weight: bold;
		color: var(--MI-c-accentInk);
		background: var(--MI-c-accentSoft);
	}

	&:focus-visible {
		outline: 2px solid var(--MI_THEME-focus);
		outline-offset: -2px;
	}
}

.itemIcon {
	position: relative;
	transition: transform var(--MI-duration-slow) var(--MI-easeSpring);
}

.itemIndicator {
	position: absolute;
	color: var(--MI_THEME-navIndicator);
	font-size: 8px;
}

.post {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	box-sizing: border-box;
	color: var(--MI-c-fgOnAccent);
	font-weight: bold;
	border-radius: var(--MI-radius-full);
	background: linear-gradient(90deg, var(--MI_THEME-buttonGradateA), var(--MI_THEME-buttonGradateB));
	box-shadow: 0 6px 16px -6px color(from var(--MI_THEME-accent) srgb r g b / 0.6);
	transition:
		transform var(--MI-duration) var(--MI-easeSpring),
		box-shadow var(--MI-duration) var(--MI-ease),
		filter var(--MI-duration-fast) var(--MI-ease);

	&:hover {
		transform: translateY(-1px);
		filter: brightness(1.05);
		box-shadow: 0 10px 22px -8px color(from var(--MI_THEME-accent) srgb r g b / 0.7);

		.postIcon {
			transform: rotate(-12deg);
		}
	}

	&:active {
		transform: scale(0.97);
	}

	&:focus-visible {
		outline: 2px solid var(--MI_THEME-focus);
		outline-offset: 2px;
	}
}

.postIcon {
	position: relative;
	transition: transform var(--MI-duration-slow) var(--MI-easeSpring);
}

.account {
	position: relative;
	box-sizing: border-box;
	border-radius: var(--MI-radius-md);
	overflow: clip;
	transition: background var(--MI-duration-fast) var(--MI-ease);

	&:hover {
		background: var(--MI-c-hover);
	}

	&:focus-visible {
		outline: none;

		> .avatar {
			box-shadow: var(--MI-focusRing);
		}
	}
}

.divider {
	border-top: solid 1px var(--MI-c-border);
}

.root:not(.iconOnly) {
	.body {
		width: var(--nav-width);
	}

	.top {
		--top-height: 72px;

		position: sticky;
		top: 0;
		z-index: 1;
		display: flex;
		align-items: center;
		height: var(--top-height);
		padding: 0 14px 0 20px;
		box-sizing: border-box;
	}

	// ログアウト時のサイドバー (visitor.vue) と同じ: サーバーアイコンだけ、押すとサーバーメニュー
	.instance {
		position: relative;
	}

	.instanceIcon {
		display: block;
		flex-shrink: 0;
		width: 36px;
		aspect-ratio: 1;
		border-radius: var(--MI-radius-sm);
	}

	.realtimeMode {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		margin-left: auto;
	}

	.middle {
		padding: 0 12px;
	}

	.bottom {
		position: sticky;
		bottom: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 16px 12px 12px;
	}

	// アイコンと文字の位置をメニュー項目 (.item) に揃える
	.post {
		justify-content: flex-start;
		gap: 12px;
		padding: 0 12px;
		width: 100%;
		height: 44px;
	}

	.postIcon {
		flex-shrink: 0;
		width: 20px;
		font-size: 1.1em;
	}

	.account {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px;
		width: 100%;
		text-align: left;
	}

	.avatar {
		display: block;
		flex-shrink: 0;
		position: relative;
		width: 32px;
		aspect-ratio: 1;
	}

	.acct {
		display: block;
		flex-shrink: 1;
		min-width: 0;
	}

	.divider {
		margin: 10px 12px;
	}

	.item {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 2px 0;
		padding: 0 12px;
		height: 40px;
		width: 100%;
		text-align: left;
		white-space: nowrap;
		overflow: hidden;
	}

	.itemIcon {
		flex-shrink: 0;
		width: 20px;
		font-size: 1.1em;
	}

	.itemIndicator {
		top: 6px;
		left: 26px;

		&:has(.itemIndicateValueIcon) {
			animation: none;
			top: auto;
			left: auto;
			right: 10px;
			font-size: 10px;
		}
	}

	.itemText {
		position: relative;
		font-size: 0.95em;
		text-overflow: ellipsis;
		overflow: hidden;
	}
}

.root.iconOnly {
	flex: 0 0 var(--nav-icon-only-width);
	width: var(--nav-icon-only-width);

	.body {
		width: var(--nav-icon-only-width);
	}

	.top {
		position: sticky;
		top: 0;
		z-index: 1;
		padding: 20px 0 12px;
	}

	.instance {
		display: block;
		text-align: center;
		width: 100%;

		&:focus-visible {
			outline: none;

			> .instanceIcon {
				outline: 2px solid var(--MI_THEME-focus);
				outline-offset: 2px;
			}
		}
	}

	.instanceIcon {
		display: inline-block;
		width: 36px;
		aspect-ratio: 1;
		border-radius: var(--MI-radius-sm);
	}

	.bottom {
		position: sticky;
		bottom: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 16px 0 12px;
	}

	.subButtons {
		flex-direction: column;
		align-items: center;
	}

	.realtimeMode {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
	}

	.post {
		width: 48px;
		height: 48px;
	}

	.postText {
		display: none;
	}

	.account {
		display: grid;
		place-items: center;
		padding: 6px;
	}

	.avatar {
		display: block;
		width: 36px;
		aspect-ratio: 1;
	}

	.acct {
		display: none;
	}

	.divider {
		margin: 8px auto;
		width: 32px;
	}

	.item {
		display: grid;
		place-items: center;
		margin: 4px auto;
		width: 48px;
		height: 44px;
	}

	.itemIcon {
		font-size: 1.15em;
	}

	.itemText {
		display: none;
	}

	.itemIndicator {
		top: 4px;
		left: 28px;

		&:has(.itemIndicateValueIcon) {
			animation: none;
			left: auto;
			right: 2px;
			font-size: 10px;
		}
	}
}

@media (prefers-reduced-motion: reduce) {
	.item:hover .itemIcon,
	.post:hover .postIcon {
		transform: none;
	}

	.post:hover,
	.post:active {
		transform: none;
	}
}
</style>

<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :overridePageMetadata="profileMetadata" :hideTitle="!profileMetadata" :tabs="profileTabs" tab="pages" :swipable="false">
	<div class="_spacer _profileContent">
		<Transition
			:enterActiveClass="prefer.s.animation ? articleStyle.fadeEnterActive : ''"
			:leaveActiveClass="prefer.s.animation ? articleStyle.fadeLeaveActive : ''"
			:enterFromClass="prefer.s.animation ? articleStyle.fadeEnterFrom : ''"
			:leaveToClass="prefer.s.animation ? articleStyle.fadeLeaveTo : ''"
			mode="out-in"
		>
			<div v-if="page" :key="page.id" class="_gaps">
				<article :class="[articleStyle.article, $style.article]">
					<header :class="[$style.hero, { [$style.hasCover]: cover }]">
						<div v-if="cover" :class="$style.heroMedia">
							<MkMediaImage :image="cover" raw cover disableImageLink :controls="cover.isSensitive" :class="$style.heroImage"/>
						</div>
						<div :class="$style.heroBody">
							<ul v-if="tags.length" :class="$style.tags" :aria-label="i18n.ts.hashtags">
								<li v-for="tag in tags" :key="tag"><MkA :to="`/tags/${encodeURIComponent(tag)}`" :class="$style.tag">#{{ tag }}</MkA></li>
							</ul>
							<h1 :class="$style.title">{{ page.title || page.name }}</h1>
							<p v-if="page.summary && !page.supportersOnlyLocked" :class="$style.summary">{{ page.summary }}</p>
							<div :class="$style.byline">
								<MkAvatar :user="page.user" :class="$style.bylineAvatar" link preview/>
								<MkA :to="`/@${username}`" :class="$style.bylineName"><MkUserName :user="page.user" :nowrap="true"/></MkA>
								<span aria-hidden="true">·</span>
								<time :datetime="page.createdAt" :title="dateTitle">{{ dateLabel(page.createdAt) }}</time>
								<template v-if="readingMinutes">
									<span aria-hidden="true">·</span>
									<span>{{ i18n.tsx._pages.readingTime({ n: readingMinutes }) }}</span>
								</template>
								<span v-if="page.supportersOnly" :class="$style.badge"><i class="ti ti-heart-handshake" aria-hidden="true"></i> {{ i18n.ts._pages.supportersOnly }}</span>
							</div>
						</div>
					</header>

					<div :class="[$style.layout, { [$style.withToc]: toc.length >= 2 }]">
						<div :class="$style.content">
							<MkInfo v-if="page.supportersOnlyLocked">{{ i18n.ts._pages.supportersOnlyLocked }}</MkInfo>
							<XPage v-else :page="page"/>
						</div>
						<nav v-if="toc.length >= 2" :class="$style.toc" :aria-label="i18n.ts._pages.toc">
							<div :class="$style.tocTitle">{{ i18n.ts._pages.toc }}</div>
							<ol>
								<li v-for="item in toc" :key="item.id" :style="{ '--depth': item.depth }">
									<a :href="`#page-section-${item.id}`" :class="[$style.tocLink, { [$style.tocActive]: activeSection === item.id }]" @click.prevent="scrollToSection(item.id)">{{ item.title }}</a>
								</li>
							</ol>
						</nav>
					</div>

					<footer :class="$style.footer">
						<div :class="$style.actions">
							<MkButton v-if="page.isLiked" v-tooltip="i18n.ts._pages.unlike" :aria-label="i18n.ts._pages.unlike" rounded asLike primary @click="unlike()"><i class="ti ti-heart-filled"></i><span v-if="page.likedCount > 0" :class="$style.count">{{ page.likedCount }}</span></MkButton>
							<MkButton v-else v-tooltip="i18n.ts._pages.like" :aria-label="i18n.ts._pages.like" rounded asLike @click="like()"><i class="ti ti-heart"></i><span v-if="page.likedCount > 0" :class="$style.count">{{ page.likedCount }}</span></MkButton>
							<div :class="articleStyle.other">
								<MkA v-if="page.userId === $i?.id" v-tooltip="i18n.ts._pages.editThisPage" :aria-label="i18n.ts._pages.editThisPage" :to="`/pages/edit/${page.id}`" class="_button" :class="articleStyle.generalActionButton"><i class="ti ti-pencil ti-fw"></i></MkA>
								<button v-tooltip="i18n.ts.copyLink" :aria-label="i18n.ts.copyLink" class="_button" :class="articleStyle.generalActionButton" @click="copyLink"><i class="ti ti-link ti-fw"></i></button>
								<button v-tooltip="i18n.ts.share" :aria-label="i18n.ts.share" class="_button" :class="articleStyle.generalActionButton" @click="share"><i class="ti ti-share ti-fw"></i></button>
								<button v-if="$i" v-tooltip="i18n.ts.more" v-click-anime :aria-label="i18n.ts.more" class="_button" :class="articleStyle.generalActionButton" @click="showMenu"><i class="ti ti-dots ti-fw"></i></button>
							</div>
						</div>
						<div :class="$style.authorCard">
							<MkAvatar :user="page.user" :class="$style.authorAvatar" indicator link preview/>
							<div :class="$style.authorText">
								<MkA :to="`/@${username}`" :class="$style.authorName"><MkUserName :user="page.user" :nowrap="false"/></MkA>
								<MkAcct :user="page.user" :class="$style.authorAcct"/>
								<p :class="$style.dates">
									<MkTime :time="page.createdAt" mode="detail"/>
									<span v-if="page.createdAt !== page.updatedAt"> · {{ i18n.ts.updatedAt }} <MkTime :time="page.updatedAt"/></span>
								</p>
							</div>
							<MkFollowButton v-if="author && $i && $i.id !== author.id" :class="$style.authorFollow" :user="author" @update:user="u => author = u"/>
						</div>
					</footer>
				</article>
				<MkAd :preferForms="['horizontal', 'horizontal-big']"/>
				<section v-if="otherPosts.length" :class="$style.more">
					<h2 :class="$style.moreTitle">
						<span>{{ i18n.tsx._pages.moreFromAuthor({ name: page.user.name ?? page.user.username }) }}</span>
						<MkA :to="`/@${username}/pages`" :class="$style.moreLink">{{ i18n.ts.showMore }} <i class="ti ti-chevron-right" aria-hidden="true"></i></MkA>
					</h2>
					<div class="_cardGrid">
						<MkPagePreview v-for="item in otherPosts" :key="item.id" :page="item"/>
					</div>
				</section>
			</div>
			<MkError v-else-if="error" @retry="fetchPage()"/>
			<MkLoading v-else/>
		</Transition>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, watch, ref, nextTick, onBeforeUnmount } from 'vue';
import * as Misskey from 'misskey-js';
import { url } from '@@/js/config.js';
import type { MenuItem } from '@/types/menu.js';
import articleStyle from './post-detail.module.scss';
import { useUserProfileLinks } from '@/composables/use-user-profile-links.js';
import XPage from '@/components/page/page.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkFollowButton from '@/components/MkFollowButton.vue';
import { getPageHashtags } from '@/utility/post-hashtags.js';
import MkButton from '@/components/MkButton.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import MkMediaImage from '@/components/MkMediaImage.vue';
import MkPagePreview from '@/components/MkPagePreview.vue';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import { deepClone } from '@/utility/clone.js';
import { $i } from '@/i.js';
import { isSupportShare } from '@/utility/navigator.js';
import { copyToClipboard } from '@/utility/copy-to-clipboard.js';
import { useRouter } from '@/router.js';
import { prefer } from '@/preferences.js';
import { getPluginHandlers } from '@/plugin.js';

const router = useRouter();

const props = defineProps<{
	pageName: string;
	username: string;
}>();

const page = ref<Misskey.entities.Page | null>(null);
const tags = computed(() => page.value ? getPageHashtags(page.value) : []);
const error = ref<any>(null);
const author = ref<Misskey.entities.UserDetailed | null>(null);
const otherPosts = ref<Misskey.entities.Page[]>([]);
const cover = computed(() => page.value && !page.value.supportersOnlyLocked ? page.value.eyeCatchingImage : null);

type TocItem = { id: string; title: string; depth: number };

const toc = computed<TocItem[]>(() => {
	if (!page.value || page.value.supportersOnlyLocked) return [];
	const items: TocItem[] = [];
	const walk = (blocks: Misskey.entities.PageBlock[], depth: number) => {
		for (const block of blocks) {
			if (block.type !== 'section') continue;
			if (block.title.trim()) items.push({ id: block.id, title: block.title, depth });
			if (depth < 2) walk(block.children ?? [], depth + 1);
		}
	};
	walk(page.value.content, 0);
	return items;
});

// 本文の文字数から読了目安 (分) を出す。日本語・韓国語を想定して 1 分 500 文字
const readingMinutes = computed(() => {
	if (!page.value || page.value.supportersOnlyLocked) return 0;
	let chars = 0;
	const walk = (blocks: Misskey.entities.PageBlock[]) => {
		for (const block of blocks) {
			if (block.type === 'text') chars += block.text.replace(/\s+/g, '').length;
			else if (block.type === 'section') {
				chars += block.title.length;
				walk(block.children ?? []);
			}
		}
	};
	walk(page.value.content);
	return chars === 0 ? 0 : Math.max(1, Math.round(chars / 500));
});

const dateTitle = computed(() => page.value ? new Date(page.value.createdAt).toLocaleString() : '');

function dateLabel(date: string) {
	return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

const activeSection = ref<string | null>(null);
let sectionObserver: IntersectionObserver | null = null;

function observeSections() {
	sectionObserver?.disconnect();
	sectionObserver = null;
	activeSection.value = null;
	if (toc.value.length < 2) return;
	const visible = new Set<string>();
	sectionObserver = new IntersectionObserver(entries => {
		for (const entry of entries) {
			const id = entry.target.id.replace('page-section-', '');
			if (entry.isIntersecting) visible.add(id);
			else visible.delete(id);
		}
		const first = toc.value.find(item => visible.has(item.id));
		if (first) activeSection.value = first.id;
	}, { rootMargin: '0px 0px -60% 0px' });
	for (const item of toc.value) {
		const el = window.document.getElementById(`page-section-${item.id}`);
		if (el) sectionObserver.observe(el);
	}
}

function scrollToSection(id: string) {
	window.document.getElementById(`page-section-${id}`)?.scrollIntoView({ behavior: prefer.s.animation ? 'smooth' : 'auto', block: 'start' });
	activeSection.value = id;
}

onBeforeUnmount(() => {
	sectionObserver?.disconnect();
});

async function fetchRelated(target: Misskey.entities.Page) {
	author.value = null;
	otherPosts.value = [];
	const [user, pages] = await Promise.all([
		$i ? misskeyApi('users/show', { userId: target.userId }).catch(() => null) : Promise.resolve(null),
		misskeyApi('users/pages', { userId: target.userId, limit: 5 }).catch(() => []),
	]);
	if (page.value?.id !== target.id) return;
	author.value = user;
	otherPosts.value = pages.filter(item => item.id !== target.id).slice(0, 4);
}

const path = computed(() => props.username + '/' + props.pageName);

function fetchPage() {
	page.value = null;
	misskeyApi('pages/show', {
		name: props.pageName,
		username: props.username,
	}).then(async _page => {
		page.value = _page;

		// plugin
		const pageViewInterruptors = getPluginHandlers('page_view_interruptor');
		if (pageViewInterruptors.length > 0) {
			let result = deepClone(_page);
			for (const interruptor of pageViewInterruptors) {
				result = await interruptor.handler(result);
			}
			page.value = result;
		}

		void fetchRelated(_page);
		// XPage のセクションは非同期コンポーネントなので、描画を待ってから監視する
		window.setTimeout(() => { void nextTick(observeSections); }, 300);
	}).catch(err => {
		error.value = err;
	});
}

function share(ev: PointerEvent) {
	if (!page.value) return;

	const menuItems: MenuItem[] = [];

	menuItems.push({
		text: i18n.ts.shareWithNote,
		icon: 'ti ti-pencil',
		action: shareWithNote,
	});

	if (isSupportShare()) {
		menuItems.push({
			text: i18n.ts.share,
			icon: 'ti ti-share',
			action: shareWithNavigator,
		});
	}

	os.popupMenu(menuItems, ev.currentTarget ?? ev.target);
}

function copyLink() {
	if (!page.value) return;

	copyToClipboard(`${url}/@${page.value.user.username}/pages/${page.value.name}`);
}

function shareWithNote() {
	if (!page.value) return;

	os.post({
		initialText: `${page.value.title || page.value.name}\n${url}/@${page.value.user.username}/pages/${page.value.name}`,
		instant: true,
	});
}

function shareWithNavigator() {
	if (!page.value) return;

	navigator.share({
		title: page.value.title ?? page.value.name,
		text: page.value.summary ?? undefined,
		url: `${url}/@${page.value.user.username}/pages/${page.value.name}`,
	});
}

function like() {
	if (!page.value) return;

	os.apiWithDialog('pages/like', {
		pageId: page.value.id,
	}).then(() => {
		page.value!.isLiked = true;
		page.value!.likedCount++;
	});
}

async function unlike() {
	if (!page.value) return;

	const confirm = await os.confirm({
		type: 'warning',
		text: i18n.ts.unlikeConfirm,
	});
	if (confirm.canceled) return;
	os.apiWithDialog('pages/unlike', {
		pageId: page.value.id,
	}).then(() => {
		page.value!.isLiked = false;
		page.value!.likedCount--;
	});
}

function pin(pin: boolean) {
	if (!page.value) return;

	os.apiWithDialog('i/update', {
		pinnedPageId: pin ? page.value.id : null,
	});
}

async function reportAbuse() {
	if (!page.value) return;

	const pageUrl = `${url}/@${props.username}/pages/${props.pageName}`;

	const { dispose } = await os.popupAsyncWithDialog(import('@/components/MkAbuseReportWindow.vue').then(x => x.default), {
		user: page.value.user,
		initialComment: `Page: ${pageUrl}\n-----\n`,
	}, {
		closed: () => dispose(),
	});
}

function showMenu(ev: PointerEvent) {
	if (!page.value) return;

	const menuItems: MenuItem[] = [];

	if ($i && $i.id === page.value.userId) {
		menuItems.push({
			icon: 'ti ti-pencil',
			text: i18n.ts.edit,
			action: () => router.push('/pages/edit/:initPageId', {
				params: {
					initPageId: page.value!.id,
				},
			}),
		});

		if ($i.pinnedPageId === page.value.id) {
			menuItems.push({
				icon: 'ti ti-pinned-off',
				text: i18n.ts.unpin,
				action: () => pin(false),
			});
		} else {
			menuItems.push({
				icon: 'ti ti-pin',
				text: i18n.ts.pin,
				action: () => pin(true),
			});
		}
	} else if ($i && $i.id !== page.value.userId) {
		menuItems.push({
			icon: 'ti ti-exclamation-circle',
			text: i18n.ts.reportAbuse,
			action: reportAbuse,
		});

		if ($i.isModerator || $i.isAdmin) {
			menuItems.push({
				type: 'divider',
			}, {
				icon: 'ti ti-trash',
				text: i18n.ts.delete,
				danger: true,
				action: () => os.confirm({
					type: 'warning',
					text: i18n.ts.deleteConfirm,
				}).then(({ canceled }) => {
					if (canceled || !page.value) return;

					os.apiWithDialog('pages/delete', { pageId: page.value.id });
				}),
			});
		}
	}

	os.popupMenu(menuItems, ev.currentTarget ?? ev.target);
}

watch(() => path.value, fetchPage, { immediate: true });

const { profileMetadata, profileTabs } = useUserProfileLinks(() => page.value?.user);

definePage(() => ({
	title: page.value ? page.value.title || page.value.name : i18n.ts.pages,
	...page.value ? {
		avatar: page.value.user,
		path: `/@${page.value.user.username}/pages/${page.value.name}`,
		share: {
			title: page.value.title || page.value.name,
			text: page.value.summary,
		},
	} : {},
}));
</script>

<style lang="scss" module>
.article {
	overflow: clip;
	container-type: inline-size;
	// 本文パネルと地の境界: 影ではなく細い線で区切る
	box-shadow: 0 0 0 1px var(--MI-c-border);
}

/* ---- ヒーロー ---- */
.hero {
	position: relative;
	display: grid;
	overflow: hidden;
	border-radius: var(--MI-radius) var(--MI-radius) 0 0;
	background:
		radial-gradient(120% 140% at 0% 0%, var(--MI-c-accentSoft), transparent 60%),
		radial-gradient(90% 120% at 100% 100%, color-mix(in oklab, var(--MI-c-accentSoft) 60%, transparent), transparent 70%),
		var(--MI-c-inset);

	&.hasCover {
		min-height: clamp(320px, 52cqi, 500px);
		background: #000;
		color: #fff;
	}
}

.heroMedia,
.heroBody {
	grid-area: 1 / 1;
}

.heroMedia {
	position: relative;

	&::after {
		content: "";
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: linear-gradient(to bottom, rgb(0 0 0 / 0) 30%, rgb(0 0 0 / 0.35) 55%, rgb(0 0 0 / 0.78) 100%);
	}
}

.heroImage {
	position: absolute;
	inset: 0;
	border-radius: 0;
}

.heroBody {
	position: relative;
	align-self: end;
	box-sizing: border-box;
	width: 100%;
	max-width: 800px;
	padding: clamp(28px, 6cqi, 56px) var(--reading-inset) clamp(22px, 4cqi, 36px);

	.hasCover & {
		text-shadow: 0 1px 12px rgb(0 0 0 / 0.35);
	}
}

.tags {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin: 0 0 14px;
	padding: 0;
	list-style: none;
}

.tag {
	display: inline-block;
	padding: 3px 10px;
	border-radius: var(--MI-radius-full);
	background: var(--MI-c-accentSoft);
	color: var(--MI-c-accentInk);
	font-size: 0.8em;
	font-weight: bold;
	text-shadow: none;

	&:hover {
		text-decoration: none;
		background: var(--MI-c-accentHover);
	}

	.hasCover & {
		background: rgb(255 255 255 / 0.18);
		color: #fff;
		-webkit-backdrop-filter: blur(8px);
		backdrop-filter: blur(8px);

		&:hover {
			background: rgb(255 255 255 / 0.28);
		}
	}
}

.title {
	margin: 0;
	font-size: clamp(1.8rem, 5.2cqi, 2.9rem);
	font-weight: bold;
	line-height: 1.2;
	overflow-wrap: anywhere;
	text-wrap: balance;
}

.summary {
	margin: 12px 0 0;
	max-width: 40em;
	font-size: clamp(1rem, 2cqi, 1.15rem);
	line-height: 1.6;
	opacity: .85;
	overflow-wrap: anywhere;
}

.byline {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px 8px;
	margin-top: 20px;
	font-size: 0.9em;
	color: var(--MI-c-fgMuted);

	.hasCover & {
		color: rgb(255 255 255 / 0.85);
	}
}

.bylineAvatar {
	width: 28px;
	height: 28px;
}

.bylineName {
	min-width: 0;
	max-width: 16em;
	color: var(--MI_THEME-fg);
	font-weight: bold;

	.hasCover & {
		color: #fff;
	}
}

.badge {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	margin-inline-start: 4px;
	padding: 2px 10px;
	border-radius: var(--MI-radius-full);
	background: var(--MI-c-accentSoft);
	color: var(--MI-c-accentInk);
	font-size: 0.85em;
	font-weight: bold;
	text-shadow: none;

	.hasCover & {
		background: rgb(255 255 255 / 0.18);
		color: #fff;
	}
}

/* ---- 本文 + 目次 ---- */
.layout {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	gap: 40px;
	padding-inline: var(--reading-inset);
}

.content {
	min-width: 0;
	max-width: 680px;
	padding-block: clamp(24px, 5cqi, 40px) 40px;
	font-size: 1.05em;
	line-height: 1.85;
	overflow-wrap: anywhere;

	:global(a) {
		color: var(--MI-c-accentInk);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, currentColor 35%, transparent);
		text-underline-offset: 0.2em;

		&:hover {
			text-decoration-color: currentColor;
		}
	}

	// MFM の引用はインラインスタイルで描画されるため、記事内でだけ上書きする
	:global(div[style*="border-left"]) {
		margin: 0.6em 0 !important;
		padding: 0.5em 1em !important;
		border-left: 3px solid var(--MI_THEME-accent) !important;
		border-radius: 0 var(--MI-radius-sm) var(--MI-radius-sm) 0;
		background: var(--MI-c-inset);
		color: var(--MI-c-fgMuted) !important;
		opacity: 1 !important;
	}

	:global(code):not(pre code) {
		padding: 0.1em 0.4em;
		border-radius: var(--MI-radius-xs);
		background: var(--MI-c-inset);
		font-size: 0.9em;
	}

	:global(pre) {
		border-radius: var(--MI-radius-md);
		font-size: 0.9em;
		line-height: 1.6;
	}
}

.toc {
	display: none;
}

@container (min-width: 820px) {
	.layout.withToc {
		grid-template-columns: minmax(0, 1fr) 180px;

		.toc {
			display: block;
		}
	}
}

.toc {
	position: sticky;
	top: calc(var(--MI-stickyTop, 0px) + 24px);
	align-self: start;
	max-height: calc(100dvh - var(--MI-stickyTop, 0px) - 48px);
	overflow: auto;
	padding-block: clamp(24px, 5cqi, 40px);
	font-size: 0.85em;

	ol {
		margin: 0;
		padding: 0;
		list-style: none;
		border-left: 1px solid var(--MI-c-border);
	}
}

.tocTitle {
	margin-bottom: 10px;
	color: var(--MI-c-fgMuted);
	font-size: 0.85em;
	font-weight: bold;
	letter-spacing: 0.04em;
}

.tocLink {
	display: block;
	margin-left: -1px;
	padding: 5px 0 5px calc(12px + var(--depth, 0) * 12px);
	border-left: 2px solid transparent;
	color: var(--MI-c-fgMuted);
	line-height: 1.45;
	transition: color var(--MI-duration-fast) var(--MI-ease), border-color var(--MI-duration-fast) var(--MI-ease);

	&:hover {
		color: var(--MI_THEME-fg);
		text-decoration: none;
	}
}

.tocActive {
	border-left-color: var(--MI_THEME-accent);
	color: var(--MI-c-accentInk);
	font-weight: bold;
}

/* ---- フッター ---- */
.footer {
	display: grid;
	gap: 20px;
	margin-inline: var(--reading-inset);
	padding-block: 20px clamp(24px, 5cqi, 36px);
	border-top: 1px solid var(--MI-c-border);
}

.actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;

	> :last-child {
		margin-inline-start: auto;
		display: flex;
		gap: 4px;
	}
}

.count {
	margin-inline-start: 0.4em;
}

.authorCard {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 16px;
	border-radius: var(--MI-radius-md);
	background: var(--MI-c-inset);
}

.authorAvatar {
	flex: none;
	width: 52px;
	height: 52px;
}

.authorText {
	flex: 1;
	min-width: 0;
}

.authorName {
	font-weight: bold;
	color: var(--MI_THEME-fg);
}

.authorAcct {
	display: block;
	color: var(--MI-c-fgMuted);
	font-size: 0.85em;
}

.dates {
	margin: 6px 0 0;
	color: var(--MI-c-fgSubtle);
	font-size: 0.8em;
}

.authorFollow {
	flex: none;
}

/* ---- ほかの記事 ---- */
.more {
	display: grid;
	gap: 12px;
}

.moreTitle {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin: 8px 4px 0;
	font-size: 1.05em;

	> span::before {
		content: "";
		display: inline-block;
		width: 6px;
		height: 6px;
		margin-right: 8px;
		vertical-align: middle;
		border-radius: var(--MI-radius-full);
		background: var(--MI_THEME-accent);
	}
}

.moreLink {
	flex: none;
	padding: 4px 12px;
	border-radius: var(--MI-radius-full);
	color: var(--MI-c-accentInk);
	font-size: 0.8em;
	font-weight: bold;
	box-shadow: 0 0 0 1px var(--MI-c-border);

	&:hover {
		text-decoration: none;
		background: var(--MI-c-hover);
	}
}
</style>

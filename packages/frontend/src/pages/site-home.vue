<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.scroll">
	<div :class="$style.root">
		<div :class="$style.layout">
			<main :class="$style.main">
				<header :class="$style.hero">
					<img v-if="heroImageUrl" :src="heroImageUrl" alt="" :class="$style.banner"/>
					<div :class="$style.heroCopy">
						<h1>{{ instanceName }}</h1>
						<p v-if="instance.description">{{ instance.description }}</p>
						<div v-if="!$i" :class="$style.guestActions">
							<button class="_buttonPrimary" data-testid="signin" @click="openSigninDialog">{{ i18n.ts.login }}</button>
							<button class="_button" data-testid="signup" @click="openSignupDialog">{{ i18n.ts.joinThisServer }}</button>
						</div>
					</div>
				</header>

				<nav :class="$style.shortcuts" :aria-label="i18n.ts._siteHome.shortcuts">
					<a href="#site-home-live">
						<span :class="$style.shortcutIcon"><i class="ti ti-broadcast" aria-hidden="true"></i></span>
						<span>{{ i18n.ts._siteHome.live }}</span>
					</a>
					<MkA v-for="shortcut in shortcuts" :key="shortcut.to" :to="shortcut.to">
						<span :class="$style.shortcutIcon"><i :class="shortcut.icon" aria-hidden="true"></i></span>
						<span>{{ shortcut.label }}</span>
					</MkA>
				</nav>

				<section id="site-home-live" :class="$style.panel">
					<h2><i class="ti ti-broadcast" aria-hidden="true"></i> {{ i18n.ts._siteHome.live }}</h2>
					<p v-if="liveCreators.length">{{ i18n.ts._siteHome.liveStatusUnavailable }}</p>
					<div :class="[$style.previewGrid, $style.fullWidthGrid, $style.videoGrid]" :aria-busy="creators === undefined">
						<MkMediaPreviewCard v-for="creator in liveCreators" :key="creator.id" :to="userPage(creator)" :title="creator.name || creator.username" compact>
							<template #thumbnail="{ imageClass }">
								<img v-if="creator.bannerUrl" :src="creator.bannerUrl" :class="imageClass" alt="" loading="lazy"/>
								<i v-else class="ti ti-broadcast" :class="$style.previewIcon" aria-hidden="true"></i>
							</template>
						</MkMediaPreviewCard>
						<div v-for="n in previewCount - liveCreators.length" :key="n" :class="$style.previewPlaceholder">
							<i class="ti ti-broadcast" aria-hidden="true"></i>
							<span v-if="n === 1 && !liveCreators.length" role="status">{{ previewStatus(creators) }}</span>
						</div>
					</div>
				</section>

				<section :class="$style.section">
					<h2>{{ i18n.ts._profile.streamingContent }}</h2>
					<div :class="$style.contentCards">
						<div :class="[$style.panel, $style.wide]">
							<div :class="$style.heading">
								<h3><i class="ti ti-video" aria-hidden="true"></i> {{ i18n.ts._profile.streamingVideoArchive }}</h3>
							</div>
							<div :class="[$style.previewGrid, $style.fullWidthGrid, $style.videoGrid]" :aria-busy="creators === undefined">
								<XStreamingResources v-for="{ creator, entry, path } in archives" :key="path" :entries="[entry]" :profile="creator" :fieldName="streamingVideoArchiveFieldName" compact/>
								<div v-for="n in previewCount - archives.length" :key="n" :class="$style.previewPlaceholder">
									<i class="ti ti-video" aria-hidden="true"></i>
									<span v-if="n === 1 && !archives.length" role="status">{{ previewStatus(creators) }}</span>
								</div>
							</div>
						</div>
						<div :class="$style.panel">
							<div :class="$style.heading">
								<h3><i class="ti ti-photo" aria-hidden="true"></i> {{ i18n.ts.gallery }}</h3>
								<MkA to="/gallery">{{ i18n.ts.more }}</MkA>
							</div>
							<div :class="$style.previewGrid" :aria-busy="galleryPosts === undefined">
								<MkGalleryPostPreview v-for="post in galleryPosts ?? []" :key="post.id" :post="post" compact/>
								<div v-for="n in previewCount - (galleryPosts?.length ?? 0)" :key="n" :class="$style.previewPlaceholder">
									<i class="ti ti-photo" aria-hidden="true"></i>
									<span v-if="n === 1 && !galleryPosts?.length" role="status">{{ previewStatus(galleryPosts) }}</span>
								</div>
							</div>
						</div>
						<div :class="$style.panel">
							<div :class="$style.heading">
								<h3><i class="ti ti-shopping-bag" aria-hidden="true"></i> {{ i18n.ts._profile.streamingGoodsServices }}</h3>
							</div>
							<div :class="$style.previewGrid" :aria-busy="creators === undefined">
								<MkMediaPreviewCard v-for="item in goods" :key="item.path" :to="item.path" :title="item.title" :tags="item.tags" compact>
									<template #thumbnail="{ imageClass }">
										<img v-if="item.imageUrl" :src="getStreamingImageSrc(item.imageUrl, 'preview')" :class="imageClass" alt="" loading="lazy"/>
										<i v-else class="ti ti-shopping-bag" :class="$style.previewIcon" aria-hidden="true"></i>
									</template>
								</MkMediaPreviewCard>
								<div v-for="n in previewCount - goods.length" :key="n" :class="$style.previewPlaceholder">
									<i class="ti ti-shopping-bag" aria-hidden="true"></i>
									<span v-if="n === 1 && !goods.length" role="status">{{ previewStatus(creators) }}</span>
								</div>
							</div>
						</div>
					</div>
				</section>

				<section :class="$style.panel">
					<div :class="$style.heading">
						<h2><i class="ti ti-hash" aria-hidden="true"></i> {{ channels?.length && !channels.some(channel => channel.lastNotedAt) ? i18n.ts.channel : i18n.ts._siteHome.recentChannels }}</h2>
						<MkA to="/channels">{{ i18n.ts.more }}</MkA>
					</div>
					<div :class="[$style.previewGrid, $style.fullWidthGrid]" :aria-busy="channels === undefined">
						<MkMediaPreviewCard v-for="channel in channels ?? []" :key="channel.id" :to="`/channels/${channel.id}`" :title="channel.name" :createdAt="channel.lastNotedAt ?? undefined" compact>
							<template #thumbnail="{ imageClass }">
								<img v-if="channel.bannerUrl && !channel.isSensitive" :src="channel.bannerUrl" :class="imageClass" alt="" loading="lazy"/>
								<i v-else class="ti ti-hash" :class="$style.previewIcon" aria-hidden="true"></i>
							</template>
						</MkMediaPreviewCard>
						<div v-for="n in previewCount - (channels?.length ?? 0)" :key="n" :class="$style.previewPlaceholder">
							<i class="ti ti-hash" aria-hidden="true"></i>
							<span v-if="n === 1 && !channels?.length" role="status">{{ previewStatus(channels) }}</span>
						</div>
					</div>
				</section>
			</main>

			<aside :class="$style.panel">
				<h2><i class="ti ti-message-circle" aria-hidden="true"></i> {{ i18n.ts._siteHome.recentPublicNotes }}</h2>
				<!-- タイムラインと同じノート表示 -->
				<MkNotesTimeline :paginator="notesPaginator" :noGap="true" :withControl="false" :pullToRefresh="false" :class="$style.notes"/>
			</aside>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, markRaw, onScopeDispose, shallowRef } from 'vue';
import { instanceName, ui } from '@@/js/config.js';
import { userPage } from '@@/js/user.js';
import type { entities } from 'misskey-js';
import MkGalleryPostPreview from '@/components/MkGalleryPostPreview.vue';
import MkMediaPreviewCard from '@/components/MkMediaPreviewCard.vue';
import MkNotesTimeline from '@/components/MkNotesTimeline.vue';
import { Paginator } from '@/utility/paginator.js';
import XStreamingResources from './user/streaming-resources.vue';
import { $i } from '@/i.js';
import { i18n } from '@/i18n.js';
import { instance } from '@/instance.js';
import { definePage } from '@/page.js';
import { openSigninDialog, openSignupDialog } from '@/ui/_common_/common.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { getStreamingImageSrc, getStreamingResourceThumbnail, getStreamingResources, pickStreamingResources, sortStreamingResourcesByTime, streamingGoodsServicesFieldName, streamingResourcePath, streamingVideoArchiveFieldName } from '@/utility/streaming-overview.js';

const shortcuts = computed(() => [
	{ to: '/timeline', label: i18n.ts.timeline, icon: 'ti ti-message-circle' },
	{ to: '/channels', label: i18n.ts.channel, icon: 'ti ti-hash' },
	{ to: '/gallery', label: i18n.ts.gallery, icon: 'ti ti-photo' },
	{ to: '/pages', label: i18n.ts.pages, icon: 'ti ti-file-text' },
	{ to: '/explore', label: i18n.ts.explore, icon: 'ti ti-compass' },
	{ to: '/announcements', label: i18n.ts.announcements, icon: 'ti ti-speakerphone' },
	...($i && ui === 'deck' ? [{ to: '/deck', label: i18n.ts.goToDeck, icon: 'ti ti-columns' }] : []),
]);

// サーバーのバナーを優先し、未設定なら背景画像をヒーローに使う
const heroImageUrl = computed(() => instance.bannerUrl || instance.backgroundImageUrl || null);
const previewCount = 4;
const galleryPosts = shallowRef<entities.GalleryPost[] | null>();
const channels = shallowRef<entities.Channel[] | null>();
const creators = shallowRef<entities.UserDetailed[] | null>();
const controller = new AbortController();
onScopeDispose(() => controller.abort());

// notes エンドポイントは公開ノートだけを返す
const notesPaginator = markRaw(new Paginator('notes', {
	limit: 6,
	noPaging: true,
	params: { local: true, renote: false },
}));

misskeyApi('gallery/posts', { limit: previewCount }, undefined, controller.signal).then(result => {
	galleryPosts.value = result;
}, () => { galleryPosts.value = null; });

misskeyApi('channels/featured', { sort: 'recent' }, undefined, controller.signal).then(result => (
	result.length ? result.slice(0, previewCount) : misskeyApi('channels/search', { query: '', limit: previewCount }, undefined, controller.signal)
)).then(result => {
	channels.value = result;
}, () => { channels.value = null; });

const isLocalStreamer = (user: entities.UserDetailed) => user.host === null && user.isStreamer;

misskeyApi('pinned-users', {}, undefined, controller.signal).then(async result => {
	const pinnedStreamers = result.filter(isLocalStreamer);
	if (pinnedStreamers.length) return pinnedStreamers;

	const localUsers = await misskeyApi('users', { origin: 'local', sort: '+createdAt', limit: 100 }, undefined, controller.signal);
	return localUsers.filter(isLocalStreamer);
}).then(result => {
	creators.value = result;
}, () => { creators.value = null; });

/** 新しく登録・再掲された順に、1 人の項目で埋まらないようユーザーごとの件数を絞って選ぶ */
const maxResourcesPerCreator = 2;

function listResources(field: typeof streamingVideoArchiveFieldName | typeof streamingGoodsServicesFieldName) {
	const items = (creators.value ?? []).flatMap(creator => getStreamingResources(creator.fields, field).map(entry => ({
		creator,
		entry,
		path: streamingResourcePath(creator, field, entry.id),
	})));
	return pickStreamingResources(sortStreamingResourcesByTime(items, item => item.entry), item => item.creator.id, maxResourcesPerCreator, previewCount);
}

function previewStatus(items: unknown[] | null | undefined) {
	if (items === undefined) return i18n.ts.loading;
	return items === null ? i18n.ts.error : i18n.ts.nothing;
}

const liveCreators = computed(() => creators.value?.slice(0, previewCount) ?? []);
const archives = computed(() => listResources(streamingVideoArchiveFieldName));
const goods = computed(() => listResources(streamingGoodsServicesFieldName).map(({ entry, path }) => ({
	path,
	title: entry.title,
	tags: entry.tags,
	imageUrl: getStreamingResourceThumbnail(entry),
})));

definePage(() => ({
	title: instanceName,
	icon: 'ti ti-home',
}));
</script>

<style lang="scss" module>
.scroll {
	height: 100%;
	overflow: auto;
	overscroll-behavior: contain;
}

.root {
	container: site-home / inline-size;
	max-width: 1440px;
	margin-inline: auto;
	padding: clamp(14px, 3vw, 40px);
	padding-bottom: max(32px, var(--MI-minBottomSpacing, 0px));
}

.layout {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(230px, .42fr);
	gap: 20px;
	align-items: start;
}

.main {
	display: grid;
	gap: 20px;
	min-width: 0;
}

.hero {
	isolation: isolate;
	position: relative;
	display: grid;
	align-items: end;
	min-height: clamp(215px, 27vw, 350px);
	overflow: hidden;
	border-radius: var(--MI-radius-xl);
	box-shadow: 0 0 0 1px var(--MI-c-border);
	background:
		radial-gradient(ellipse at 90% 0%, var(--MI-c-accentSoftHover), transparent 65%),
		radial-gradient(ellipse at 0% 100%, var(--MI-c-accentSoft), transparent 60%),
		var(--MI_THEME-panel);
}

.banner {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	object-fit: cover;
	z-index: -1;
}

.heroCopy {
	padding: clamp(20px, 4vw, 44px);
	background: linear-gradient(transparent, var(--MI_THEME-panel) 80%);
	overflow-wrap: anywhere;

	h1 {
		margin: 0;
		font-size: clamp(2rem, 5vw, 4rem);
		line-height: 1.08;
		letter-spacing: -.035em;
	}

	p {
		max-width: 55ch;
		margin: 12px 0 0;
		line-height: 1.5;
	}
}

.guestActions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin-top: 16px;

	button {
		min-height: var(--MI-controlHeight);
		padding: 8px 18px;
		border: 1px solid var(--MI-c-border);
		border-radius: var(--MI-radius-md);
		font-weight: bold;
	}

	button:last-child {
		background: var(--MI_THEME-panel);
	}
}

.shortcuts {
	display: flex;
	flex-wrap: wrap;
	gap: 12px 16px;

	a {
		display: grid;
		justify-items: center;
		gap: 8px;
		min-width: 66px;
		font-size: .85em;
		text-align: center;
		color: var(--MI-c-fgMuted);
		transition: color var(--MI-duration-fast) var(--MI-ease);

		&:hover {
			color: var(--MI_THEME-fgHighlighted);

			.shortcutIcon {
				transform: translateY(-2px);
				background: var(--MI-c-accentSoftHover);

				i {
					transform: rotate(-8deg) scale(1.08);
				}
			}
		}
	}
}

.shortcutIcon {
	display: grid;
	place-items: center;
	width: 52px;
	aspect-ratio: 1;
	border-radius: var(--MI-radius-lg);
	background: var(--MI-c-accentSoft);
	color: var(--MI-c-accentInk);
	font-size: 1.35em;
	transition:
		transform var(--MI-duration) var(--MI-easeSpring),
		background var(--MI-duration-fast) var(--MI-ease);

	i {
		transition: transform var(--MI-duration-slow) var(--MI-easeSpring);
	}
}

.panel {
	min-width: 0;
	padding: clamp(14px, 2vw, 22px);
	border-radius: var(--MI-radius-lg);
	box-shadow: 0 0 0 1px var(--MI-c-border);
	background: var(--MI_THEME-panel);
	overflow-wrap: anywhere;

	h2, h3 {
		margin: 0;
		font-size: 1.05em;
	}

	p {
		margin: 10px 0 0;
		font-size: .9em;
		color: var(--MI-c-fgMuted);
	}

	h2 > i,
	h3 > i {
		color: var(--MI-c-accentInk);
	}
}

// カード内外のセクション見出しを同じ見た目に揃える (先頭に小さなアクセントの点)
// カード外のグループ見出しは点、カード内の見出しはアイコン
.section > h2 {
	display: flex;
	align-items: center;
	gap: 8px;

	&::before {
		content: '';
		flex-shrink: 0;
		width: 6px;
		height: 6px;
		border-radius: var(--MI-radius-full);
		background: var(--MI_THEME-accent);
	}
}

.heading {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 12px;
	// 「もっと見る」の有無で隣り合うカードの見出し高さがずれないようにする
	min-height: 28px;
}

.heading a {
	flex-shrink: 0;
	padding: 4px 10px;
	font-size: .8em;
	color: var(--MI-c-accentInk);
	border-radius: var(--MI-radius-full);
	transition: background var(--MI-duration-fast) var(--MI-ease);

	&:hover {
		text-decoration: none;
		background: var(--MI-c-accentSoft);
	}
}

.section > h2 {
	margin: 0 0 10px;
	font-size: 1.05em;
}

// 16:9 の動画アーカイブは 1 行使い、1:1 のギャラリーとグッズを 2 段に並べる
.contentCards {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 12px;
}

.wide {
	grid-column: 1 / -1;
}

.contentCards .previewGrid {
	margin-top: 12px;
}

.previewIcon {
	font-size: 1.75em;
	color: var(--MI-c-accentInk);
}

.previewGrid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	align-items: start;
	gap: 8px;
	--media-preview-aspect-ratio: 1;
}

.fullWidthGrid {
	grid-template-columns: repeat(4, minmax(0, 1fr));
	margin-top: 12px;
}

.videoGrid {
	--media-preview-aspect-ratio: 16 / 9;
}

.previewPlaceholder {
	display: grid;
	align-content: center;
	justify-items: center;
	gap: 4px;
	aspect-ratio: var(--media-preview-aspect-ratio);
	box-sizing: border-box;
	border-radius: var(--MI-radius);
	background: var(--MI-c-sunken);
	color: var(--MI-c-fgSubtle);
	text-align: center;
	font-size: .8em;

	i {
		font-size: 1.25em;
		opacity: .6;
	}
}

.notes {
	margin-top: 12px;
	overflow: hidden;
	border-radius: var(--MI-radius-md);
	box-shadow: 0 0 0 1px var(--MI-c-border);
	// サイドバーは狭いのでノートの文字を少し小さく
	font-size: 0.92em;
}

@container site-home (max-width: 760px) {
	.layout {
		grid-template-columns: minmax(0, 1fr);
	}
}

@container site-home (max-width: 600px) {
	.contentCards {
		grid-template-columns: minmax(0, 1fr);
	}

	.fullWidthGrid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.shortcuts {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}
}

@media (prefers-reduced-motion: reduce) {
	.shortcuts a:hover .shortcutIcon,
	.shortcuts a:hover .shortcutIcon i {
		transform: none;
	}
}
</style>

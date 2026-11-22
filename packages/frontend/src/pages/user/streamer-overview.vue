<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.overview" class="_gaps">
	<section v-if="!hashtagsOnly" class="_gaps_s">
		<h2 :class="$style.groupHeading">{{ isStreamer ? i18n.ts._profile.streamingContent : i18n.ts.recentPosts }}</h2>
		<section v-if="isStreamer" :class="$style.section" class="_panel _gaps_s">
			<header :class="$style.header"><h3><i class="ti ti-lock" aria-hidden="true"></i> {{ i18n.ts._profile.privateLive }}</h3></header>
			<XPrivateLivePlayer :key="user.id" :creatorId="user.id"/>
		</section>
		<XStreamingSchedule v-if="isStreamer" :key="user.id" :user="user"/>
		<section v-if="isStreamer || videoArchive.length" :class="$style.section" class="_panel _gaps_s">
			<header :class="$style.header">
				<h3><i class="ti ti-video" aria-hidden="true"></i> {{ i18n.ts._profile.streamingVideoArchive }}</h3>
				<MkA v-if="videoArchive.length > videoPreviewLimit" class="_link" :to="userPage(user, 'video-archive')">{{ i18n.ts.showMore }}</MkA>
			</header>
			<div :class="[$style.thumbnailPlaceholders, $style.videoPlaceholders, $style.homeVideoCards]">
				<XStreamingResources v-for="entry in videoArchive.slice(0, videoPreviewLimit)" :key="entry.id" :entries="[entry]" :profile="user" :fieldName="streamingVideoArchiveFieldName" compact/>
				<div v-for="n in videoPreviewLimit - Math.min(videoArchive.length, videoPreviewLimit)" :key="n" :class="$style.placeholder">
					<p v-if="!videoArchive.length && n === 2" :class="$style.emptyCaption">{{ i18n.ts.nothing }}</p>
					<i v-else class="ti ti-video" aria-hidden="true"></i>
				</div>
			</div>
		</section>
		<div :class="[$style.sections, $style.mediaSections]">
			<section :class="$style.section" class="_panel _gaps_s" :aria-busy="pagesStatus === 'loading'">
				<header :class="$style.header">
					<h3><i class="ti ti-file-text" aria-hidden="true"></i> {{ i18n.ts._profile.streamingRecentPages }}</h3>
					<MkA v-if="pages.length" class="_link" :to="userPage(user, 'pages')">{{ i18n.ts.showMore }}</MkA>
				</header>
				<div :class="[$style.webzine, { [$style.emptyWebzine]: !pages.length }]">
					<MkPagePreview v-for="page in pages" :key="page.id" :page="page" compact/>
					<div v-for="n in pagePreviewLimit - pages.length" :key="n" :class="[$style.placeholder, $style.webzinePlaceholder]">
						<p v-if="!pages.length && n === 2 && pagesStatus !== 'loading'" :class="$style.emptyCaption">{{ pagesStatus === 'error' ? i18n.ts.error : i18n.ts.nothing }}</p>
						<i v-else class="ti ti-file-text" aria-hidden="true"></i>
					</div>
				</div>
			</section>

			<section :class="$style.section" class="_panel _gaps_s" :aria-busy="galleryStatus === 'loading'">
				<header :class="$style.header">
					<h3><i class="ti ti-photo" aria-hidden="true"></i> {{ i18n.ts._profile.streamingRecentGallery }}</h3>
					<MkA v-if="gallery.length" class="_link" :to="userPage(user, 'gallery')">{{ i18n.ts.showMore }}</MkA>
				</header>
				<div :class="$style.cards">
					<MkGalleryPostPreview v-for="post in gallery" :key="post.id" :post="post" compact/>
					<div v-for="n in galleryPreviewLimit - gallery.length" :key="n" :class="[$style.placeholder, $style.galleryPlaceholder]">
						<p v-if="!gallery.length && n === 2 && galleryStatus !== 'loading'" :class="$style.emptyCaption">{{ galleryStatus === 'error' ? i18n.ts.error : i18n.ts.nothing }}</p>
						<i v-else class="ti ti-photo" aria-hidden="true"></i>
					</div>
				</div>
			</section>
		</div>
		<section v-if="isStreamer || goodsServices.length" :class="$style.section" class="_panel _gaps_s">
			<header :class="$style.header">
				<h3><i class="ti ti-shopping-bag" aria-hidden="true"></i> {{ i18n.ts._profile.streamingGoodsServices }}</h3>
				<MkA v-if="goodsServices.length > goodsPreviewLimit" class="_link" :to="userPage(user, 'goods-services')">{{ i18n.ts.showMore }}</MkA>
			</header>
			<!-- 動画と同じく、項目のあとを 3 枠までプレースホルダーで埋める -->
			<div :class="[$style.thumbnailPlaceholders, $style.homeGoodsCards]">
				<XStreamingResources v-for="entry in goodsServices.slice(0, goodsPreviewLimit)" :key="entry.id" :entries="[entry]" :profile="user" :fieldName="streamingGoodsServicesFieldName" compact/>
				<div v-for="n in goodsPreviewLimit - Math.min(goodsServices.length, goodsPreviewLimit)" :key="n" :class="$style.placeholder">
					<p v-if="!goodsServices.length && n === 2" :class="$style.emptyCaption">{{ i18n.ts.nothing }}</p>
					<i v-else class="ti ti-shopping-bag" aria-hidden="true"></i>
				</div>
			</div>
		</section>
	</section>

	<section v-if="isStreamer" class="_gaps_s">
		<h2 v-if="!hashtagsOnly" :class="$style.groupHeading">{{ i18n.ts._profile.streamingCommunity }}</h2>
		<div :class="{ [$style.sections]: !hashtagsOnly }">
			<section v-if="!hashtagsOnly" :class="$style.section" class="_panel _gaps_s" :aria-busy="communityStatus === 'loading'">
				<header :class="$style.header">
					<h3><i class="ti ti-messages" aria-hidden="true"></i> {{ i18n.ts._profile.streamingCommunityNotes }}</h3>
					<MkA v-if="community" class="_link" :to="`/channels/${community.id}`">{{ i18n.ts.showMore }}</MkA>
				</header>
				<MkLoading v-if="communityStatus === 'loading'"/>
				<MkInfo v-else-if="communityStatus === 'error'" warn>{{ i18n.ts.error }}</MkInfo>
				<p v-else-if="!communityNotes.length" :class="[$style.placeholder, $style.empty]">{{ i18n.ts.noNotes }}</p>
				<div v-else class="_gaps_s">
					<MkNote v-for="note in communityNotes" :key="note.id" :note="note"/>
				</div>
			</section>
			<section :class="$style.section" class="_panel _gaps_s">
				<header :class="$style.header">
					<h3><i class="ti ti-hash" aria-hidden="true"></i> {{ i18n.ts._profile.streamingTaggedNotes }}</h3>
					<MkA v-if="activeTag" class="_link" :to="`/tags/${encodeURIComponent(activeTag)}`">{{ i18n.ts._profile.openStreamingTag }}</MkA>
				</header>
				<div v-if="tags.length" :class="$style.tags">
					<MkButton v-for="tag in tags" :key="tag" small rounded :active="tag === activeTag" :aria-pressed="tag === activeTag" @click="selectedTag = tag">
						#{{ tag }}
					</MkButton>
				</div>
				<MkLoading v-if="loadingNotes"/>
				<MkInfo v-else-if="notesFailed" warn>{{ i18n.ts.error }}</MkInfo>
				<p v-else-if="!notes.length" :class="[$style.placeholder, $style.empty]">{{ i18n.ts.noNotes }}</p>
				<div v-else class="_gaps_s">
					<MkNote v-for="note in notes" :key="note.id" :note="note"/>
				</div>
			</section>
		</div>
	</section>
</div>
</template>

<script lang="ts" setup>
import { computed, shallowRef, ref, watch } from 'vue';
import type * as Misskey from 'misskey-js';
import MkButton from '@/components/MkButton.vue';
import MkGalleryPostPreview from '@/components/MkGalleryPostPreview.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkNote from '@/components/MkNote.vue';
import MkPagePreview from '@/components/MkPagePreview.vue';
import XPrivateLivePlayer from './private-live-player.vue';
import XStreamingResources from './streaming-resources.vue';
import XStreamingSchedule from './streaming-schedule.vue';
import { userPage } from '@@/js/user.js';
import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { getStreamingOverviewTags, getStreamingResources, streamingCommunityFieldName, streamingGoodsServicesFieldName, streamingVideoArchiveFieldName } from '@/utility/streaming-overview.js';

const props = defineProps<{
	user: Misskey.entities.UserDetailed;
	hashtagsOnly?: boolean;
}>();

const emit = defineEmits<{
	(ev: 'communityResolved', community?: Misskey.entities.Channel): void;
}>();

type PreviewStatus = 'loading' | 'ready' | 'error';

const galleryPreviewLimit = 6;
const pagePreviewLimit = 3;
const videoPreviewLimit = 3;
const goodsPreviewLimit = 3;
const isStreamer = computed(() => props.user.host === null && props.user.isStreamer);
const videoArchive = computed(() => props.user.host === null ? getStreamingResources(props.user.fields, streamingVideoArchiveFieldName) : []);
const goodsServices = computed(() => props.user.host === null ? getStreamingResources(props.user.fields, streamingGoodsServicesFieldName) : []);

const pagesStatus = ref<PreviewStatus>('loading');
const galleryStatus = ref<PreviewStatus>('loading');
const communityStatus = ref<PreviewStatus>('ready');
const pages = shallowRef<Misskey.entities.Page[]>([]);
const gallery = shallowRef<Misskey.entities.GalleryPost[]>([]);
const community = shallowRef<Misskey.entities.Channel>();
const communityNotes = shallowRef<Misskey.entities.Note[]>([]);
const notes = shallowRef<Misskey.entities.Note[]>([]);
const loadingNotes = ref(false);
const notesFailed = ref(false);
const selectedTag = ref<string>();
const tags = computed(() => isStreamer.value ? getStreamingOverviewTags(props.user.fields) : []);
const activeTag = computed(() => selectedTag.value && tags.value.includes(selectedTag.value) ? selectedTag.value : tags.value[0]);
const communityId = computed(() => {
	if (!isStreamer.value || props.hashtagsOnly) return undefined;
	const value = props.user.fields.find(field => field.name === streamingCommunityFieldName)?.value;
	return value && /^[a-z0-9]+$/u.test(value) ? value : undefined;
});

watch(() => props.hashtagsOnly ? undefined : props.user.id, (userId, _, onCleanup) => {
	if (!userId) return;
	const controller = new AbortController();
	onCleanup(() => controller.abort());
	pages.value = [];
	gallery.value = [];
	pagesStatus.value = 'loading';
	galleryStatus.value = 'loading';

	misskeyApi('users/pages', { userId, limit: pagePreviewLimit }, undefined, controller.signal).then(items => {
		if (controller.signal.aborted) return;
		pages.value = items;
		pagesStatus.value = 'ready';
	}).catch(() => {
		if (!controller.signal.aborted) pagesStatus.value = 'error';
	});
	misskeyApi('users/gallery/posts', { userId, limit: galleryPreviewLimit * 3 }, undefined, controller.signal).then(items => {
		if (controller.signal.aborted) return;
		gallery.value = items.filter(item => item.files?.[0]?.type.startsWith('image/')).slice(0, galleryPreviewLimit);
		galleryStatus.value = 'ready';
	}).catch(() => {
		if (!controller.signal.aborted) galleryStatus.value = 'error';
	});
}, { immediate: true });

watch([communityId, () => props.user.id], ([channelId, userId], _, onCleanup) => {
	community.value = undefined;
	communityNotes.value = [];
	emit('communityResolved');
	communityStatus.value = channelId ? 'loading' : 'ready';
	if (!channelId) return;

	const controller = new AbortController();
	onCleanup(() => controller.abort());
	misskeyApi('channels/show', { channelId }, undefined, controller.signal).then(async channel => {
		if (controller.signal.aborted) return;
		if (channel.userId === userId && !channel.isArchived && !channel.isSensitive) {
			community.value = channel;
			emit('communityResolved', channel);
			const items = await misskeyApi('channels/timeline', { channelId, limit: 8 }, undefined, controller.signal);
			if (controller.signal.aborted) return;
			communityNotes.value = items.filter(note => note.visibility === 'public' && !note.isHidden && !note.user.requireSigninToViewContents).slice(0, 3);
		}
		communityStatus.value = 'ready';
	}).catch(() => {
		if (!controller.signal.aborted) communityStatus.value = 'error';
	});
}, { immediate: true });

watch(activeTag, (tag, _, onCleanup) => {
	notes.value = [];
	notesFailed.value = false;
	loadingNotes.value = tag != null;
	if (!tag) return;

	const controller = new AbortController();
	onCleanup(() => controller.abort());
	misskeyApi('notes/search-by-tag', { tag, limit: 20 }, undefined, controller.signal).then(items => {
		if (controller.signal.aborted) return;
		const publicNotes = items.filter(note => note.visibility === 'public' && !note.isHidden && !note.localOnly && !note.channelId && !note.user.requireSigninToViewContents);
		notes.value = props.hashtagsOnly ? publicNotes : publicNotes.slice(0, 3);
	}).catch(() => {
		if (!controller.signal.aborted) notesFailed.value = true;
	}).finally(() => {
		if (!controller.signal.aborted) loadingNotes.value = false;
	});
}, { immediate: true });
</script>

<style lang="scss" module>
.overview {
	container-type: inline-size;
}

.groupHeading {
	margin: 0;
	font-size: 1.125em;
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

// 件数が少なくても隣のギャラリーと高さが揃うよう、行を均等に伸ばして空き枠で埋める
.webzine {
	display: grid;
	flex: 1;
	grid-auto-rows: 1fr;
	gap: 6px;
}

.emptyWebzine {
	gap: 8px;
}

.webzinePlaceholder {
	display: grid;
	place-items: center;
	min-height: 56px;
	color: var(--MI-c-fgSubtle);

	> i {
		opacity: 0.6;
	}
}

.sections {
	display: grid;
	gap: 12px;
	align-items: start;
}

@container (min-width: 520px) {
	.sections {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.mediaSections {
		align-items: stretch;
	}
}

// サイトホームのカードと同じ余白・見出し規則に揃える
.section {
	min-width: 0;
	padding: clamp(14px, 2vw, 20px);
}

.header {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 4px 12px;

	h3 {
		margin: 0;
		font-size: 1.05em;

		> i {
			color: var(--MI-c-accentInk);
		}
	}

	> a {
		flex-shrink: 0;
		padding: 4px 10px;
		font-size: 0.8em;
		color: var(--MI-c-accentInk);
		border-radius: var(--MI-radius-full);
		transition: background var(--MI-duration-fast) var(--MI-ease);

		&:hover {
			text-decoration: none;
			background: var(--MI-c-accentSoft);
		}
	}
}

.cards {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 8px;
}

.tags {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.placeholder {
	background: var(--MI-c-sunken);
	border-radius: var(--MI-radius-md);
	color: var(--MI-c-fgSubtle);
}

.homeVideoCards {
	--video-card-columns: minmax(0, 1fr);
	--media-preview-aspect-ratio: 16 / 9;
}

.homeGoodsCards {
	--goods-card-columns: minmax(0, 1fr);
}

.thumbnailPlaceholders {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 8px;
}

.thumbnailPlaceholders > div,
.galleryPlaceholder {
	display: grid;
	place-items: center;
	aspect-ratio: 1;

	> i {
		opacity: 0.6;
	}
}

.videoPlaceholders > div {
	aspect-ratio: 16 / 9;
}

.emptyCaption {
	margin: 0;
	padding-inline: 4px;
	font-size: 0.8em;
	line-height: 1.25;
	text-align: center;
	overflow-wrap: anywhere;
	opacity: 0.7;
}

.empty {
	display: grid;
	place-items: center;
	min-height: 64px;
	margin: 0;
	font-size: 0.8em;
}
</style>

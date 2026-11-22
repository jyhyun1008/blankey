<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<ul v-if="entries.length" :class="[$style.links, isVideoArchive ? $style.videoCards : $style.goodsCards]">
	<li v-for="entry in entries" :key="entry.id">
		<MkUrlPreview
			v-if="showVideoPreviews"
			:url="entry.url"
			:mediaCard="{ to: streamingResourcePath(profile, fieldName, entry.id), title: entry.title, tags: entry.tags, user: profile, compact, createdAt: timeOf(entry) }"
		/>
		<MkMediaPreviewCard v-else-if="isVideoArchive" :to="streamingResourcePath(profile, fieldName, entry.id)" :title="entry.title" :tags="entry.tags" :user="profile" :compact="compact" :createdAt="timeOf(entry)"/>
		<!-- グッズ・サービス: 正方形のサムネイルカード -->
		<MkMediaPreviewCard v-else :to="streamingResourcePath(profile, fieldName, entry.id)" :title="entry.title" :tags="entry.tags" :compact="compact" :createdAt="timeOf(entry)">
			<template #thumbnail="{ imageClass }">
				<img v-if="getStreamingResourceThumbnail(entry)" :src="getStreamingImageSrc(getStreamingResourceThumbnail(entry)!, 'preview')" :class="imageClass" alt="" loading="lazy"/>
				<i v-else class="ti ti-shopping-bag" :class="$style.placeholderIcon" aria-hidden="true"></i>
			</template>
		</MkMediaPreviewCard>
	</li>
</ul>
<p v-else :class="$style.empty">{{ i18n.ts.nothing }}</p>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent } from 'vue';
import MkMediaPreviewCard from '@/components/MkMediaPreviewCard.vue';
import type { entities } from 'misskey-js';
import { getStreamingImageSrc, getStreamingResourceSortTime, getStreamingResourceThumbnail, streamingResourcePath, streamingVideoArchiveFieldName } from '@/utility/streaming-overview.js';
import type { StreamingResource, streamingResourceFieldNames } from '@/utility/streaming-overview.js';
import { i18n } from '@/i18n.js';
import { isEnabledUrlPreview } from '@/utility/url-preview.js';

const MkUrlPreview = defineAsyncComponent(() => import('@/components/MkUrlPreview.vue'));
const props = defineProps<{
	entries: StreamingResource[];
	profile: entities.UserLite;
	fieldName: typeof streamingResourceFieldNames[number];
	compact?: boolean;
}>();
const isVideoArchive = computed(() => props.fieldName === streamingVideoArchiveFieldName);
const showVideoPreviews = computed(() => isVideoArchive.value && isEnabledUrlPreview.value);

/** カードに出す日時 (登録日時、再掲していればその日時) */
function timeOf(entry: StreamingResource) {
	const time = getStreamingResourceSortTime(entry);
	return time != null ? new Date(time).toISOString() : undefined;
}
</script>

<style module>
.links {
	display: grid;
	gap: 8px;
	margin: 0;
	padding-inline-start: 1.25em;
}

.videoCards {
	--media-preview-aspect-ratio: 16 / 9;
	--media-preview-height: auto;
	grid-template-columns: var(--video-card-columns, repeat(auto-fill, minmax(min(100%, 260px), 1fr)));
	gap: var(--video-card-gap, 8px);
	margin: var(--video-card-grid-margin, 0);
	padding-inline-start: 0;
	list-style: none;
}

.goodsCards {
	--media-preview-aspect-ratio: 1;
	--media-preview-height: auto;
	grid-template-columns: var(--goods-card-columns, repeat(auto-fill, minmax(min(100%, 150px), 1fr)));
	gap: 12px;
	padding-inline-start: 0;
	list-style: none;
}

.placeholderIcon {
	font-size: 2em;
	color: var(--MI-c-fgSubtle);
}

.empty {
	margin: 0;
	font-size: 0.8em;
	opacity: 0.7;
}
</style>

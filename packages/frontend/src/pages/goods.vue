<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :tab="hub.tab" :tabs="hub.tabs.value" :swipable="false">
	<div class="_spacer _profileContent">
		<MkLoading v-if="creators === undefined"/>
		<MkResult v-else-if="creators === null" type="error"/>
		<div v-else-if="goods.length" :class="$style.grid">
			<MkMediaPreviewCard v-for="item in goods" :key="item.path" :to="item.path" :title="item.title" :tags="item.tags" :user="item.creator" :createdAt="item.time" compact>
				<template #thumbnail="{ imageClass }">
					<img v-if="item.imageUrl" :src="getStreamingImageSrc(item.imageUrl, 'preview')" :class="imageClass" alt="" loading="lazy"/>
					<i v-else class="ti ti-shopping-bag" :class="$style.placeholderIcon" aria-hidden="true"></i>
				</template>
			</MkMediaPreviewCard>
		</div>
		<MkResult v-else type="empty"/>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import MkMediaPreviewCard from '@/components/MkMediaPreviewCard.vue';
import { definePage } from '@/page.js';
import { useContentHub, useLocalStreamers } from '@/utility/content-hub.js';
import { getStreamingImageSrc, getStreamingResourceSortTime, getStreamingResourceThumbnail, getStreamingResources, sortStreamingResourcesByTime, streamingGoodsServicesFieldName, streamingResourcePath } from '@/utility/streaming-overview.js';

const hub = useContentHub('goods');
const creators = useLocalStreamers();

// 新しく登録・再掲 (bump) された順
const goods = computed(() => sortStreamingResourcesByTime(
	(creators.value ?? []).flatMap(creator => getStreamingResources(creator.fields, streamingGoodsServicesFieldName).map(entry => ({ creator, entry }))),
	item => item.entry,
).map(({ creator, entry }) => {
	const time = getStreamingResourceSortTime(entry);
	return {
		creator,
		path: streamingResourcePath(creator, streamingGoodsServicesFieldName, entry.id),
		title: entry.title,
		tags: entry.tags,
		imageUrl: getStreamingResourceThumbnail(entry),
		time: time != null ? new Date(time).toISOString() : undefined,
	};
}));

definePage(() => hub.metadata);
</script>

<style lang="scss" module>
.grid {
	--media-preview-aspect-ratio: 1;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
	align-items: start;
	gap: 12px;
}

.placeholderIcon {
	font-size: 2em;
	color: var(--MI-c-fgSubtle);
}
</style>

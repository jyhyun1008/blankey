<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :tab="hub.tab" :tabs="hub.tabs.value" :swipable="false">
	<div class="_spacer _profileContent">
		<MkTab v-model="tab" :tabs="subTabs" :class="$style.subTabs"/>
		<MkLoading v-if="creators === undefined"/>
		<MkResult v-else-if="creators === null" type="error"/>
		<template v-else-if="tab === 'archives'">
			<div v-if="archives.length" :class="$style.grid">
				<XStreamingResources v-for="{ creator, entry, path } in archives" :key="path" :entries="[entry]" :profile="creator" :fieldName="streamingVideoArchiveFieldName" compact/>
			</div>
			<MkResult v-else type="empty"/>
		</template>
		<template v-else>
			<p v-if="creators.length" :class="$style.note"><i class="ti ti-info-circle" aria-hidden="true"></i> {{ i18n.ts._siteHome.liveStatusUnavailable }}</p>
			<div v-if="creators.length" :class="$style.grid">
				<MkMediaPreviewCard v-for="creator in creators" :key="creator.id" :to="userPage(creator)" :title="creator.name || creator.username" :user="creator" compact>
					<template #thumbnail="{ imageClass }">
						<img v-if="creator.bannerUrl" :src="creator.bannerUrl" :class="imageClass" alt="" loading="lazy"/>
						<i v-else class="ti ti-broadcast" :class="$style.placeholderIcon" aria-hidden="true"></i>
					</template>
				</MkMediaPreviewCard>
			</div>
			<MkResult v-else type="empty" :text="i18n.ts._pages.streamersEmpty"/>
		</template>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { userPage } from '@@/js/user.js';
import XStreamingResources from './user/streaming-resources.vue';
import MkMediaPreviewCard from '@/components/MkMediaPreviewCard.vue';
import MkTab from '@/components/MkTab.vue';
import type { Tab } from '@/components/MkTab.vue';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import { useContentHub, useLocalStreamers } from '@/utility/content-hub.js';
import { getStreamingResources, sortStreamingResourcesByTime, streamingResourcePath, streamingVideoArchiveFieldName } from '@/utility/streaming-overview.js';

const hub = useContentHub('videos');
const creators = useLocalStreamers();
const tab = ref<'archives' | 'live'>('archives');

const subTabs: Tab<'archives' | 'live'>[] = [
	{ key: 'archives', label: i18n.ts._profile.streamingVideoArchive, icon: 'ti ti-video' },
	{ key: 'live', label: i18n.ts._siteHome.live, icon: 'ti ti-broadcast' },
];

// 新しく登録された順
const archives = computed(() => sortStreamingResourcesByTime((creators.value ?? []).flatMap(creator => getStreamingResources(creator.fields, streamingVideoArchiveFieldName).map(entry => ({
	creator,
	entry,
	path: streamingResourcePath(creator, streamingVideoArchiveFieldName, entry.id),
}))), item => item.entry));

definePage(() => hub.metadata);
</script>

<style lang="scss" module>
.subTabs {
	margin-bottom: var(--MI-margin);
}

.grid {
	--media-preview-aspect-ratio: 16 / 9;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
	align-items: start;
	gap: 12px;
}

.note {
	margin: 0 0 12px;
	color: var(--MI-c-fgMuted);
	font-size: 0.85em;
}

.placeholderIcon {
	font-size: 2em;
	color: var(--MI-c-fgSubtle);
}
</style>

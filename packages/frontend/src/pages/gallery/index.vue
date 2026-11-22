<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :tab="hub.tab" :actions="headerActions" :tabs="hub.tabs.value" :swipable="false">
	<div class="_spacer _profileContent">
		<MkTab v-model="tab" :tabs="subTabs" :class="$style.subTabs"/>
		<div v-if="tab === 'explore'" class="_gaps">
			<MkFoldableSection>
				<template #header><i class="ti ti-clock"></i>{{ i18n.ts.recentPosts }}</template>
				<MkPagination v-slot="{items}" :paginator="recentPostsPaginator">
					<div :class="$style.items">
						<MkGalleryPostPreview v-for="post in items" :key="post.id" :post="post" class="post"/>
					</div>
				</MkPagination>
			</MkFoldableSection>
			<MkFoldableSection>
				<template #header><i class="ti ti-comet"></i>{{ i18n.ts.popularPosts }}</template>
				<MkPagination v-slot="{items}" :paginator="popularPostsPaginator">
					<div :class="$style.items">
						<MkGalleryPostPreview v-for="post in items" :key="post.id" :post="post" class="post"/>
					</div>
				</MkPagination>
			</MkFoldableSection>
		</div>
		<div v-else-if="tab === 'liked'">
			<MkPagination v-slot="{items}" :paginator="likedPostsPaginator">
				<div :class="$style.items">
					<MkGalleryPostPreview v-for="like in items" :key="like.id" :post="like.post" class="post"/>
				</div>
			</MkPagination>
		</div>
		<div v-else-if="tab === 'my'" class="_gaps">
			<MkButton @click="create()"><i class="ti ti-plus"></i> {{ i18n.ts.postToGallery }}</MkButton>
			<MkPagination v-slot="{items}" :paginator="myPostsPaginator">
				<div :class="$style.items">
					<MkGalleryPostPreview v-for="post in items" :key="post.id" :post="post" class="post"/>
				</div>
			</MkPagination>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { watch, ref, computed, markRaw } from 'vue';
import MkButton from '@/components/MkButton.vue';
import MkTab from '@/components/MkTab.vue';
import type { Tab } from '@/components/MkTab.vue';
import { useContentHub } from '@/utility/content-hub.js';
import MkFoldableSection from '@/components/MkFoldableSection.vue';
import MkPagination from '@/components/MkPagination.vue';
import MkGalleryPostPreview from '@/components/MkGalleryPostPreview.vue';
import { definePage } from '@/page.js';
import { i18n } from '@/i18n.js';
import { $i } from '@/i.js';
import { useRouter } from '@/router.js';
import { Paginator } from '@/utility/paginator.js';

const router = useRouter();

const props = defineProps<{
	tag?: string;
}>();

const hub = useContentHub('gallery');
const tab = ref<'explore' | 'my' | 'liked'>('explore');
const tagsRef = ref();

const recentPostsPaginator = markRaw(new Paginator('gallery/posts', {
	limit: 6,
}));
const popularPostsPaginator = markRaw(new Paginator('gallery/featured', {
	noPaging: true,
}));
const myPostsPaginator = markRaw(new Paginator('i/gallery/posts', {
	limit: 5,
}));
const likedPostsPaginator = markRaw(new Paginator('i/gallery/likes', {
	limit: 5,
}));

watch(() => props.tag, () => {
	if (tagsRef.value) tagsRef.value.tags.toggleContent(props.tag == null);
});

function create() {
	router.push('/gallery/new');
}

const headerActions = computed(() => [{
	icon: 'ti ti-plus',
	text: i18n.ts.create,
	handler: create,
}]);

const allSubTabs: Tab<'explore' | 'my' | 'liked'>[] = [
	{ key: 'explore', label: i18n.ts.gallery, icon: 'ti ti-icons' },
	{ key: 'my', label: i18n.ts._gallery.my, icon: 'ti ti-edit' },
	{ key: 'liked', label: i18n.ts._gallery.liked, icon: 'ti ti-heart' },
];

// 「自分の投稿」「いいね」はログイン時だけ出す
const subTabs = computed(() => $i ? allSubTabs : allSubTabs.slice(0, 1));

definePage(() => hub.metadata);
</script>

<style lang="scss" module>
.subTabs {
	margin-bottom: var(--MI-margin);
}

.items {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
	grid-gap: 12px;
}
</style>

<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :tab="hub.tab" :actions="headerActions" :tabs="hub.tabs.value" :swipable="false">
	<div class="_spacer _profileContent">
		<MkTab v-model="tab" :tabs="subTabs" :class="$style.subTabs"/>
		<div v-if="tab === 'featured'" class="_gaps">
			<MkFoldableSection>
				<template #header><i class="ti ti-clock"></i>{{ i18n.ts.recentPosts }}</template>
				<MkPagination v-slot="{items}" :paginator="recentPagesPaginator">
					<div class="_cardGrid">
						<MkPagePreview v-for="page in items" :key="page.id" :page="page"/>
					</div>
				</MkPagination>
			</MkFoldableSection>
			<MkFoldableSection>
				<template #header><i class="ti ti-comet"></i>{{ i18n.ts.popularPosts }}</template>
				<MkPagination v-slot="{items}" :paginator="featuredPagesPaginator">
					<div class="_cardGrid">
						<MkPagePreview v-for="page in items" :key="page.id" :page="page"/>
					</div>
				</MkPagination>
			</MkFoldableSection>
		</div>

		<div v-else-if="tab === 'my'" class="_gaps">
			<MkButton @click="create()"><i class="ti ti-plus"></i> {{ i18n.ts.create }}</MkButton>
			<MkPagination v-slot="{items}" :paginator="myPagesPaginator">
				<div class="_cardGrid">
					<MkPagePreview v-for="page in items" :key="page.id" :page="page"/>
				</div>
			</MkPagination>
		</div>

		<div v-else-if="tab === 'liked'">
			<MkPagination v-slot="{items}" :paginator="likedPagesPaginator">
				<div class="_cardGrid">
					<MkPagePreview v-for="like in items" :key="like.page.id" :page="like.page"/>
				</div>
			</MkPagination>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, markRaw, ref } from 'vue';
import MkFoldableSection from '@/components/MkFoldableSection.vue';
import MkPagePreview from '@/components/MkPagePreview.vue';
import MkPagination from '@/components/MkPagination.vue';
import MkButton from '@/components/MkButton.vue';
import MkTab from '@/components/MkTab.vue';
import type { Tab } from '@/components/MkTab.vue';
import { useContentHub } from '@/utility/content-hub.js';
import { i18n } from '@/i18n.js';
import { $i } from '@/i.js';
import { definePage } from '@/page.js';
import { useRouter } from '@/router.js';
import { Paginator } from '@/utility/paginator.js';

const router = useRouter();

const hub = useContentHub('pages');
const tab = ref<'featured' | 'my' | 'liked'>('featured');

const recentPagesPaginator = markRaw(new Paginator('pages/recent', {
	limit: 6,
}));
const featuredPagesPaginator = markRaw(new Paginator('pages/featured', {
	noPaging: true,
}));
const myPagesPaginator = markRaw(new Paginator('i/pages', {
	limit: 5,
}));
const likedPagesPaginator = markRaw(new Paginator('i/page-likes', {
	limit: 5,
}));

function create() {
	router.push('/pages/new');
}

const headerActions = computed(() => [{
	icon: 'ti ti-plus',
	text: i18n.ts.create,
	handler: create,
}]);

const allSubTabs: Tab<'featured' | 'my' | 'liked'>[] = [
	{ key: 'featured', label: i18n.ts._pages.posts, icon: 'ti ti-note' },
	{ key: 'my', label: i18n.ts._pages.my, icon: 'ti ti-edit' },
	{ key: 'liked', label: i18n.ts._pages.liked, icon: 'ti ti-heart' },
];

// 「自分の投稿」「いいね」はログイン時だけ出す
const subTabs = computed(() => $i ? allSubTabs : allSubTabs.slice(0, 1));

definePage(() => hub.metadata);
</script>

<style lang="scss" module>
.subTabs {
	margin-bottom: var(--MI-margin);
}
</style>

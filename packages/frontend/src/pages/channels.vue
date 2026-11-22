<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :tab="hub.tab" :actions="headerActions" :tabs="hub.tabs.value" :swipable="false">
	<div class="_spacer _profileContent">
		<MkTab v-model="tab" :tabs="subTabs" :class="$style.subTabs"/>
		<div v-if="tab === 'search'" class="_gaps">
			<div class="_gaps">
				<MkInput v-model="searchQuery" :large="true" :autofocus="true" type="search" @enter="search">
					<template #prefix><i class="ti ti-search"></i></template>
				</MkInput>
				<MkRadios
					v-model="searchType"
					:options="[
						{ value: 'nameAndDescription', label: i18n.ts._channel.nameAndDescription },
						{ value: 'nameOnly', label: i18n.ts._channel.nameOnly },
					]"
					@update:modelValue="search()"
				>
				</MkRadios>
				<MkButton large primary gradate rounded @click="search">{{ i18n.ts.search }}</MkButton>
			</div>

			<MkFoldableSection v-if="channelPaginator">
				<template #header>{{ i18n.ts.searchResult }}</template>
				<MkPagination v-slot="{items}" :key="key" :paginator="channelPaginator">
					<div class="_cardGrid">
						<MkChannelPreview v-for="channel in items" :key="channel.id" :channel="channel"/>
					</div>
				</MkPagination>
			</MkFoldableSection>
		</div>
		<div v-else-if="tab === 'featured'" class="_gaps">
			<MkFoldableSection>
				<template #header><i class="ti ti-clock"></i>{{ i18n.ts._channel.recentlyUpdated }}</template>
				<MkPagination v-slot="{items}" :paginator="recentPaginator">
					<div class="_cardGrid">
						<MkChannelPreview v-for="channel in items" :key="channel.id" :channel="channel"/>
					</div>
				</MkPagination>
			</MkFoldableSection>
			<MkFoldableSection>
				<template #header><i class="ti ti-comet"></i>{{ i18n.ts._channel.popular }}</template>
				<MkPagination v-slot="{items}" :paginator="popularPaginator">
					<div class="_cardGrid">
						<MkChannelPreview v-for="channel in items" :key="channel.id" :channel="channel"/>
					</div>
				</MkPagination>
			</MkFoldableSection>
		</div>
		<div v-else-if="tab === 'favorites'">
			<MkPagination v-slot="{items}" :paginator="favoritesPaginator">
				<div class="_cardGrid">
					<MkChannelPreview v-for="channel in items" :key="channel.id" :channel="channel"/>
				</div>
			</MkPagination>
		</div>
		<div v-else-if="tab === 'following'">
			<MkPagination v-slot="{items}" :paginator="followingPaginator">
				<div class="_cardGrid">
					<MkChannelPreview v-for="channel in items" :key="channel.id" :channel="channel"/>
				</div>
			</MkPagination>
		</div>
		<div v-else-if="tab === 'owned'" class="_gaps">
			<MkButton v-if="$i?.policies.canCreateChannel" type="routerLink" primary rounded to="/channels/new"><i class="ti ti-plus"></i> {{ i18n.ts.createNew }}</MkButton>
			<MkPagination v-slot="{items}" :paginator="ownedPaginator">
				<div class="_cardGrid">
					<MkChannelPreview v-for="channel in items" :key="channel.id" :channel="channel"/>
				</div>
			</MkPagination>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, markRaw, onMounted, ref, shallowRef } from 'vue';
import MkChannelPreview from '@/components/MkChannelPreview.vue';
import MkPagination from '@/components/MkPagination.vue';
import MkInput from '@/components/MkInput.vue';
import MkRadios from '@/components/MkRadios.vue';
import MkButton from '@/components/MkButton.vue';
import MkFoldableSection from '@/components/MkFoldableSection.vue';
import MkTab from '@/components/MkTab.vue';
import type { Tab } from '@/components/MkTab.vue';
import { useContentHub } from '@/utility/content-hub.js';
import { definePage } from '@/page.js';
import { i18n } from '@/i18n.js';
import { useRouter } from '@/router.js';
import { Paginator } from '@/utility/paginator.js';
import { $i } from '@/i.js';

const router = useRouter();

type SearchType = 'nameAndDescription' | 'nameOnly';

const props = defineProps<{
	query: string;
	type?: SearchType;
}>();

const key = ref('');
const hub = useContentHub('channels');
const tab = ref<'search' | 'featured' | 'favorites' | 'following' | 'owned'>('featured');
const searchQuery = ref('');
const searchType = ref<SearchType>('nameAndDescription');
const channelPaginator = shallowRef<Paginator<'channels/search'>>();

onMounted(() => {
	searchQuery.value = props.query ?? '';
	searchType.value = props.type ?? 'nameAndDescription';
});

const recentPaginator = markRaw(new Paginator('channels/featured', {
	noPaging: true,
}));
const popularPaginator = markRaw(new Paginator('channels/featured', {
	params: { sort: 'popular' },
	noPaging: true,
}));
const favoritesPaginator = markRaw(new Paginator('channels/my-favorites', {
	limit: 100,
	noPaging: true,
}));
const followingPaginator = markRaw(new Paginator('channels/followed', {
	limit: 10,
}));
const ownedPaginator = markRaw(new Paginator('channels/owned', {
	limit: 10,
}));

async function search() {
	const query = searchQuery.value.toString().trim();

	if (query == null) return;

	const type = searchType.value.toString().trim();

	if (type !== 'nameAndDescription' && type !== 'nameOnly') {
		console.error(`Unrecognized search type: ${type}`);
		return;
	}

	channelPaginator.value = markRaw(new Paginator('channels/search', {
		limit: 10,
		params: {
			query: searchQuery.value,
			type: type,
		},
	}));

	key.value = query + type;
}

const headerActions = computed(() => $i?.policies.canCreateChannel ? [{
	icon: 'ti ti-plus',
	text: i18n.ts.createNew,
	handler: () => router.push('/channels/new'),
}] : []);

type ChannelTab = Tab<'search' | 'featured' | 'favorites' | 'following' | 'owned'>;

const subTabs = computed<ChannelTab[]>(() => {
	const tabs: ChannelTab[] = [
		{ key: 'featured', label: i18n.ts._channel.featured, icon: 'ti ti-comet' },
		{ key: 'search', label: i18n.ts.search, icon: 'ti ti-search' },
	];
	if ($i) {
		tabs.push(
			{ key: 'favorites', label: i18n.ts.favorites, icon: 'ti ti-star' },
			{ key: 'following', label: i18n.ts._channel.following, icon: 'ti ti-eye' },
			{ key: 'owned', label: i18n.ts._channel.owned, icon: 'ti ti-edit' },
		);
	}
	return tabs;
});

definePage(() => hub.metadata);
</script>

<style lang="scss" module>
.subTabs {
	margin-bottom: var(--MI-margin);
}
</style>

<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader v-model:tab="tab" :actions="headerActions" :tabs="headerTabs" :swipable="true">
	<div v-if="tab === 'search'">
		<XSearch v-bind="searchProps"/>
	</div>
	<div v-else-if="tab === 'featured'">
		<XFeatured/>
	</div>
	<div v-else-if="tab === 'users'">
		<XUsers/>
	</div>
	<div v-else-if="tab === 'roles'">
		<XRoles/>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, ref } from 'vue';
import XFeatured from './explore.featured.vue';
import XUsers from './explore.users.vue';
import XRoles from './explore.roles.vue';
import { definePage } from '@/page.js';
import { i18n } from '@/i18n.js';
import { useRouter } from '@/router.js';

const XSearch = defineAsyncComponent(() => import('./search.vue'));

// /search も このページで表示する (検索は explore の「検索」タブに統合)
const props = withDefaults(defineProps<{
	initialTab?: string;
	query?: string;
	userId?: string;
	username?: string;
	host?: string | null;
	type?: 'note' | 'user';
	origin?: 'combined' | 'local' | 'remote';
}>(), {
	initialTab: 'featured',
	query: undefined,
	userId: undefined,
	username: undefined,
	host: undefined,
	type: undefined,
	origin: undefined,
});

const router = useRouter();
const isSearchRoute = router.currentRoute.value.path === '/search';
const tab = ref(isSearchRoute || props.query ? 'search' : props.initialTab);

const searchProps = computed(() => ({
	query: props.query,
	userId: props.userId,
	username: props.username,
	host: props.host,
	type: props.type,
	origin: props.origin,
}));

const headerActions = computed(() => []);

const headerTabs = computed(() => [{
	key: 'search',
	icon: 'ti ti-search',
	title: i18n.ts.search,
}, {
	key: 'featured',
	icon: 'ti ti-bolt',
	title: i18n.ts.featured,
}, {
	key: 'users',
	icon: 'ti ti-users',
	title: i18n.ts.users,
}, {
	key: 'roles',
	icon: 'ti ti-badges',
	title: i18n.ts.roles,
}]);

definePage(() => ({
	title: i18n.ts.explore,
	icon: 'ti ti-hash',
}));
</script>

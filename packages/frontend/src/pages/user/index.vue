<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader v-model:tab="tab" :tabs="headerTabs" :swipable="tab !== 'files'">
	<div v-if="user">
		<XHome v-if="tab === 'home'" :user="user" :refreshUser="refreshUser" @showMoreFiles="() => { tab = 'files'; }"/>
		<XNotes v-else-if="tab === 'notes'" :user="user"/>
		<XFiles v-else-if="tab === 'files'" :user="user"/>
		<XActivity v-else-if="tab === 'activity'" :user="user"/>
		<XAchievements v-else-if="tab === 'achievements'" :user="user"/>
		<XStreamingResourcesTab v-else-if="tab === 'video-archive'" :key="user.id + ':video'" :user="user" :fieldName="streamingVideoArchiveFieldName" :saving="savingResources" :saveEntries="saveResourceEntries"/>
		<XStreamingResourcesTab v-else-if="tab === 'goods-services'" :key="user.id + ':goods'" :user="user" :fieldName="streamingGoodsServicesFieldName" :saving="savingResources" :saveEntries="saveResourceEntries"/>
		<div v-else-if="tab === 'custom-emojis'" class="_spacer _profileContent">
			<XEmojiList :emojis="streamerEmojis"/>
		</div>
		<XPages v-else-if="tab === 'pages'" :user="user"/>
		<XGallery v-else-if="tab === 'gallery'" :user="user"/>
		<XCommunity v-else-if="tab === 'community'" :key="user.id" :user="user"/>
		<div v-else-if="tab === 'hashtags'" class="_spacer _profileContent">
			<XStreamerOverview v-if="user.host == null && user.isStreamer" :key="user.id" :user="user" hashtagsOnly/>
			<MkInfo v-else>{{ i18n.ts.noNotes }}</MkInfo>
		</div>
		<XRaw v-else-if="tab === 'raw'" :user="user"/>
	</div>
	<MkError v-else-if="error" @retry="fetchUser()"/>
	<MkLoading v-else/>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { defineAsyncComponent, computed, watch, ref } from 'vue';
import * as Misskey from 'misskey-js';
import { acct as getAcct } from '@@/js/user.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { getUserProfileTabs } from '@/utility/user-profile-tabs.js';
import { definePage } from '@/page.js';
import { i18n } from '@/i18n.js';
import { customEmojis } from '@/custom-emojis.js';
import MkCustomEmoji from '@/components/global/MkCustomEmoji.vue';
import MkInfo from '@/components/MkInfo.vue';
import XStreamingResourcesTab from './streaming-resources-tab.vue';
import { streamingGoodsServicesFieldName, streamingVideoArchiveFieldName } from '@/utility/streaming-overview.js';
import { saveStreamingResources } from '@/utility/streaming-resource-draft.js';
import { $i } from '@/i.js';
import type { StreamingResource, streamingResourceFieldNames } from '@/utility/streaming-overview.js';
import { serverContext, assertServerContext } from '@/server-context.js';

const XHome = defineAsyncComponent(() => import('./home.vue'));
const XNotes = defineAsyncComponent(() => import('./notes.vue'));
const XEmojiList = defineAsyncComponent(() => import('../emojis.list.vue'));
const XFiles = defineAsyncComponent(() => import('./files.vue'));
const XActivity = defineAsyncComponent(() => import('./activity.vue'));
const XAchievements = defineAsyncComponent(() => import('./achievements.vue'));
const XPages = defineAsyncComponent(() => import('./pages.vue'));
const XGallery = defineAsyncComponent(() => import('./gallery.vue'));
const XCommunity = defineAsyncComponent(() => import('./community.vue'));
const XStreamerOverview = defineAsyncComponent(() => import('./streamer-overview.vue'));
const XRaw = defineAsyncComponent(() => import('./raw.vue'));

// contextは非ログイン状態の情報しかないためログイン時は利用できない
const CTX_USER = !$i && assertServerContext(serverContext, 'user') ? serverContext.user : null;

const props = withDefaults(defineProps<{
	acct: string;
	page?: string;
}>(), {
	page: 'home',
});

const tab = ref('home');

const user = ref<null | Misskey.entities.UserDetailed>(CTX_USER);
const error = ref<any>(null);

// 初回読込時専用（使える場合はサーバーコンテキストから取得する）
function fetchUser(): void {
	if (props.acct == null) return;

	const { username, host } = Misskey.acct.parse(props.acct);

	if (CTX_USER && CTX_USER.username === username && CTX_USER.host === host) {
		user.value = CTX_USER;
		return;
	}

	user.value = null;
	misskeyApi('users/show', {
		username,
		host,
	}).then(u => {
		user.value = u;
	}).catch(err => {
		error.value = err;
	});
}

watch(() => props.acct, fetchUser, {
	immediate: true,
});

// 再読込時専用（強制fetch）
async function refreshUser(): Promise<void> {
	if (props.acct == null) return;

	const { username, host } = Misskey.acct.parse(props.acct);
	user.value = await misskeyApi('users/show', { username, host });
}

const savingResources = ref(false);

async function saveResourceEntries(fieldName: typeof streamingResourceFieldNames[number], entries: StreamingResource[]) {
	const profile = user.value;
	if (!$i || !profile || profile.host !== null || profile.id !== $i.id || savingResources.value) return false;

	savingResources.value = true;
	try {
		const updates = await saveStreamingResources(fieldName, entries);
		if (updates && user.value?.id === profile.id) Object.assign(user.value, updates);
		return updates != null;
	} finally {
		savingResources.value = false;
	}
}

const streamerEmojis = computed(() => {
	const profile = user.value;
	if (profile?.host !== null || !profile.isStreamer) return [];

	return customEmojis.value.filter(emoji => emoji.streamerId === profile.id && emoji.isStreamerOwned && !emoji.isSensitive);
});

const headerTabs = computed(() => user.value ? getUserProfileTabs(user.value) : []);

watch([() => props.acct, () => props.page, () => user.value?.id], ([, page]) => {
	tab.value = page === 'files' || headerTabs.value.some(item => item.key === page) ? page : 'home';
}, { immediate: true });

definePage(() => ({
	title: i18n.ts.user,
	icon: 'ti ti-user',
	...user.value ? {
		title: user.value.name ? `${user.value.name} (@${user.value.username})` : `@${user.value.username}`,
		subtitle: `@${getAcct(user.value)}`,
		userName: user.value,
		avatar: user.value,
		path: `/@${user.value.username}`,
		share: {
			title: user.value.name,
		},
	} : {},
}));
</script>

<style lang="scss" module>

</style>

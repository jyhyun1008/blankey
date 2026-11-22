/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { computed, onScopeDispose, shallowRef } from 'vue';
import type * as Misskey from 'misskey-js';
import type { Tab } from '@/components/global/MkPageHeader.tabs.vue';
import type { PageMetadata } from '@/page.js';
import { i18n } from '@/i18n.js';
import { useRouter } from '@/router.js';
import { misskeyApi } from '@/utility/misskey-api.js';

// 「コンテンツ」ハブ: ブログ・ギャラリー・映像・グッズ・チャンネルの一覧ページを 1 つのメニューにまとめる。
// 各ページはヘッダーのタブで互いに移動し、ページ固有の絞り込みは本文の MkTab に置く。
export const contentHubPaths = {
	pages: '/pages',
	gallery: '/gallery',
	videos: '/videos',
	goods: '/goods',
	channels: '/channels',
} as const;

export type ContentHubKey = keyof typeof contentHubPaths;

export function useContentHub(current: ContentHubKey) {
	const router = useRouter();

	const tabs = computed<Tab[]>(() => ([
		{ key: 'pages', title: i18n.ts.pages, icon: 'ti ti-news' },
		{ key: 'gallery', title: i18n.ts.gallery, icon: 'ti ti-icons' },
		{ key: 'videos', title: i18n.ts._profile.streamingVideoArchive, icon: 'ti ti-video' },
		{ key: 'goods', title: i18n.ts._profile.streamingGoodsServices, icon: 'ti ti-shopping-bag' },
		{ key: 'channels', title: i18n.ts.channel, icon: 'ti ti-device-tv' },
	] as const).map(tab => ({
		...tab,
		onClick: () => {
			if (tab.key !== current) router.replace(contentHubPaths[tab.key]);
		},
	})));

	const metadata: PageMetadata = {
		title: i18n.ts.contentHub,
		icon: 'ti ti-layout-grid',
	};

	return { tab: current, tabs, metadata };
}

/**
 * ローカルの配信者アカウント一覧。ピン留めユーザーに配信者がいればそれを、いなければローカルユーザーから探す。
 * (配信アーカイブやグッズはプロフィールのフィールドに保存されているので、ここから集める)
 */
export function useLocalStreamers() {
	const creators = shallowRef<Misskey.entities.UserDetailed[] | null>();
	const controller = new AbortController();
	onScopeDispose(() => controller.abort());

	const isLocalStreamer = (user: Misskey.entities.UserDetailed) => user.host === null && user.isStreamer;

	misskeyApi('pinned-users', {}, undefined, controller.signal).then(async result => {
		const pinned = result.filter(isLocalStreamer);
		const localUsers = await misskeyApi('users', { origin: 'local', sort: '+createdAt', limit: 100 }, undefined, controller.signal);
		const seen = new Set(pinned.map(user => user.id));
		return [...pinned, ...localUsers.filter(user => isLocalStreamer(user) && !seen.has(user.id))];
	}).then(result => {
		creators.value = result;
	}, () => {
		if (!controller.signal.aborted) creators.value = null;
	});

	return creators;
}

/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type * as Misskey from 'misskey-js';
import type { Tab } from '@/components/global/MkPageHeader.tabs.vue';
import { i18n } from '@/i18n.js';

export function getUserProfileTabs(user: Pick<Misskey.entities.UserLite, 'host'> & { isStreamer?: boolean }): Tab[] {
	const isLocal = user.host === null;
	const isStreamer = isLocal && user.isStreamer;
	return [{
		key: 'home',
		title: i18n.ts.home,
		icon: 'ti ti-home',
	}, {
		key: 'notes',
		title: i18n.ts.notes,
		icon: 'ti ti-pencil',
	}, ...(isLocal ? [{
		key: 'video-archive',
		title: i18n.ts._profile.streamingVideoArchive,
		icon: 'ti ti-video',
	}] : []), {
		key: 'pages',
		title: i18n.ts._profile.profileBlog,
		icon: 'ti ti-news',
	}, {
		key: 'gallery',
		title: i18n.ts.gallery,
		icon: 'ti ti-icons',
	}, ...(isLocal ? [{
		key: 'goods-services',
		title: i18n.ts._profile.streamingGoodsServices,
		icon: 'ti ti-shopping-bag',
	}] : []), {
		key: 'community',
		title: i18n.ts._profile.streamingCommunity,
		icon: 'ti ti-users',
	}, ...(isStreamer ? [{
		key: 'hashtags',
		title: i18n.ts.hashtags,
		icon: 'ti ti-hash',
	}, {
		key: 'custom-emojis',
		title: i18n.ts.customEmojis,
		icon: 'ti ti-mood-smile',
	}] : []), ...(isLocal ? [{
		key: 'achievements',
		title: i18n.ts.achievements,
		icon: 'ti ti-medal',
	}] : []), {
		key: 'activity',
		title: i18n.ts.activity,
		icon: 'ti ti-chart-line',
	}, {
		key: 'raw',
		title: 'Raw',
		icon: 'ti ti-code',
	}];
}

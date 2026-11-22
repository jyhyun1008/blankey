/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { computed, ref, watch } from 'vue';
import type * as Misskey from 'misskey-js';
import { acct, userName } from '@@/js/user.js';
import { $i } from '@/i.js';
import type { PageMetadata } from '@/page.js';
import { useRouter } from '@/router.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { getUserProfileTabs } from '@/utility/user-profile-tabs.js';

export function useUserProfileLinks(getAuthor: () => Misskey.entities.UserLite | undefined, getIsStreamer?: () => boolean | undefined) {
	const router = useRouter();
	const streamerId = ref<string>();

	watch(() => getAuthor()?.id, (authorId, _, onCleanup) => {
		streamerId.value = undefined;
		if (getIsStreamer || !authorId || getAuthor()?.host !== null || $i?.id === authorId) return;

		const controller = new AbortController();
		onCleanup(() => controller.abort());
		void misskeyApi('users/show', { userId: authorId }, undefined, controller.signal).then(author => {
			if (!controller.signal.aborted && author.isStreamer) streamerId.value = author.id;
		}).catch(() => {
			// The remaining tabs are available without the detailed profile.
		});
	}, { immediate: true });

	const profileMetadata = computed<PageMetadata | undefined>(() => {
		const author = getAuthor();
		if (!author) return undefined;

		const handle = `@${acct(author)}`;
		return {
			title: `${userName(author)} (${handle})`,
			subtitle: handle,
			avatar: author,
			userName: author,
		};
	});

	const profileTabs = computed(() => {
		const author = getAuthor();
		if (!author) return [];

		return getUserProfileTabs({
			host: author.host,
			isStreamer: getIsStreamer ? getIsStreamer() : ($i?.id === author.id ? $i.isStreamer : streamerId.value === author.id),
		}).map(tab => ({
			...tab,
			onClick: () => {
				router.push('/@:acct/:page?', {
					params: { acct: acct(author), page: tab.key === 'home' ? undefined : tab.key },
				});
			},
		}));
	});

	return { profileMetadata, profileTabs };
}

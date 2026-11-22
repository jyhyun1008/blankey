<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader v-model:tab="tab" :actions="headerActions" :tabs="headerTabs" :swipable="true">
	<div class="_spacer" style="--MI_SPACER-w: 700px;">
		<div v-if="channel && tab === 'overview'" class="_gaps">
			<div :class="[$style.banner, { [$style.noBanner]: !channel.bannerUrl }]">
				<img v-if="channel.bannerUrl" :src="channel.bannerUrl" alt="" :class="$style.bannerImage"/>
				<i v-else class="ti ti-device-tv" :class="$style.bannerIcon" aria-hidden="true"></i>
				<span v-if="channel.isSensitive" :class="$style.sensitiveIndicator"><i class="ti ti-eye-exclamation" aria-hidden="true"></i> {{ i18n.ts.sensitive }}</span>
			</div>

			<section class="_panel" :class="$style.info" :style="channel.color ? { '--channelColor': channel.color } : undefined">
				<div :class="$style.infoHead">
					<div :class="$style.infoTitle">
						<h1 :class="$style.name">{{ channel.name }}</h1>
						<div :class="$style.stats">
							<span><i class="ti ti-users" aria-hidden="true"></i> <I18n :src="i18n.ts._channel.usersCount" tag="span"><template #n><b>{{ channel.usersCount }}</b></template></I18n></span>
							<span><i class="ti ti-pencil" aria-hidden="true"></i> <I18n :src="i18n.ts._channel.notesCount" tag="span"><template #n><b>{{ channel.notesCount }}</b></template></I18n></span>
							<span v-if="$i != null && $i.id === channel.userId" :class="$style.adminBadge"><i class="ti ti-user-star" aria-hidden="true"></i> {{ i18n.ts.youAreAdmin }}</span>
						</div>
					</div>
					<div :class="$style.infoActions">
						<MkButton v-if="favorited" v-tooltip="i18n.ts.unfavorite" :aria-label="i18n.ts.unfavorite" asLike rounded primary @click="unfavorite()"><i class="ti ti-star-filled"></i></MkButton>
						<MkButton v-else v-tooltip="i18n.ts.favorite" :aria-label="i18n.ts.favorite" asLike rounded @click="favorite()"><i class="ti ti-star"></i></MkButton>
						<XChannelFollowButton :channel="channel" :full="true"/>
					</div>
				</div>
				<div v-if="channel.description" :class="$style.description">
					<Mfm :text="channel.description" :isNote="false"/>
				</div>
			</section>

			<MkFoldableSection>
				<template #header><i class="ti ti-pin ti-fw" style="margin-right: 0.5em;"></i>{{ i18n.ts.pinnedNotes }}</template>
				<div v-if="channel.pinnedNotes && channel.pinnedNotes.length > 0" class="_gaps">
					<MkNote v-for="note in channel.pinnedNotes" :key="note.id" class="_panel" :note="note"/>
				</div>
			</MkFoldableSection>
		</div>
		<div v-if="channel && tab === 'timeline'" class="_gaps">
			<MkInfo v-if="channel.isArchived" warn>{{ i18n.ts.thisChannelArchived }}</MkInfo>

			<!-- スマホ・タブレットの場合、キーボードが表示されると投稿が見づらくなるので、デスクトップ場合のみ自動でフォーカスを当てる -->
			<MkPostForm v-if="$i && prefer.r.showFixedPostFormInChannel.value" :channel="channel" class="post-form _panel" fixed :autofocus="deviceKind === 'desktop'"/>

			<MkStreamingNotesTimeline :key="channelId" src="channel" :channel="channelId"/>
		</div>
		<div v-else-if="tab === 'featured'">
			<MkNotesTimeline :paginator="featuredPaginator"/>
		</div>
		<div v-else-if="tab === 'search'">
			<div v-if="notesSearchAvailable" class="_gaps">
				<div>
					<MkInput v-model="searchQuery" @enter="search()">
						<template #prefix><i class="ti ti-search"></i></template>
					</MkInput>
					<MkButton primary rounded style="margin-top: 8px;" @click="search()">{{ i18n.ts.search }}</MkButton>
				</div>
				<MkNotesTimeline v-if="searchPaginator" :key="searchKey" :paginator="searchPaginator"/>
			</div>
			<div v-else>
				<MkInfo warn>{{ i18n.ts.notesSearchNotAvailable }}</MkInfo>
			</div>
		</div>
	</div>
	<template #footer>
		<div :class="$style.footer">
			<div class="_spacer" style="--MI_SPACER-w: 700px; --MI_SPACER-min: 16px; --MI_SPACER-max: 16px;">
				<div class="_buttonsCenter">
					<MkButton inline rounded primary gradate @click="openPostForm()"><i class="ti ti-pencil"></i> {{ i18n.ts.postToTheChannel }}</MkButton>
				</div>
			</div>
		</div>
	</template>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, watch, ref, markRaw, shallowRef } from 'vue';
import * as Misskey from 'misskey-js';
import { url } from '@@/js/config.js';
import { useInterval } from '@@/js/use-interval.js';
import type { PageHeaderItem } from '@/types/page-header.js';
import MkPostForm from '@/components/MkPostForm.vue';
import MkStreamingNotesTimeline from '@/components/MkStreamingNotesTimeline.vue';
import XChannelFollowButton from '@/components/MkChannelFollowButton.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { $i, iAmModerator } from '@/i.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import { deviceKind } from '@/utility/device-kind.js';
import MkNotesTimeline from '@/components/MkNotesTimeline.vue';
import { favoritedChannelsCache } from '@/cache.js';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import { prefer } from '@/preferences.js';
import MkNote from '@/components/MkNote.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkFoldableSection from '@/components/MkFoldableSection.vue';
import { isSupportShare } from '@/utility/navigator.js';
import { copyToClipboard } from '@/utility/copy-to-clipboard.js';
import { notesSearchAvailable } from '@/utility/check-permissions.js';
import { miLocalStorage } from '@/local-storage.js';
import { useRouter } from '@/router.js';
import { Paginator } from '@/utility/paginator.js';

const router = useRouter();

const props = defineProps<{
	channelId: string;
}>();

const tab = ref('overview');

const channel = ref<Misskey.entities.Channel | null>(null);
const favorited = ref(false);
const searchQuery = ref('');
const searchPaginator = shallowRef();
const searchKey = ref('');
const featuredPaginator = markRaw(new Paginator('notes/featured', {
	limit: 10,
	computedParams: computed(() => ({
		channelId: props.channelId,
	})),
}));

useInterval(() => {
	if (channel.value == null) return;
	miLocalStorage.setItemAsJson(`channelLastReadedAt:${channel.value.id}`, Date.now());
}, 3000, {
	immediate: true,
	afterMounted: true,
});

watch(() => props.channelId, async () => {
	const _channel = await misskeyApi('channels/show', {
		channelId: props.channelId,
	});

	favorited.value = _channel.isFavorited ?? false;
	if (favorited.value || _channel.isFollowing) {
		tab.value = 'timeline';
	}

	if ((favorited.value || _channel.isFollowing) && _channel.lastNotedAt) {
		const lastReadedAt: number = miLocalStorage.getItemAsJson(`channelLastReadedAt:${_channel.id}`) ?? 0;
		const lastNotedAt = Date.parse(_channel.lastNotedAt);

		if (lastNotedAt > lastReadedAt) {
			miLocalStorage.setItemAsJson(`channelLastReadedAt:${_channel.id}`, lastNotedAt);
		}
	}

	channel.value = _channel;
}, { immediate: true });

function edit() {
	router.push('/channels/:channelId/edit', {
		params: {
			channelId: props.channelId,
		},
	});
}

function openPostForm() {
	os.post({
		channel: channel.value,
	});
}

function favorite() {
	if (!channel.value) return;

	os.apiWithDialog('channels/favorite', {
		channelId: channel.value.id,
	}).then(() => {
		favorited.value = true;
		favoritedChannelsCache.delete();
	});
}

async function unfavorite() {
	if (!channel.value) return;

	const confirm = await os.confirm({
		type: 'warning',
		text: i18n.ts.unfavoriteConfirm,
	});
	if (confirm.canceled) return;
	os.apiWithDialog('channels/unfavorite', {
		channelId: channel.value.id,
	}).then(() => {
		favorited.value = false;
		favoritedChannelsCache.delete();
	});
}

async function mute() {
	if (!channel.value) return;
	const _channel = channel.value;

	const { canceled, result: period } = await os.select({
		title: i18n.ts.mutePeriod,
		items: [{
			value: 'indefinitely', label: i18n.ts.indefinitely,
		}, {
			value: 'tenMinutes', label: i18n.ts.tenMinutes,
		}, {
			value: 'oneHour', label: i18n.ts.oneHour,
		}, {
			value: 'oneDay', label: i18n.ts.oneDay,
		}, {
			value: 'oneWeek', label: i18n.ts.oneWeek,
		}],
		default: 'indefinitely',
	});
	if (canceled) return;

	const expiresAt = period === 'indefinitely' ? null
		: period === 'tenMinutes' ? Date.now() + (1000 * 60 * 10)
		: period === 'oneHour' ? Date.now() + (1000 * 60 * 60)
		: period === 'oneDay' ? Date.now() + (1000 * 60 * 60 * 24)
		: period === 'oneWeek' ? Date.now() + (1000 * 60 * 60 * 24 * 7)
		: null;

	os.apiWithDialog('channels/mute/create', {
		channelId: _channel.id,
		expiresAt,
	}).then(() => {
		_channel.isMuting = true;
	});
}

async function unmute() {
	if (!channel.value) return;
	const _channel = channel.value;

	os.apiWithDialog('channels/mute/delete', {
		channelId: _channel.id,
	}).then(() => {
		_channel.isMuting = false;
	});
}

async function search() {
	if (!channel.value) return;

	const query = searchQuery.value.toString().trim();

	if (query == null) return;

	searchPaginator.value = markRaw(new Paginator('notes/search', {
		limit: 10,
		params: {
			query: query,
			channelId: channel.value.id,
		},
	}));

	searchKey.value = query;
}

const headerActions = computed(() => {
	if (channel.value) {
		const headerItems: PageHeaderItem[] = [];

		headerItems.push({
			icon: 'ti ti-link',
			text: i18n.ts.copyUrl,
			handler: async (): Promise<void> => {
				if (!channel.value) {
					console.warn('failed to copy channel URL. channel.value is null.');
					return;
				}
				copyToClipboard(`${url}/channels/${channel.value.id}`);
			},
		});

		if (isSupportShare()) {
			headerItems.push({
				icon: 'ti ti-share',
				text: i18n.ts.share,
				handler: async (): Promise<void> => {
					if (!channel.value) {
						console.warn('failed to share channel. channel.value is null.');
						return;
					}

					navigator.share({
						title: channel.value.name,
						text: channel.value.description ?? undefined,
						url: `${url}/channels/${channel.value.id}`,
					});
				},
			});
		}

		if (!channel.value.isMuting) {
			headerItems.push({
				icon: 'ti ti-volume',
				text: i18n.ts.mute,
				handler: async (): Promise<void> => {
					await mute();
				},
			});
		} else {
			headerItems.push({
				icon: 'ti ti-volume-off',
				text: i18n.ts.unmute,
				handler: async (): Promise<void> => {
					await unmute();
				},
			});
		}

		if (($i && $i.id === channel.value.userId) || iAmModerator) {
			headerItems.push({
				icon: 'ti ti-settings',
				text: i18n.ts.edit,
				handler: edit,
			});
		}

		return headerItems.length > 0 ? headerItems : null;
	} else {
		return null;
	}
});

const headerTabs = computed(() => [{
	key: 'overview',
	title: i18n.ts.overview,
	icon: 'ti ti-info-circle',
}, {
	key: 'timeline',
	title: i18n.ts.timeline,
	icon: 'ti ti-home',
}, {
	key: 'featured',
	title: i18n.ts.featured,
	icon: 'ti ti-bolt',
}, {
	key: 'search',
	title: i18n.ts.search,
	icon: 'ti ti-search',
}]);

definePage(() => ({
	title: channel.value ? channel.value.name : i18n.ts.channel,
	icon: 'ti ti-device-tv',
}));
</script>

<style lang="scss" module>
.footer {
	-webkit-backdrop-filter: var(--MI-blur, blur(15px));
	backdrop-filter: var(--MI-blur, blur(15px));
	background: color(from var(--MI_THEME-bg) srgb r g b / 0.5);
	border-top: solid 0.5px var(--MI_THEME-divider);
}

.banner {
	position: relative;
	display: grid;
	place-items: center;
	aspect-ratio: 3 / 1;
	max-height: 240px;
	width: 100%;
	overflow: hidden;
	border-radius: var(--MI-radius);
	box-shadow: 0 0 0 1px var(--MI-c-border);
}

.noBanner {
	aspect-ratio: 5 / 1;
	background:
		radial-gradient(120% 140% at 0% 0%, var(--MI-c-accentSoft), transparent 60%),
		radial-gradient(90% 120% at 100% 100%, color-mix(in oklab, var(--MI-c-accentSoft) 60%, transparent), transparent 70%),
		var(--MI-c-inset);
}

.bannerImage {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.bannerIcon {
	font-size: 2.2em;
	color: var(--MI-c-accentInk);
	opacity: .6;
}

.sensitiveIndicator {
	position: absolute;
	left: 12px;
	bottom: 12px;
	padding: 3px 10px;
	border-radius: var(--MI-radius-full);
	background: rgb(0 0 0 / 0.65);
	color: var(--MI_THEME-warn);
	font-size: 0.85em;
	font-weight: bold;
}

.info {
	position: relative;
	padding: 18px 20px;

	// チャンネルの色を上辺のアクセントに
	&::before {
		content: "";
		position: absolute;
		top: 0;
		left: 20px;
		right: 20px;
		height: 3px;
		border-radius: 0 0 var(--MI-radius-full) var(--MI-radius-full);
		background: var(--channelColor, var(--MI_THEME-accent));
	}
}

.infoHead {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 12px 16px;
}

.infoTitle {
	min-width: 0;
	flex: 1 1 240px;
}

.name {
	margin: 0;
	font-size: 1.35em;
	line-height: 1.3;
	overflow-wrap: anywhere;
}

.stats {
	display: flex;
	flex-wrap: wrap;
	gap: 4px 14px;
	margin-top: 6px;
	color: var(--MI-c-fgMuted);
	font-size: 0.85em;

	b {
		color: var(--MI_THEME-fg);
	}
}

.adminBadge {
	color: var(--MI_THEME-warn);
}

.infoActions {
	display: flex;
	align-items: center;
	gap: 8px;
	flex: none;
}

.description {
	margin-top: 14px;
	padding-top: 14px;
	border-top: 1px solid var(--MI-c-border);
	line-height: 1.7;
	overflow-wrap: anywhere;
}
</style>

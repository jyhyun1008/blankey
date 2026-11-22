<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<SearchMarker path="/settings/streamer" :label="i18n.ts._profile.streamerSettings" :keywords="['streamer', 'streaming']" icon="ti ti-headset">
	<div class="_gaps_m">
		<MkInfo v-if="!$i.isStreamer" warn>
			{{ i18n.ts._profile.streamerSettingsRequiresStreamer }}
			<MkA to="/settings/profile" class="_link">{{ i18n.ts.profile }}</MkA>
		</MkInfo>

		<template v-else>
			<div class="_gaps_s">
				<SearchMarker :keywords="['emoji', 'custom']">
					<FormLink to="/settings/streamer-emojis">
						<template #icon><i class="ti ti-mood-smile"></i></template>
						<SearchLabel>{{ i18n.ts._profile.streamingCustomEmojis }}</SearchLabel>
					</FormLink>
				</SearchMarker>
				<SearchMarker :keywords="['live', 'obs', 'overlay', 'stream key']">
					<FormLink to="/settings/live">
						<template #icon><i class="ti ti-broadcast"></i></template>
						<SearchLabel>{{ i18n.ts._profile.privateLiveSettings }}</SearchLabel>
					</FormLink>
				</SearchMarker>
			</div>

			<SearchMarker :keywords="['link', 'support']">
				<MkFolder :defaultOpen="true">
					<template #icon><i class="ti ti-link"></i></template>
					<template #label><SearchLabel>{{ i18n.ts._profile.streamingLinks }}</SearchLabel></template>
					<template #footer>
						<MkButton primary :disabled="busy" @click="saveStreamingLinks"><i class="ti ti-check"></i> {{ i18n.ts.save }}</MkButton>
					</template>

					<div class="_gaps_s">
						<MkInfo>{{ i18n.ts._profile.streamingLinksDescription }}</MkInfo>
						<MkInput v-model="streamingChannelUrl" type="url" inputmode="url" placeholder="https://">
							<template #label><SearchLabel>{{ i18n.ts._profile.streamingChannelUrl }}</SearchLabel></template>
						</MkInput>
						<MkInput v-model="streamingSupportUrl" type="url" inputmode="url" placeholder="https://">
							<template #label><SearchLabel>{{ i18n.ts._profile.streamingSupportUrl }}</SearchLabel></template>
							<template #caption>{{ i18n.ts._profile.streamingSupportPlatforms }}</template>
						</MkInput>
					</div>
				</MkFolder>
			</SearchMarker>

			<SearchMarker :keywords="['buy me a coffee', 'support']">
				<MkFolder @opened="loadCoffeeConnection">
					<template #icon><i class="ti ti-coffee"></i></template>
					<template #label><SearchLabel>{{ i18n.ts._profile.coffeeConnectionTitle }}</SearchLabel></template>
					<div class="_gaps_s">
						<MkInfo>{{ i18n.ts._profile.coffeeConnectionHelp }}</MkInfo>
						<MkButton v-if="!coffeeConnection?.webhookUrl" :disabled="coffeeBusy" @click="updateCoffeeConnection({ start: true })">
							{{ i18n.ts._profile.coffeeCreateWebhook }}
						</MkButton>
						<template v-else>
							<MkInput :modelValue="coffeeConnection.webhookUrl" readonly>
								<template #label>{{ i18n.ts._profile.coffeeWebhookUrl }}</template>
							</MkInput>
							<MkInput v-model="coffeeSecret" type="password" autocomplete="off">
								<template #label>{{ i18n.ts._profile.coffeeSigningSecret }}</template>
							</MkInput>
							<MkInfo>{{ coffeeConnection.verified ? i18n.ts._profile.coffeeVerified : i18n.ts._profile.coffeePending }}</MkInfo>
							<div class="_buttons">
								<MkButton primary :disabled="coffeeBusy || coffeeSecret.trim().length < 16" @click="updateCoffeeConnection({ secret: coffeeSecret.trim() })">{{ i18n.ts.save }}</MkButton>
								<MkButton :disabled="coffeeBusy" @click="updateCoffeeConnection({})">{{ i18n.ts.reload }}</MkButton>
								<MkButton danger :disabled="coffeeBusy" @click="disconnectCoffee">{{ i18n.ts._profile.coffeeDisconnect }}</MkButton>
							</div>
						</template>
					</div>
				</MkFolder>
			</SearchMarker>

			<SearchMarker :keywords="['banner']">
				<MkFolder>
					<template #icon><i class="ti ti-photo"></i></template>
					<template #label><SearchLabel>{{ i18n.ts._profile.streamingBanners }}</SearchLabel></template>
					<template #footer>
						<div class="_buttons">
							<MkButton primary :disabled="busy" @click="saveStreamingBanners"><i class="ti ti-check"></i> {{ i18n.ts.save }}</MkButton>
							<MkButton :disabled="streamingBanners.length >= bannerCapacity" @click="addStreamingBanners"><i class="ti ti-plus"></i> {{ i18n.ts.addFile }}</MkButton>
						</div>
					</template>

					<div class="_gaps_s">
						<MkInfo>{{ i18n.ts._profile.streamingBannersDescription }}</MkInfo>
						<ul v-if="streamingBanners.length" :class="$style.bannerPreviews">
							<li v-for="(banner, index) in streamingBanners" :key="banner.imageUrl">
								<img :src="getProxiedImageUrl(banner.imageUrl, 'preview', true, true)" alt="" loading="lazy"/>
								<MkInput v-model="banner.link" type="url" inputmode="url" small placeholder="https://">
									<template #label>{{ i18n.tsx._profile.streamingBannerLink({ n: index + 1 }) }}</template>
								</MkInput>
								<MkButton small :aria-label="i18n.tsx._profile.removeStreamingBanner({ n: index + 1 })" @click="streamingBanners.splice(index, 1)">
									{{ i18n.ts.remove }}
								</MkButton>
							</li>
						</ul>
					</div>
				</MkFolder>
			</SearchMarker>

			<SearchMarker :keywords="['hashtag', 'community', 'channel']">
				<MkFolder @opened="loadCommunityChannels">
					<template #icon><i class="ti ti-hash"></i></template>
					<template #label><SearchLabel>{{ i18n.ts._profile.streamingOverview }}</SearchLabel></template>
					<template #footer>
						<MkButton primary :disabled="busy" @click="saveStreamingOverview"><i class="ti ti-check"></i> {{ i18n.ts.save }}</MkButton>
					</template>

					<div class="_gaps_s">
						<div class="_gaps_s">
							<SearchLabel>{{ i18n.ts._profile.streamingTags }}</SearchLabel>
							<small>{{ i18n.tsx._profile.streamingTagsDescription({ n: maxStreamingTags }) }}</small>
							<div v-for="(entry, index) in streamingTags" :key="entry.id" class="_gaps_s">
								<MkInput v-model="entry.tag" :ariaLabel="i18n.ts.hashtags">
									<template #label>{{ i18n.ts.hashtags }}</template>
									<template #prefix>#</template>
								</MkInput>
								<MkInput v-model="entry.label" :ariaLabel="i18n.ts._profile.streamingTagLabel">
									<template #label>{{ i18n.ts._profile.streamingTagLabel }}</template>
								</MkInput>
								<MkButton small danger @click="streamingTags.splice(index, 1)">{{ i18n.ts.delete }}</MkButton>
							</div>
							<MkButton :disabled="streamingTags.length >= maxStreamingTags" @click="streamingTags.push({ id: genId(), tag: '', label: '' })">
								<i class="ti ti-plus"></i> {{ i18n.ts._profile.addStreamingTag }}
							</MkButton>
						</div>
						<MkSelect v-model="streamingCommunityId" :items="communityChannelItems" :disabled="communityChannelsLoading || checkingCommunity">
							<template #label><SearchLabel>{{ i18n.ts._profile.streamingCommunity }}</SearchLabel></template>
						</MkSelect>
						<MkLoading v-if="communityChannelsLoading"/>
						<MkInfo v-else-if="communityChannelsFailed" warn>{{ i18n.ts.error }}</MkInfo>
					</div>
				</MkFolder>
			</SearchMarker>
		</template>
	</div>
</SearchMarker>
</template>

<script lang="ts" setup>
import { computed, onScopeDispose, ref } from 'vue';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkFolder from '@/components/MkFolder.vue';
import MkInfo from '@/components/MkInfo.vue';
import FormLink from '@/components/form/link.vue';
import { chooseDriveFile } from '@/utility/drive.js';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { ensureSignin } from '@/i.js';
import { definePage } from '@/page.js';
import { genId } from '@/utility/id.js';
import { tryParseUrl } from '@@/js/url.js';
import { getProxiedImageUrl } from '@/utility/media-proxy.js';
import { getStreamingBannerLink, getStreamingBanners, streamingBannerFieldName } from '@/utility/streaming-banners.js';
import { getStreamingPlatformName, streamingChannelFieldName, streamingSupportFieldName } from '@/utility/streaming-platforms.js';
import { getStreamingTagLinks, maxStreamingTags, normalizeStreamingTag, streamingCommunityFieldName, streamingTagsFieldName } from '@/utility/streaming-overview.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { updateCurrentAccount } from '@/accounts.js';

const $i = ensureSignin();

const maxFields = 16;
const savedFields = ref($i.fields);
const savingFields = ref(false);
const checkingCommunity = ref(false);
const busy = computed(() => savingFields.value || checkingCommunity.value);

async function saveFields(nextFields: typeof $i.fields) {
	if (savingFields.value) return;
	if (nextFields.length > maxFields) {
		await os.alert({ type: 'error', text: i18n.ts._profile.profileFieldsLimit });
		return;
	}

	savingFields.value = true;
	try {
		const account = await os.apiWithDialog('i/update', { fields: nextFields });
		savedFields.value = account.fields;
		updateCurrentAccount({ fields: account.fields, verifiedLinks: account.verifiedLinks });
	} catch {
		// エラーダイアログは apiWithDialog 側で表示済み
	} finally {
		savingFields.value = false;
	}
}

function isHttpsUrl(value: string) {
	return value.startsWith('https://') && tryParseUrl(value) != null;
}

// #region 配信リンク
function getStreamingUrl(name: string) {
	const matchingFields = savedFields.value.filter(field => field.name === name);
	const visibleField = matchingFields.find(field => {
		if (!field.value.startsWith('https://')) return false;
		const url = tryParseUrl(field.value);
		return url != null && (name !== streamingSupportFieldName || getStreamingPlatformName(url, 'support') != null);
	});
	return visibleField?.value ?? matchingFields[0]?.value ?? '';
}

const streamingChannelUrl = ref(getStreamingUrl(streamingChannelFieldName));
const streamingSupportUrl = ref(getStreamingUrl(streamingSupportFieldName));

function saveStreamingLinks() {
	const links = [
		{ name: streamingChannelFieldName, value: streamingChannelUrl.value.trim() },
		{ name: streamingSupportFieldName, value: streamingSupportUrl.value.trim() },
	].filter(link => link.value !== getStreamingUrl(link.name).trim());

	if (links.some(link => link.value !== '' && !isHttpsUrl(link.value))) {
		return os.alert({ type: 'error', text: i18n.ts._profile.streamingLinksInvalidUrl });
	}
	const supportLink = links.find(link => link.name === streamingSupportFieldName);
	if (supportLink?.value) {
		const url = tryParseUrl(supportLink.value);
		if (!url || !getStreamingPlatformName(url, 'support')) {
			return os.alert({ type: 'error', text: i18n.ts._profile.streamingSupportPlatforms });
		}
	}
	if (links.length === 0) return;
	return saveFields([
		...savedFields.value.filter(field => !links.some(link => link.name === field.name)),
		...links.filter(link => link.value !== ''),
	]);
}
// #endregion

// #region Buy Me a Coffee
const coffeeConnection = ref<{ webhookUrl: string | null; verified: boolean } | null>(null);
const coffeeSecret = ref('');
const coffeeBusy = ref(false);

async function updateCoffeeConnection(params: { start?: boolean; secret?: string | null }) {
	if (coffeeBusy.value) return;
	coffeeBusy.value = true;
	try {
		coffeeConnection.value = await misskeyApi('i/buy-me-a-coffee', params);
		coffeeSecret.value = '';
	} catch {
		await os.alert({ type: 'error', text: i18n.ts.error });
	} finally {
		coffeeBusy.value = false;
	}
}

function loadCoffeeConnection() {
	if (!coffeeConnection.value) void updateCoffeeConnection({});
}

async function disconnectCoffee() {
	const { canceled } = await os.confirm({ type: 'warning', text: i18n.ts._profile.coffeeDisconnectConfirm });
	if (!canceled) await updateCoffeeConnection({ secret: null });
}
// #endregion

// #region 配信バナー
const streamingBanners = ref(getStreamingBanners(savedFields.value));
const bannerCapacity = computed(() => maxFields - savedFields.value.filter(field => field.name !== streamingBannerFieldName).length);

async function addStreamingBanners() {
	const files = await chooseDriveFile({ multiple: true, excludeSensitive: true });
	const images = files.flatMap(file => {
		if (!file.type.startsWith('image/') || file.isSensitive || !file.thumbnailUrl) return [];
		return [{ name: streamingBannerFieldName, value: file.thumbnailUrl }];
	});
	const banners = getStreamingBanners(images);
	if (banners.length === 0) {
		if (files.length > 0) await os.alert({ type: 'error', text: i18n.ts._profile.streamingBannersImagesOnly });
		return;
	}

	const existingImages = new Set(streamingBanners.value.map(banner => banner.imageUrl));
	const nextBanners = [...streamingBanners.value, ...banners.filter(banner => !existingImages.has(banner.imageUrl))];
	if (nextBanners.length > bannerCapacity.value) {
		await os.alert({ type: 'error', text: i18n.ts._profile.profileFieldsLimit });
		return;
	}
	streamingBanners.value = nextBanners;
}

function saveStreamingBanners() {
	const banners = [];
	for (const { imageUrl, link } of streamingBanners.value) {
		const destination = getStreamingBannerLink(link);
		if (link.trim() !== '' && !destination) {
			return os.alert({ type: 'error', text: i18n.ts._profile.streamingLinksInvalidUrl });
		}
		const value = destination ? JSON.stringify({ imageUrl, link: destination }) : imageUrl;
		banners.push({ name: streamingBannerFieldName, value });
	}
	return saveFields([
		...savedFields.value.filter(field => field.name !== streamingBannerFieldName),
		...banners,
	]);
}
// #endregion

// #region 配信概要 (タグ・コミュニティ)
const overviewFieldNames = [streamingTagsFieldName, streamingCommunityFieldName];
const streamingTags = ref(getStreamingTagLinks(savedFields.value).map(entry => ({ ...entry, id: genId() })));
const savedCommunityId = computed(() => savedFields.value.find(field => field.name === streamingCommunityFieldName)?.value);
const streamingCommunityId = ref(savedCommunityId.value ?? '');
const communityChannels = ref<{ id: string; name: string }[]>([]);
const communityChannelsLoading = ref(false);
const communityChannelsFailed = ref(false);
const communityChannelItems = computed(() => {
	const items = [
		{ value: '', label: i18n.ts.none },
		...communityChannels.value.map(channel => ({ value: channel.id, label: channel.name })),
	];
	const storedId = savedCommunityId.value;
	if (storedId && !items.some(item => item.value === storedId)) {
		items.push({ value: storedId, label: i18n.ts.unavailable });
	}
	return items;
});

const communityChannelsController = new AbortController();
onScopeDispose(() => communityChannelsController.abort());

async function loadCommunityChannels() {
	if (communityChannelsLoading.value) return;

	const { signal } = communityChannelsController;
	communityChannelsLoading.value = true;
	communityChannelsFailed.value = false;
	try {
		const channels: typeof communityChannels.value = [];
		const limit = 100;
		let untilId: string | undefined;
		while (!signal.aborted) {
			const page = await misskeyApi('channels/owned', { limit, untilId }, undefined, signal);
			channels.push(...page.filter(channel => !channel.isSensitive && !channel.isArchived));
			if (page.length < limit) break;
			untilId = page.at(-1)?.id;
		}
		if (!signal.aborted) communityChannels.value = channels;
	} catch {
		if (!signal.aborted) communityChannelsFailed.value = true;
	} finally {
		if (!signal.aborted) communityChannelsLoading.value = false;
	}
}

async function saveStreamingOverview() {
	if (busy.value) return;

	const tags = new Map<string, string>();
	for (const entry of streamingTags.value) {
		if (!entry.tag.trim() && !entry.label.trim()) continue;
		const tag = normalizeStreamingTag(entry.tag);
		if (!tag || tags.has(tag)) {
			return os.alert({ type: 'error', text: i18n.tsx._profile.streamingTagsDescription({ n: maxStreamingTags }) });
		}
		tags.set(tag, entry.label.trim());
	}
	const tagLinks = Array.from(tags, ([tag, label]) => ({ tag, label }));

	const channelId = streamingCommunityId.value;

	checkingCommunity.value = true;
	try {
		const storedId = savedCommunityId.value;
		if (channelId && channelId !== storedId) {
			const channel = await misskeyApi('channels/show', { channelId }).catch(() => undefined);
			if (!channel || channel.userId !== $i.id || channel.isArchived || channel.isSensitive) {
				return os.alert({ type: 'error', text: i18n.ts.unavailable });
			}
		}

		return await saveFields([
			...savedFields.value.filter(field => !overviewFieldNames.includes(field.name)),
			...(tagLinks.length ? [{ name: streamingTagsFieldName, value: JSON.stringify(tagLinks) }] : []),
			...(channelId ? [{ name: streamingCommunityFieldName, value: channelId }] : []),
		]);
	} finally {
		checkingCommunity.value = false;
	}
}
// #endregion

definePage(() => ({
	title: i18n.ts._profile.streamerSettings,
	icon: 'ti ti-headset',
}));
</script>

<style lang="scss" module>
.bannerPreviews {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 160px), 1fr));
	gap: 8px;
	padding: 0;
	margin: 0;
	list-style: none;

	> li {
		display: grid;
		gap: 4px;
	}

	img {
		display: block;
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: var(--MI-radius-sm);
		background: var(--MI-c-inset);
	}
}
</style>

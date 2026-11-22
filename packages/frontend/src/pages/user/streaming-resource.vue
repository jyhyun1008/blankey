<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :overridePageMetadata="profileMetadata" :hideTitle="!profileMetadata" :tabs="profileTabs" :tab="section" :swipable="false">
	<div class="_spacer _profileContent">
		<div v-if="entry && user" :key="entry.id" class="_gaps">
			<!-- 動画: ブログ詳細と同じ並び (プレイヤーをカバー位置に) -->
			<article v-if="isVideo" :class="[articleStyle.article, $style.article]">
				<div v-if="isEnabledUrlPreview" :class="$style.player">
					<MkUrlPreview :url="entry.url" expandPlayer :showActions="false"/>
				</div>

				<header :class="$style.header">
					<MkA :to="userPage(user, section)" :class="$style.kicker">
						<i class="ti ti-video" aria-hidden="true"></i> {{ i18n.ts._profile.streamingVideoArchive }}
					</MkA>
					<h1 :class="$style.title">{{ entry.title }}</h1>
					<ul v-if="entry.tags?.length" :class="$style.tags" :aria-label="i18n.ts.tags">
						<li v-for="tag in entry.tags" :key="tag" :class="$style.tag">#{{ tag }}</li>
					</ul>
					<div :class="$style.byline">
						<MkAvatar :user="user" :class="$style.bylineAvatar" link preview/>
						<MkA :to="userPage(user)" :class="$style.bylineName"><MkUserName :user="user" :nowrap="true"/></MkA>
					</div>
				</header>

				<div v-if="entry.body || !isEnabledUrlPreview" :class="$style.content" class="_gaps">
					<XDescription v-if="entry.body" :text="entry.body" :author="user"/>
					<MkLink v-if="!isEnabledUrlPreview" :url="entry.url">{{ entry.url }}</MkLink>
				</div>

				<footer :class="$style.footer">
					<div :class="$style.actions">
						<a :href="entry.url" target="_blank" rel="noopener" :class="$style.openButton">
							<i class="ti ti-external-link" aria-hidden="true"></i> {{ i18n.ts.openInNewTab }}
						</a>
						<div :class="$style.actionIcons">
							<template v-if="isOwner">
								<MkA v-tooltip="i18n.ts.edit" :aria-label="i18n.ts.edit" :to="editPath" class="_button" :class="articleStyle.generalActionButton"><i class="ti ti-pencil ti-fw"></i></MkA>
								<button v-tooltip="i18n.ts.delete" :aria-label="i18n.ts.delete" class="_button" :class="articleStyle.generalActionButton" @click="remove"><i class="ti ti-trash ti-fw"></i></button>
							</template>
							<button v-tooltip="i18n.ts.copyLink" :aria-label="i18n.ts.copyLink" class="_button" :class="articleStyle.generalActionButton" @click="copyLink"><i class="ti ti-link ti-fw"></i></button>
							<button v-if="isSupportShare()" v-tooltip="i18n.ts.share" :aria-label="i18n.ts.share" class="_button" :class="articleStyle.generalActionButton" @click="share"><i class="ti ti-share ti-fw"></i></button>
						</div>
					</div>
					<XAuthorCard :user="user" @update:user="u => user = u"/>
				</footer>
			</article>

			<!-- グッズ・サービス: ショップのように 左にサムネイル、右に基本情報と購入ボタン、下に説明とポートフォリオ -->
			<article v-else :class="[articleStyle.article, $style.article]">
				<div :class="$style.shop">
					<div :class="$style.shopMedia">
						<img v-if="thumbnailUrl" :src="getStreamingImageSrc(thumbnailUrl)" alt="" :class="$style.shopImage"/>
						<i v-else class="ti ti-shopping-bag" :class="$style.shopPlaceholder" aria-hidden="true"></i>
					</div>
					<div :class="$style.shopInfo">
						<MkA :to="userPage(user, section)" :class="$style.kicker">
							<i class="ti ti-shopping-bag" aria-hidden="true"></i> {{ i18n.ts._profile.streamingGoodsServices }}
						</MkA>
						<h1 :class="$style.title">{{ entry.title }}</h1>
						<div :class="$style.byline">
							<MkAvatar :user="user" :class="$style.bylineAvatar" link preview/>
							<MkA :to="userPage(user)" :class="$style.bylineName"><MkUserName :user="user" :nowrap="true"/></MkA>
						</div>
						<ul v-if="entry.tags?.length" :class="$style.tags" :aria-label="i18n.ts.tags">
							<li v-for="tag in entry.tags" :key="tag" :class="$style.tag">#{{ tag }}</li>
						</ul>
						<dl v-if="entry.price" :class="$style.price">
							<dt>{{ i18n.ts._profile.streamingPrice }}</dt>
							<dd>{{ entry.price }}</dd>
						</dl>
						<div :class="$style.buyRow">
							<a :href="entry.url" target="_blank" rel="noopener" :class="[$style.openButton, $style.openButtonPrimary, $style.buyButton]">
								<i class="ti ti-shopping-cart" aria-hidden="true"></i> {{ i18n.ts._profile.streamingBuy }}
							</a>
							<button v-tooltip="i18n.ts.copyLink" :aria-label="i18n.ts.copyLink" class="_button" :class="articleStyle.generalActionButton" @click="copyLink"><i class="ti ti-link ti-fw"></i></button>
							<button v-if="isSupportShare()" v-tooltip="i18n.ts.share" :aria-label="i18n.ts.share" class="_button" :class="articleStyle.generalActionButton" @click="share"><i class="ti ti-share ti-fw"></i></button>
						</div>
						<!-- 自分の項目: ここから 1 件ずつ編集・削除 -->
						<div v-if="isOwner" :class="$style.ownerActions">
							<MkButton small rounded primary :disabled="bumping || bumpAvailableAt != null" @click="bump"><i class="ti ti-arrow-big-up-lines"></i> {{ i18n.ts._profile.streamingBump }}</MkButton>
							<MkButton small rounded type="routerLink" :to="editPath"><i class="ti ti-pencil"></i> {{ i18n.ts.edit }}</MkButton>
							<MkButton small rounded danger @click="remove"><i class="ti ti-trash"></i> {{ i18n.ts.delete }}</MkButton>
						</div>
						<p v-if="isOwner" :class="$style.bumpNote">
							{{ bumpAvailableAt != null ? i18n.tsx._profile.streamingBumpCooldown({ time: dateTimeFormat.format(bumpAvailableAt) }) : i18n.ts._profile.streamingBumpDescription }}
						</p>
					</div>
				</div>

				<section v-if="entry.body" :class="$style.section">
					<h2 :class="$style.sectionTitle">{{ i18n.ts._profile.streamingDescription }}</h2>
					<XDescription :text="entry.body" :author="user"/>
				</section>

				<section v-if="entry.portfolio?.length" :class="$style.section">
					<h2 :class="$style.sectionTitle">{{ i18n.ts._profile.streamingPortfolio }}</h2>
					<ul :class="$style.portfolio">
						<li v-for="(item, index) in entry.portfolio" :key="index" :class="$style.card">
							<img v-if="item.imageUrl" :src="getStreamingImageSrc(item.imageUrl, 'preview')" alt="" loading="lazy"/>
							<MkLink v-if="item.url" :url="item.url">{{ item.title }}</MkLink>
							<span v-else>{{ item.title }}</span>
						</li>
					</ul>
				</section>

				<footer :class="$style.footer">
					<XAuthorCard :user="user" @update:user="u => user = u"/>
				</footer>
			</article>

			<section v-if="others.length" :class="$style.more">
				<h2 :class="$style.moreTitle">
					<span>{{ isVideo ? i18n.ts._profile.streamingVideoArchive : i18n.ts._profile.streamingGoodsServices }}</span>
					<MkA :to="userPage(user, section)" :class="$style.moreLink">{{ i18n.ts.showMore }} <i class="ti ti-chevron-right" aria-hidden="true"></i></MkA>
				</h2>
				<div :class="[$style.moreGrid, { [$style.videoGrid]: isVideo }]">
					<XStreamingResources v-for="item in others" :key="item.id" :entries="[item]" :profile="user" :fieldName="field" compact/>
				</div>
			</section>
		</div>
		<MkLoading v-else-if="loading"/>
		<MkError v-else-if="failed" @retry="fetchUser()"/>
		<MkResult v-else type="empty"/>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, shallowRef, ref, watch } from 'vue';
import * as Misskey from 'misskey-js';
import { userPage } from '@@/js/user.js';
import articleStyle from '../post-detail.module.scss';
import { url as localUrl } from '@@/js/config.js';
import XStreamingResources from './streaming-resources.vue';
import XDescription from './streaming-description.vue';
import XAuthorCard from './streaming-author-card.vue';
import MkButton from '@/components/MkButton.vue';
import { $i } from '@/i.js';
import * as os from '@/os.js';
import { useRouter } from '@/router.js';
import { saveStreamingResources } from '@/utility/streaming-resource-draft.js';
import MkLink from '@/components/MkLink.vue';
import { copyToClipboard } from '@/utility/copy-to-clipboard.js';
import { isSupportShare } from '@/utility/navigator.js';
import MkUrlPreview from '@/components/MkUrlPreview.vue';
import { useUserProfileLinks } from '@/composables/use-user-profile-links.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { getStreamingBumpAvailableAt, getStreamingImageSrc, getStreamingResources, getStreamingResourceThumbnail, streamingGoodsServicesFieldName, streamingResourcePath, streamingVideoArchiveFieldName } from '@/utility/streaming-overview.js';
import { dateTimeFormat } from '@@/js/intl-const.js';
import { isEnabledUrlPreview } from '@/utility/url-preview.js';

const props = defineProps<{
	acct: string;
	section: string;
	resourceId: string;
}>();
const user = shallowRef<Misskey.entities.UserDetailed>();
const loading = ref(false);
const failed = ref(false);
let request: AbortController | undefined;

const isVideo = computed(() => props.section === 'video-archive');
const field = computed(() => isVideo.value ? streamingVideoArchiveFieldName : streamingGoodsServicesFieldName);
const entries = computed(() => {
	if (!user.value || user.value.host !== null || (!isVideo.value && props.section !== 'goods-services')) return [];
	return getStreamingResources(user.value.fields, field.value);
});
const entry = computed(() => entries.value.find(item => item.id === props.resourceId));
const others = computed(() => entries.value.filter(item => item.id !== props.resourceId).slice(0, 4));
const thumbnailUrl = computed(() => entry.value ? getStreamingResourceThumbnail(entry.value) : undefined);
const pageUrl = computed(() => user.value && entry.value ? localUrl + streamingResourcePath(user.value, field.value, entry.value.id) : localUrl);

const router = useRouter();
const isOwner = computed(() => user.value != null && user.value.host === null && $i?.id === user.value.id);
const editPath = computed(() => user.value && entry.value ? userPage(user.value, `${props.section}/${entry.value.id}/edit`) : '/');

// 再掲 (bump): グッズを一覧・トップページで新着として先頭に出す。間隔は streamingBumpCooldown ごと
const bumping = ref(false);
const bumpAvailableAt = computed(() => entry.value && !isVideo.value ? getStreamingBumpAvailableAt(entry.value) : null);

async function bump() {
	const profile = user.value;
	const target = entry.value;
	if (!isOwner.value || isVideo.value || !profile || !target || bumping.value || bumpAvailableAt.value != null) return;
	bumping.value = true;
	try {
		const bumpedAt = Date.now();
		const updates = await saveStreamingResources(field.value, entries.value.map(item => item.id === target.id ? { ...item, bumpedAt } : item));
		if (!updates) return;
		// shallowRef なので差し替えて再描画させる
		user.value = { ...profile, ...updates };
		os.toast(i18n.ts._profile.streamingBumped);
	} finally {
		bumping.value = false;
	}
}

async function remove() {
	const profile = user.value;
	const target = entry.value;
	if (!isOwner.value || !profile || !target) return;
	const { canceled } = await os.confirm({ type: 'warning', text: i18n.tsx.removeAreYouSure({ x: target.title }) });
	if (canceled) return;
	const updates = await saveStreamingResources(field.value, entries.value.filter(item => item.id !== target.id));
	if (!updates) return;
	Object.assign(profile, updates);
	router.replace('/@:acct/:page?', { params: { acct: props.acct, page: props.section } });
}

function copyLink() {
	copyToClipboard(pageUrl.value);
}

function share() {
	if (!entry.value) return;
	void navigator.share({ title: entry.value.title, url: pageUrl.value });
}

const { profileMetadata, profileTabs } = useUserProfileLinks(() => user.value, () => user.value?.isStreamer);

async function fetchUser() {
	request?.abort();
	const { username, host } = Misskey.acct.parse(props.acct);
	user.value = undefined;
	failed.value = false;
	if (host || !['video-archive', 'goods-services'].includes(props.section)) {
		loading.value = false;
		return;
	}

	const controller = request = new AbortController();
	loading.value = true;
	try {
		const profile = await misskeyApi('users/show', { username, host }, undefined, controller.signal);
		if (!controller.signal.aborted) user.value = profile;
	} catch {
		if (!controller.signal.aborted) failed.value = true;
	} finally {
		if (!controller.signal.aborted) loading.value = false;
	}
}

watch([() => props.acct, () => props.section, () => props.resourceId], (_, __, onCleanup) => {
	void fetchUser();
	onCleanup(() => request?.abort());
}, { immediate: true });

definePage(() => ({
	title: entry.value?.title ?? (isVideo.value ? i18n.ts._profile.streamingVideoArchive : i18n.ts._profile.streamingGoodsServices),
	icon: isVideo.value ? 'ti ti-video' : 'ti ti-shopping-bag',
}));
</script>

<style lang="scss" module>
.article {
	overflow: clip;
	container-type: inline-size;
	box-shadow: 0 0 0 1px var(--MI-c-border);
}

.player {
	background: #000;
}

/* ---- グッズ: ショップ風の上段 ---- */
.shop {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	gap: clamp(18px, 4cqi, 32px);
	padding: clamp(18px, 4cqi, 32px) var(--reading-inset);
}

@container (min-width: 620px) {
	.shop {
		grid-template-columns: minmax(0, 0.95fr) minmax(0, 1fr);
		align-items: start;
	}
}

.shopMedia {
	display: grid;
	place-items: center;
	aspect-ratio: 1;
	overflow: hidden;
	border-radius: var(--MI-radius);
	background:
		radial-gradient(120% 140% at 0% 0%, var(--MI-c-accentSoft), transparent 60%),
		var(--MI-c-inset);
	box-shadow: 0 0 0 1px var(--MI-c-border);
}

.shopImage {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.shopPlaceholder {
	font-size: 3em;
	color: var(--MI-c-accentInk);
	opacity: .5;
}

.shopInfo {
	display: grid;
	align-content: start;
	gap: 4px;
	min-width: 0;

	> .title {
		margin-top: 6px;
	}
}

.price {
	display: flex;
	align-items: baseline;
	gap: 12px;
	margin: 14px 0 0;
	padding: 12px 0;
	border-block: 1px solid var(--MI-c-border);

	dt {
		color: var(--MI-c-fgMuted);
		font-size: 0.85em;
	}

	dd {
		margin: 0;
		font-size: 1.4em;
		font-weight: bold;
		overflow-wrap: anywhere;
	}
}

.buyRow {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-top: 16px;
}

.ownerActions {
	display: flex;
	gap: 8px;
	margin-top: 12px;
}

.bumpNote {
	margin: 6px 0 0;
	color: var(--MI-c-fgMuted);
	font-size: 0.8em;
}

.buyButton {
	flex: 1;
	justify-content: center;
	height: 46px;
	font-size: 1.05em;
}

.section {
	display: grid;
	gap: 12px;
	margin-inline: var(--reading-inset);
	padding-block: 24px;
	border-top: 1px solid var(--MI-c-border);
}

.sectionTitle {
	margin: 0;
	font-size: 1.1em;
}

.header {
	padding: clamp(22px, 4cqi, 36px) var(--reading-inset) 0;
}

.kicker {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	color: var(--MI-c-accentInk);
	font-size: 0.85em;
	font-weight: bold;

	&:hover {
		text-decoration: none;
		opacity: .8;
	}
}

.title {
	margin: 8px 0 0;
	font-size: clamp(1.6rem, 4.5cqi, 2.4rem);
	line-height: 1.25;
	overflow-wrap: anywhere;
	text-wrap: balance;
}

.tags {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin: 12px 0 0;
	padding: 0;
	list-style: none;
}

.tag {
	padding: 3px 10px;
	border-radius: var(--MI-radius-full);
	background: var(--MI-c-accentSoft);
	color: var(--MI-c-accentInk);
	font-size: 0.8em;
	font-weight: bold;
}

.byline {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-top: 16px;
	font-size: 0.9em;
}

.bylineAvatar {
	width: 28px;
	height: 28px;
}

.bylineName {
	min-width: 0;
	color: var(--MI_THEME-fg);
	font-weight: bold;
}

.content {
	max-width: 680px;
	padding: clamp(20px, 4cqi, 32px) var(--reading-inset) 32px;
	font-size: 1.05em;
	line-height: 1.85;
	overflow-wrap: anywhere;
}

.portfolio {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 160px), 1fr));
	gap: var(--MI-marginHalf);
	margin: 0;
	padding: 0;
	list-style: none;
}

.card {
	display: grid;
	align-content: start;
	gap: 8px;
	overflow: hidden;
	padding: 12px;
	border-radius: var(--MI-radius-md);
	box-shadow: 0 0 0 1px var(--MI-c-border);
	font-size: 0.9em;
	line-height: 1.5;

	img {
		display: block;
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: var(--MI-radius-sm);
	}
}

.footer {
	display: grid;
	gap: 20px;
	margin-top: 24px;
	margin-inline: var(--reading-inset);
	padding-block: 20px clamp(24px, 5cqi, 36px);
	border-top: 1px solid var(--MI-c-border);
}

.actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}

.openButton {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	height: 40px;
	padding: 0 18px;
	border-radius: var(--MI-radius-full);
	background: var(--MI_THEME-buttonBg);
	color: var(--MI_THEME-fg);
	font-weight: bold;
	transition: background var(--MI-duration-fast) var(--MI-ease);

	&:hover {
		text-decoration: none;
		background: var(--MI_THEME-buttonHoverBg);
	}
}

.openButtonPrimary {
	background: var(--MI_THEME-accent);
	color: var(--MI-c-fgOnAccent);

	&:hover {
		background: var(--MI-c-accentHover);
	}
}

.actionIcons {
	display: flex;
	gap: 4px;
	margin-inline-start: auto;
}

.more {
	display: grid;
	gap: 12px;
}

.moreTitle {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin: 8px 4px 0;
	font-size: 1.05em;

	> span::before {
		content: "";
		display: inline-block;
		width: 6px;
		height: 6px;
		margin-right: 8px;
		vertical-align: middle;
		border-radius: var(--MI-radius-full);
		background: var(--MI_THEME-accent);
	}
}

.moreLink {
	flex: none;
	padding: 4px 12px;
	border-radius: var(--MI-radius-full);
	color: var(--MI-c-accentInk);
	font-size: 0.8em;
	font-weight: bold;
	box-shadow: 0 0 0 1px var(--MI-c-border);

	&:hover {
		text-decoration: none;
		background: var(--MI-c-hover);
	}
}

.moreGrid {
	--media-preview-aspect-ratio: 1;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
	align-items: start;
	gap: 12px;
}

.videoGrid {
	--media-preview-aspect-ratio: 16 / 9;
}
</style>

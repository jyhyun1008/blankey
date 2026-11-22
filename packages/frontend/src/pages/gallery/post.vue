<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :overridePageMetadata="profileMetadata" :hideTitle="!profileMetadata" :tabs="profileTabs" tab="gallery" :swipable="false">
	<div class="_spacer" style="--MI_SPACER-w: 1200px;">
		<Transition
			:enterActiveClass="prefer.s.animation ? articleStyle.fadeEnterActive : ''"
			:leaveActiveClass="prefer.s.animation ? articleStyle.fadeLeaveActive : ''"
			:enterFromClass="prefer.s.animation ? articleStyle.fadeEnterFrom : ''"
			:leaveToClass="prefer.s.animation ? articleStyle.fadeLeaveTo : ''"
			mode="out-in"
		>
			<div v-if="post" :key="post.id" class="_gaps" :class="$style.container">
				<article :class="$style.root">
					<div :class="$style.viewer">
						<div :class="$style.stage">
							<template v-if="current">
								<div :class="$style.frame" :style="frameStyle">
									<MkMediaVideo v-if="current.type.startsWith('video')" :key="`video:${current.id}`" :video="current" :class="$style.media"/>
									<MkMediaImage
										v-else-if="current.type.startsWith('image')"
										:key="`image:${current.id}`"
										:image="current"
										:marker="`${markerId}:${current.id}`"
										disableImageLink
										:class="$style.media"
										@mediaClick="openLightbox(current.id)"
									/>
								</div>
								<template v-if="files.length > 1">
									<button type="button" class="_button" :class="[$style.nav, $style.navPrev]" :aria-label="i18n.ts.goBack" :disabled="index === 0" @click="index--"><i class="ti ti-chevron-left" aria-hidden="true"></i></button>
									<button type="button" class="_button" :class="[$style.nav, $style.navNext]" :aria-label="i18n.ts.next" :disabled="index === files.length - 1" @click="index++"><i class="ti ti-chevron-right" aria-hidden="true"></i></button>
									<span :class="$style.counter">{{ index + 1 }} / {{ files.length }}</span>
								</template>
							</template>
							<div v-else :class="$style.noMedia"><i class="ti ti-photo-off" aria-hidden="true"></i></div>
						</div>
						<div v-if="files.length > 1" :class="$style.thumbs" role="tablist">
							<button
								v-for="(file, i) in files"
								:key="file.id"
								type="button"
								role="tab"
								class="_button"
								:class="[$style.thumb, { [$style.thumbActive]: i === index }]"
								:aria-selected="i === index"
								:aria-label="`${i + 1} / ${files.length}`"
								@click="index = i"
							>
								<MkDriveFileThumbnail :file="file" fit="cover" :class="$style.thumbImage"/>
							</button>
						</div>
					</div>

					<aside :class="$style.info">
						<div :class="$style.author">
							<MkAvatar :user="post.user" :class="$style.avatar" indicator link preview/>
							<MkA :to="userPage(post.user)" :class="$style.authorText">
								<MkUserName :user="post.user" :nowrap="true" :class="$style.authorName"/>
								<MkAcct :user="post.user" :class="$style.acct"/>
							</MkA>
							<MkFollowButton v-if="author && $i && $i.id !== author.id" :user="author" @update:user="u => author = u"/>
						</div>

						<h1 :class="$style.title">{{ post.title }}</h1>
						<div v-if="post.description" :class="$style.description">
							<Mfm :text="post.description" :author="post.user"/>
						</div>
						<ul v-if="tags.length" :class="$style.tags" :aria-label="i18n.ts.hashtags">
							<li v-for="tag in tags" :key="tag"><MkA :to="`/tags/${encodeURIComponent(tag)}`" :class="$style.tag">#{{ tag }}</MkA></li>
						</ul>
						<p :class="$style.date">
							<MkTime :time="post.createdAt" mode="detail"/>
							<span v-if="post.createdAt !== post.updatedAt"> · {{ i18n.ts.updatedAt }} <MkTime :time="post.updatedAt"/></span>
						</p>

						<div :class="$style.actions">
							<MkButton v-if="post.isLiked" v-tooltip="i18n.ts._gallery.unlike" :aria-label="i18n.ts._gallery.unlike" rounded asLike primary @click="unlike"><i class="ti ti-heart-filled"></i><span v-if="post.likedCount > 0" :class="$style.count">{{ post.likedCount }}</span></MkButton>
							<MkButton v-else v-tooltip="i18n.ts._gallery.like" :aria-label="i18n.ts._gallery.like" rounded asLike @click="like"><i class="ti ti-heart"></i><span v-if="post.likedCount > 0" :class="$style.count">{{ post.likedCount }}</span></MkButton>
							<div :class="$style.actionIcons">
								<MkA v-if="$i?.id === post.user.id" v-tooltip="i18n.ts.edit" :aria-label="i18n.ts.edit" :to="`/gallery/${post.id}/edit`" class="_button" :class="articleStyle.generalActionButton"><i class="ti ti-pencil ti-fw"></i></MkA>
								<button v-tooltip="i18n.ts.shareWithNote" :aria-label="i18n.ts.shareWithNote" class="_button" :class="articleStyle.generalActionButton" @click="shareWithNote"><i class="ti ti-repeat ti-fw"></i></button>
								<button v-tooltip="i18n.ts.copyLink" :aria-label="i18n.ts.copyLink" class="_button" :class="articleStyle.generalActionButton" @click="copyLink"><i class="ti ti-link ti-fw"></i></button>
								<button v-if="isSupportShare()" v-tooltip="i18n.ts.share" :aria-label="i18n.ts.share" class="_button" :class="articleStyle.generalActionButton" @click="share"><i class="ti ti-share ti-fw"></i></button>
								<button v-if="$i && $i.id !== post.user.id" v-tooltip="i18n.ts.more" :aria-label="i18n.ts.more" class="_button" :class="articleStyle.generalActionButton" @click="showMenu"><i class="ti ti-dots ti-fw"></i></button>
							</div>
						</div>
					</aside>
				</article>
				<MkAd :preferForms="['horizontal', 'horizontal-big']"/>
				<section v-if="otherPosts.length" :class="$style.more">
					<h2 :class="$style.moreTitle">
						<span>{{ i18n.tsx._pages.moreFromAuthor({ name: post.user.name ?? post.user.username }) }}</span>
						<MkA :to="`${userPage(post.user)}/gallery`" :class="$style.moreLink">{{ i18n.ts.showMore }} <i class="ti ti-chevron-right" aria-hidden="true"></i></MkA>
					</h2>
					<div :class="$style.moreGrid">
						<MkGalleryPostPreview v-for="item in otherPosts" :key="item.id" :post="item"/>
					</div>
				</section>
			</div>
			<MkError v-else-if="error" @retry="fetchPost()"/>
			<MkLoading v-else/>
		</Transition>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, watch, ref } from 'vue';
import * as Misskey from 'misskey-js';
import articleStyle from '../post-detail.module.scss';
import { userPage } from '@@/js/user.js';
import { url } from '@@/js/config.js';
import type { MenuItem } from '@/types/menu.js';
import MkButton from '@/components/MkButton.vue';
import MkFollowButton from '@/components/MkFollowButton.vue';
import MkMediaImage from '@/components/MkMediaImage.vue';
import MkMediaVideo from '@/components/MkMediaVideo.vue';
import MkDriveFileThumbnail from '@/components/MkDriveFileThumbnail.vue';
import { getGalleryPostHashtags } from '@/utility/post-hashtags.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import MkGalleryPostPreview from '@/components/MkGalleryPostPreview.vue';
import { useUserProfileLinks } from '@/composables/use-user-profile-links.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import { prefer } from '@/preferences.js';
import { $i } from '@/i.js';
import { isSupportShare } from '@/utility/navigator.js';
import { copyToClipboard } from '@/utility/copy-to-clipboard.js';
import { genId } from '@/utility/id.js';
import { isPreviewable } from '@/utility/lightbox.js';
import { openMediaLightbox } from '@/utility/open-media-lightbox.js';

const props = defineProps<{
	postId: string;
}>();

const post = ref<Misskey.entities.GalleryPost | null>(null);
// 説明文中のハッシュタグは本文でリンクになるので、チップには説明文にないタグだけを出す
const tags = computed(() => {
	if (!post.value) return [];
	const inDescription = new Set(getGalleryPostHashtags({ tags: [], description: post.value.description }));
	return getGalleryPostHashtags(post.value).filter(tag => !inDescription.has(tag));
});
const error = ref<any>(null);
const author = ref<Misskey.entities.UserDetailed | null>(null);
const otherPosts = ref<Misskey.entities.GalleryPost[]>([]);
const index = ref(0);
const markerId = genId();
const files = computed(() => (post.value?.files ?? []).filter(file => isPreviewable(file.type)));
const current = computed(() => files.value[index.value] ?? null);

// 画像の縦横比どおりの枠を、ステージの高さ (最大 72vh) に収まる幅で置く
const frameStyle = computed(() => {
	const { width, height } = current.value?.properties ?? {};
	if (!width || !height) return { aspectRatio: '4 / 3', width: '100%' };
	const ratio = width / height;
	return { aspectRatio: `${width} / ${height}`, width: `min(100%, calc(var(--stageHeight) * ${ratio}))` };
});

function openLightbox(id: string) {
	void openMediaLightbox(files.value, id, { user: post.value?.user, sourceMarker: `${markerId}:${id}` });
}

async function fetchRelated(target: Misskey.entities.GalleryPost) {
	author.value = null;
	otherPosts.value = [];
	const [user, posts] = await Promise.all([
		$i ? misskeyApi('users/show', { userId: target.userId }).catch(() => null) : Promise.resolve(null),
		misskeyApi('users/gallery/posts', { userId: target.userId, limit: 5 }).catch(() => []),
	]);
	if (post.value?.id !== target.id) return;
	author.value = user;
	otherPosts.value = posts.filter(item => item.id !== target.id).slice(0, 4);
}

function fetchPost() {
	post.value = null;
	misskeyApi('gallery/posts/show', {
		postId: props.postId,
	}).then(_post => {
		index.value = 0;
		post.value = _post;
		void fetchRelated(_post);
	}).catch(_error => {
		error.value = _error;
	});
}

function copyLink() {
	if (!post.value) return;
	copyToClipboard(`${url}/gallery/${post.value.id}`);
}

function share() {
	if (!post.value) return;
	navigator.share({
		title: post.value.title,
		text: post.value.description ?? undefined,
		url: `${url}/gallery/${post.value.id}`,
	});
}

function shareWithNote() {
	if (!post.value) return;
	os.post({
		initialText: `${post.value.title} ${url}/gallery/${post.value.id}`,
		instant: true,
	});
}

function like() {
	if (!post.value) return;
	os.apiWithDialog('gallery/posts/like', {
		postId: props.postId,
	}).then(() => {
		post.value!.isLiked = true;
		post.value!.likedCount++;
	});
}

async function unlike() {
	if (!post.value) return;
	const confirm = await os.confirm({
		type: 'warning',
		text: i18n.ts.unlikeConfirm,
	});
	if (confirm.canceled) return;
	os.apiWithDialog('gallery/posts/unlike', {
		postId: props.postId,
	}).then(() => {
		post.value!.isLiked = false;
		post.value!.likedCount--;
	});
}

async function reportAbuse() {
	if (!post.value) return;

	const pageUrl = `${url}/gallery/${post.value.id}`;

	const { dispose } = await os.popupAsyncWithDialog(import('@/components/MkAbuseReportWindow.vue').then(x => x.default), {
		user: post.value.user,
		initialComment: `Post: ${pageUrl}\n-----\n`,
	}, {
		closed: () => dispose(),
	});
}

function showMenu(ev: PointerEvent) {
	if (!post.value) return;

	const menuItems: MenuItem[] = [];

	if ($i && $i.id !== post.value.userId) {
		menuItems.push({
			icon: 'ti ti-exclamation-circle',
			text: i18n.ts.reportAbuse,
			action: reportAbuse,
		});

		if ($i.isModerator || $i.isAdmin) {
			menuItems.push({
				type: 'divider',
			}, {
				icon: 'ti ti-trash',
				text: i18n.ts.delete,
				danger: true,
				action: () => os.confirm({
					type: 'warning',
					text: i18n.ts.deleteConfirm,
				}).then(({ canceled }) => {
					if (canceled || !post.value) return;

					os.apiWithDialog('gallery/posts/delete', { postId: post.value.id });
				}),
			});
		}
	}

	os.popupMenu(menuItems, ev.currentTarget ?? ev.target);
}

watch(() => props.postId, fetchPost, { immediate: true });

const { profileMetadata, profileTabs } = useUserProfileLinks(() => post.value?.user);

definePage(() => ({
	title: post.value ? post.value.title : i18n.ts.gallery,
	...post.value ? {
		avatar: post.value.user,
	} : {},
}));
</script>

<style lang="scss" module>
.root {
	--stageHeight: min(72vh, 760px);
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	gap: 16px;
}

.container {
	container-type: inline-size;
}

@container (min-width: 860px) {
	.root {
		grid-template-columns: minmax(0, 1fr) 340px;
		align-items: start;
	}

	.info {
		position: sticky;
		top: calc(var(--MI-stickyTop, 0px) + 12px);
	}
}

/* ---- ビューア ---- */
.viewer {
	display: grid;
	gap: 10px;
	min-width: 0;
}

.stage {
	position: relative;
	display: grid;
	place-items: center;
	min-height: 240px;
	padding: clamp(12px, 3cqi, 28px);
	border-radius: var(--MI-radius);
	background:
		radial-gradient(100% 100% at 50% 0%, color-mix(in oklab, var(--MI-c-accentSoft) 70%, transparent), transparent 70%),
		var(--MI-c-inset);
	box-shadow: 0 0 0 1px var(--MI-c-border);
}

.frame {
	max-width: 100%;
	max-height: var(--stageHeight);
	overflow: hidden;
	border-radius: var(--MI-radius-md);
	box-shadow: var(--MI-shadow-md);
}

.media {
	width: 100%;
	height: 100%;
	background: transparent !important;
}

.nav {
	position: absolute;
	top: 50%;
	display: grid;
	place-items: center;
	width: 40px;
	height: 40px;
	margin-top: -20px;
	border-radius: var(--MI-radius-full);
	background: color-mix(in srgb, var(--MI_THEME-panel) 85%, transparent);
	color: var(--MI_THEME-fg);
	box-shadow: var(--MI-shadow-sm), 0 0 0 1px var(--MI-c-border);
	-webkit-backdrop-filter: blur(8px);
	backdrop-filter: blur(8px);
	transition: opacity var(--MI-duration-fast) var(--MI-ease);

	&:disabled {
		opacity: 0;
		pointer-events: none;
	}
}

.navPrev { left: 12px; }
.navNext { right: 12px; }

.counter {
	position: absolute;
	right: 14px;
	bottom: 12px;
	padding: 2px 10px;
	border-radius: var(--MI-radius-full);
	background: color-mix(in srgb, var(--MI_THEME-panel) 85%, transparent);
	font-size: 0.8em;
	font-weight: bold;
	box-shadow: 0 0 0 1px var(--MI-c-border);
}

.noMedia {
	color: var(--MI-c-fgSubtle);
	font-size: 2.5em;
}

.thumbs {
	display: flex;
	gap: 8px;
	overflow-x: auto;
	padding: 2px;
	scrollbar-width: thin;
}

.thumb {
	flex: none;
	width: 64px;
	height: 64px;
	overflow: hidden;
	border-radius: var(--MI-radius-sm);
	opacity: .6;
	box-shadow: 0 0 0 1px var(--MI-c-border);
	transition: opacity var(--MI-duration-fast) var(--MI-ease), box-shadow var(--MI-duration-fast) var(--MI-ease);

	&:hover {
		opacity: .9;
	}
}

.thumbActive {
	opacity: 1;
	box-shadow: 0 0 0 2px var(--MI_THEME-accent);
}

.thumbImage {
	width: 100%;
	height: 100%;
}

/* ---- 情報パネル ---- */
.info {
	display: grid;
	gap: 14px;
	align-content: start;
	padding: 20px;
	border-radius: var(--MI-radius);
	background: var(--MI_THEME-panel);
	box-shadow: 0 0 0 1px var(--MI-c-border);
}

.author {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 0;
}

.avatar {
	flex: none;
	width: 44px;
	height: 44px;
}

.authorText {
	flex: 1;
	min-width: 0;
	color: var(--MI_THEME-fg);

	&:hover {
		text-decoration: none;
	}
}

.authorName {
	display: block;
	font-weight: bold;
}

.acct {
	display: block;
	overflow: hidden;
	color: var(--MI-c-fgMuted);
	font-size: 0.85em;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.title {
	margin: 4px 0 0;
	font-size: 1.45em;
	line-height: 1.3;
	overflow-wrap: anywhere;
}

.description {
	line-height: 1.75;
	overflow-wrap: anywhere;
	white-space: pre-wrap;
}

.tags {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.tag {
	display: inline-block;
	padding: 3px 10px;
	border-radius: var(--MI-radius-full);
	background: var(--MI-c-accentSoft);
	color: var(--MI-c-accentInk);
	font-size: 0.8em;
	font-weight: bold;

	&:hover {
		text-decoration: none;
		background: var(--MI-c-accentHover);
	}
}

.date {
	margin: 0;
	color: var(--MI-c-fgSubtle);
	font-size: 0.8em;
}

.actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
	padding-top: 14px;
	border-top: 1px solid var(--MI-c-border);
}

.actionIcons {
	display: flex;
	gap: 2px;
	margin-inline-start: auto;
}

.count {
	margin-inline-start: 0.4em;
}

/* ---- ほかの投稿 ---- */
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
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
	gap: 12px;
}
</style>

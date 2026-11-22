<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<component :is="prefer.s.enablePullToRefresh ? MkPullToRefresh : 'div'" :refresher="() => reload()">
	<div class="_spacer" style="--MI_SPACER-w: 1240px;">
		<div class="ftskorzw" :class="$style.profileLayout" style="container-type: inline-size;">
			<div class="main _gaps">
				<!-- TODO -->
				<!-- <div class="punished" v-if="user.isSuspended"><i class="ti ti-alert-triangle" style="margin-right: 8px;"></i> {{ i18n.ts.userSuspended }}</div> -->
				<!-- <div class="punished" v-if="user.isSilenced"><i class="ti ti-alert-triangle" style="margin-right: 8px;"></i> {{ i18n.ts.userSilenced }}</div> -->

				<div class="profile _gaps">
					<MkAccountMoved v-if="user.movedTo" :movedTo="user.movedTo"/>
					<MkRemoteCaution v-if="user.host != null" :href="user.url ?? user.uri!"/>
					<MkInfo v-if="user.host == null && user.username.includes('.')">{{ i18n.ts.isSystemAccount }}</MkInfo>

					<div :key="user.id" class="main _panel">
						<div ref="bannerEl" class="banner-container">
							<div class="banner" :style="style"></div>
							<div class="fade"></div>
							<div class="title">
								<div class="name">
									<MkUserName :user="user" :nowrap="true" :class="$style.nickname"/>
									<i v-if="isStreamer" class="ti ti-headset" :class="$style.streamerIcon" role="img" :aria-label="i18n.ts._profile.streamerAccount" :title="i18n.ts._profile.streamerAccount"></i>
								</div>
								<div class="bottom">
									<span class="username"><MkAcct :user="user" :detail="true"/></span>
									<span v-if="user.isLocked"><i class="ti ti-lock"></i></span>
									<span v-if="user.isBot"><i class="ti ti-robot"></i></span>
									<button v-if="$i && !isEditingMemo && !memoDraft" class="_button add-note-button" @click="showMemoTextarea">
										<i class="ti ti-edit"></i> {{ i18n.ts.addMemo }}
									</button>
								</div>
							</div>
							<span v-if="$i && $i.id != user.id && user.isFollowed" class="followed">{{ i18n.ts.followsYou }}</span>
							<div class="actions">
								<button class="menu _button" @click="menu"><i class="ti ti-dots"></i></button>
								<MkFollowButton v-if="$i?.id != user.id" v-model:user="user" :inline="true" :transparent="false" :full="true" class="koudoku"/>
							</div>
						</div>
						<MkAvatar class="avatar" :user="user" indicator/>
						<div class="title">
							<div class="name">
								<MkUserName :user="user" :nowrap="false" :class="$style.nickname"/>
								<i v-if="isStreamer" class="ti ti-headset" :class="$style.streamerIcon" role="img" :aria-label="i18n.ts._profile.streamerAccount" :title="i18n.ts._profile.streamerAccount"></i>
							</div>
							<div class="bottom">
								<span class="username"><MkAcct :user="user" :detail="true"/></span>
								<span v-if="user.isLocked"><i class="ti ti-lock"></i></span>
								<span v-if="user.isBot"><i class="ti ti-robot"></i></span>
							</div>
						</div>
						<div v-if="user.followedMessage != null" class="followedMessage">
							<MkFukidashi class="fukidashi" tail="none" negativeMargin>
								<div class="messageHeader">{{ i18n.ts.messageToFollower }}</div>
								<div><MkSparkle><Mfm :plain="true" :text="user.followedMessage" :author="user" class="_selectable"/></MkSparkle></div>
							</MkFukidashi>
						</div>
						<div v-if="user.roles.length > 0" class="roles">
							<span v-for="role in user.roles" :key="role.id" v-tooltip="role.description" class="role" :style="{ '--color': role.color ?? '' }">
								<MkA v-adaptive-bg :to="`/roles/${role.id}`">
									<img v-if="role.iconUrl" style="height: 1.3em; vertical-align: -22%;" :src="role.iconUrl"/>
									{{ role.name }}
								</MkA>
							</span>
						</div>
						<div v-if="iAmModerator" class="moderationNote">
							<MkTextarea v-if="editModerationNote || (moderationNote != null && moderationNote !== '')" v-model="moderationNote" manualSave @savingStateChange="(changed) => { isModerationNoteDirty = changed; }">
								<template #label>{{ i18n.ts.moderationNote }}</template>
								<template #caption>{{ i18n.ts.moderationNoteDescription }}</template>
							</MkTextarea>
							<div v-else>
								<MkButton small @click="editModerationNote = true">{{ i18n.ts.addModerationNote }}</MkButton>
							</div>
						</div>
						<div v-if="isEditingMemo || memoDraft" class="memo" :class="{'no-memo': !memoDraft}">
							<div class="heading">{{ i18n.ts.memo }}</div>
							<textarea
								ref="memoTextareaEl"
								v-model="memoDraft"
								rows="1"
								@focus="isEditingMemo = true"
								@blur="updateMemo"
								@input="adjustMemoTextarea"
							></textarea>
						</div>
						<div class="description">
							<MkOmit>
								<Mfm v-if="user.description" :text="user.description" :isNote="false" :author="user" class="_selectable"/>
								<p v-else class="empty">{{ i18n.ts.noAccountDescription }}</p>
							</MkOmit>
						</div>
						<div class="status">
							<MkA :to="userPage(user, 'notes')">
								<b>{{ number(user.notesCount) }}</b>
								<span>{{ i18n.ts.notes }}</span>
							</MkA>
							<MkA v-if="isFollowingVisibleForMe(user)" :to="userPage(user, 'following')">
								<b>{{ number(user.followingCount) }}</b>
								<span>{{ i18n.ts.following }}</span>
							</MkA>
							<MkA v-if="isFollowersVisibleForMe(user)" :to="userPage(user, 'followers')">
								<b>{{ number(user.followersCount) }}</b>
								<span>{{ i18n.ts.followers }}</span>
							</MkA>
						</div>
					</div>
				</div>

				<ul v-if="streamingBanners.length" :class="$style.streamingBanners" :aria-label="i18n.ts._profile.streamingBanners">
					<li v-for="(banner, index) in streamingBanners" :key="banner.imageUrl">
						<component
							:is="banner.link ? 'a' : 'div'"
							:class="$style.streamingBanner"
							:href="banner.link || undefined"
							:target="banner.link ? '_blank' : undefined"
							:rel="banner.link ? 'nofollow noopener noreferrer' : undefined"
							:title="banner.link || undefined"
						>
							<img :src="getProxiedImageUrl(banner.imageUrl, 'preview', true, true)" :alt="i18n.tsx._profile.streamingBannerAlt({ n: index + 1 })" loading="lazy"/>
							<i v-if="banner.link" class="ti ti-external-link" :class="$style.bannerLinkIcon" aria-hidden="true"></i>
						</component>
					</li>
				</ul>

				<div class="contents _gaps">
					<XStreamerOverview :key="user.id" :user="user" @communityResolved="streamingCommunity = $event"/>
				</div>
			</div>
			<aside :class="$style.profileSidebar" class="_gaps">
				<section class="_gaps_s">
					<h2 :class="$style.sideHeading">{{ i18n.ts.basicInfo }}</h2>
					<div class="_panel">
						<XProfileFields :user="user" :profileFields="profileFields" compact/>
					</div>
					<div v-if="isStreamer" :class="$style.streamingLinks" class="_panel">
						<h3>{{ i18n.ts._profile.streamingQuickLinks }}</h3>
						<ul :class="$style.linkRows">
							<li v-for="link in streamingLinks" :key="link.name">
								<MkLink :url="link.url" :class="$style.linkRow">
									<span :class="[$style.linkIcon, { [$style.featuredLinkIcon]: link.primary }]" aria-hidden="true">
										<i :class="['ti', link.icon]"></i>
									</span>
									<span :class="$style.linkText">
										<strong>{{ link.label }}</strong>
										<small v-if="link.kind === 'support'">{{ i18n.ts._profile.streamingSupport }}</small>
										<small v-else-if="link.label !== i18n.ts._profile.streamingChannel">{{ i18n.ts._profile.streamingChannel }}</small>
									</span>
								</MkLink>
							</li>
							<li>
								<MkA :to="userPage(user, 'custom-emojis')" :class="$style.linkRow">
									<span :class="$style.linkIcon" aria-hidden="true"><i class="ti ti-mood-smile"></i></span>
									<strong :class="$style.linkText">{{ i18n.ts._profile.streamingOpenCustomEmojis }}</strong>
									<i class="ti ti-chevron-right" aria-hidden="true"></i>
								</MkA>
							</li>
							<li v-if="streamingCommunity?.userId === user.id">
								<MkA :to="`/channels/${streamingCommunity.id}`" :class="$style.linkRow">
									<span :class="$style.linkIcon" aria-hidden="true"><i class="ti ti-users"></i></span>
									<span :class="$style.linkText">
										<strong>{{ streamingCommunity.name }}</strong>
										<small>{{ i18n.ts._profile.streamingCommunity }}</small>
									</span>
									<i class="ti ti-chevron-right" aria-hidden="true"></i>
								</MkA>
							</li>
							<li v-for="{ tag, label } in streamingTags" :key="tag">
								<MkA :to="`/tags/${encodeURIComponent(tag)}`" :class="$style.linkRow">
									<span :class="$style.linkIcon" aria-hidden="true"><i class="ti ti-hash"></i></span>
									<span :class="$style.linkText">
										<strong>#{{ tag }}</strong>
										<small>{{ label || i18n.ts.hashtags }}</small>
									</span>
									<i class="ti ti-chevron-right" aria-hidden="true"></i>
								</MkA>
							</li>
						</ul>
					</div>
				</section>
				<section class="_gaps_s">
					<h2 :class="$style.sideHeading">{{ i18n.ts._profile.streamingRecentNews }}</h2>
					<div class="_gaps_s">
						<h3 :class="$style.newsHeading">{{ i18n.ts.pinnedNotes }}</h3>
						<template v-if="user.pinnedNotes.length">
							<MkNote v-for="note in user.pinnedNotes" :key="note.id" class="note _panel" :note="note" :pinned="true"/>
						</template>
						<MkInfo v-else-if="$i && $i.id === user.id">{{ i18n.ts.userPagePinTip }}</MkInfo>
						<p v-else :class="$style.emptyNews" class="_panel">{{ i18n.ts.noNotes }}</p>
					</div>
					<div v-if="!disableNotes" class="_gaps_s">
						<h3 :class="$style.newsHeading">{{ i18n.ts.notes }}</h3>
						<MkLazy>
							<XTimeline :key="user.id" ref="timelineEl" :user="user" :showFilters="false"/>
						</MkLazy>
					</div>
				</section>
				<template v-if="!isStreamer">
					<MkLazy><XFiles :key="user.id" :user="user" @showMore="emit('showMoreFiles')"/></MkLazy>
					<MkLazy><XActivity :key="user.id" :user="user"/></MkLazy>
				</template>
			</aside>
		</div>
	</div>
</component>
</template>

<script lang="ts" setup>
import { defineAsyncComponent, computed, shallowRef, onMounted, onUnmounted, onActivated, onDeactivated, nextTick, watch, ref, useTemplateRef } from 'vue';
import * as Misskey from 'misskey-js';
import { getScrollContainer } from '@@/js/scroll.js';
import MkNote from '@/components/MkNote.vue';
import MkFollowButton from '@/components/MkFollowButton.vue';
import MkAccountMoved from '@/components/MkAccountMoved.vue';
import MkFukidashi from '@/components/MkFukidashi.vue';
import MkRemoteCaution from '@/components/MkRemoteCaution.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import MkOmit from '@/components/MkOmit.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkButton from '@/components/MkButton.vue';
import MkLink from '@/components/MkLink.vue';
import XProfileFields from './profile-fields.vue';
import { getUserMenu } from '@/utility/get-user-menu.js';
import number from '@/filters/number.js';
import { userPage } from '@@/js/user.js';
import { tryParseUrl } from '@@/js/url.js';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { $i, iAmModerator } from '@/i.js';
import { confetti } from '@/utility/confetti.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { isFollowingVisibleForMe, isFollowersVisibleForMe } from '@/utility/isFfVisibleForMe.js';
import { useRouter } from '@/router.js';
import { getProxiedImageUrl, getStaticImageUrl } from '@/utility/media-proxy.js';
import { getStreamingBanners, streamingBannerFieldName } from '@/utility/streaming-banners.js';
import { getStreamingPlatformName, streamingChannelFieldName, streamingSupportFieldName } from '@/utility/streaming-platforms.js';
import { streamingResourceFieldNames, getStreamingTagLinks, streamingCommunityFieldName, streamingTagsFieldName } from '@/utility/streaming-overview.js';
import MkSparkle from '@/components/MkSparkle.vue';
import { prefer } from '@/preferences.js';
import MkPullToRefresh from '@/components/MkPullToRefresh.vue';
import { isBirthday } from '@/utility/is-birthday.js';
import type XTimeline_TypeReferenceOnly from './index.timeline.vue';

const XFiles = defineAsyncComponent(() => import('./index.files.vue'));
const XActivity = defineAsyncComponent(() => import('./index.activity.vue'));
const XTimeline = defineAsyncComponent(() => import('./index.timeline.vue'));
const XStreamerOverview = defineAsyncComponent(() => import('./streamer-overview.vue'));

const props = withDefaults(defineProps<{
	user: Misskey.entities.UserDetailed;
	/** Refetches the user in place. Supplied by the parent page. */
	refreshUser?: () => Promise<void>;
	/** Test only; MkNotesTimeline currently causes problems in vitest */
	disableNotes?: boolean;
}>(), {
	refreshUser: undefined,
	disableNotes: false,
});

const emit = defineEmits<{
	(ev: 'showMoreFiles'): void;
}>();

const router = useRouter();

const user = ref(props.user);
const isStreamer = computed(() => user.value.host == null && user.value.isStreamer);
const streamingLinks = computed(() => {
	if (!isStreamer.value) return [];

	const linkTypes = [
		{ name: streamingChannelFieldName, kind: 'channel', icon: 'ti-device-tv', primary: true },
		{ name: streamingSupportFieldName, kind: 'support', icon: 'ti-heart', primary: false },
	] as const;

	return linkTypes.flatMap(link => {
		for (const field of user.value.fields) {
			if (field.name !== link.name || !field.value.startsWith('https://')) continue;
			const url = tryParseUrl(field.value);
			if (!url) continue;

			const platform = getStreamingPlatformName(url, link.kind);
			if (link.kind === 'support' && !platform) continue;
			return [{ ...link, field, url: url.href, label: platform ?? i18n.ts._profile.streamingChannel }];
		}
		return [];
	});
});
const streamingBanners = computed(() => isStreamer.value ? getStreamingBanners(user.value.fields) : []);
const streamingTags = computed(() => getStreamingTagLinks(user.value.fields));
const streamingCommunity = shallowRef<Misskey.entities.Channel>();
const profileFields = computed(() => user.value.fields.filter(field => {
	if (user.value.host == null && [streamingBannerFieldName, streamingChannelFieldName, streamingSupportFieldName, streamingTagsFieldName, streamingCommunityFieldName, ...streamingResourceFieldNames].includes(field.name)) return false;
	return !streamingLinks.value.some(link => link.field === field);
}));
const bannerEl = useTemplateRef('bannerEl');
const memoTextareaEl = useTemplateRef('memoTextareaEl');
const timelineEl = useTemplateRef<InstanceType<typeof XTimeline_TypeReferenceOnly>>('timelineEl');
const memoDraft = ref(props.user.memo);
const isEditingMemo = ref(false);
const moderationNote = ref(props.user.moderationNote ?? '');
const editModerationNote = ref(false);
const isModerationNoteDirty = ref(false);

watch(moderationNote, async (newValue) => {
	// 再取得した値を同期しただけの場合は保存しない
	if (newValue === (user.value.moderationNote ?? '')) return;
	await misskeyApi('admin/update-user-note', { userId: user.value.id, text: newValue });
	user.value = { ...user.value, moderationNote: newValue };
});

const style = computed(() => {
	if (props.user.bannerUrl == null) return {};
	if (prefer.s.disableShowingAnimatedImages) {
		return {
			backgroundImage: `url(${ getStaticImageUrl(props.user.bannerUrl) })`,
		};
	} else {
		return {
			backgroundImage: `url(${ props.user.bannerUrl })`,
		};
	};
});

function menu(ev: PointerEvent) {
	const { menu, cleanup } = getUserMenu(user.value, router);
	os.popupMenu(menu, ev.currentTarget ?? ev.target).finally(cleanup);
}

function showMemoTextarea() {
	isEditingMemo.value = true;
	nextTick(() => {
		memoTextareaEl.value?.focus();
	});
}

function adjustMemoTextarea() {
	if (!memoTextareaEl.value) return;
	memoTextareaEl.value.style.height = '0px';
	memoTextareaEl.value.style.height = `${memoTextareaEl.value.scrollHeight}px`;
}

async function updateMemo() {
	await misskeyApi('users/update-memo', {
		memo: memoDraft.value,
		userId: props.user.id,
	});
	isEditingMemo.value = false;
}

watch(() => props.user, () => {
	user.value = props.user;
	// 編集中は上書きしない (入力中の内容を消してしまう)
	if (!isModerationNoteDirty.value) moderationNote.value = props.user.moderationNote ?? '';
	if (isEditingMemo.value) return;
	memoDraft.value = props.user.memo;
});

// ここでは失敗は握りつぶす（Pull to Refreshがもどらなくなるので）
async function reload() {
	await Promise.allSettled([
		props.refreshUser?.(),
		timelineEl.value?.reload(),
	]);
}

let bannerParallaxResizeObserver: ResizeObserver | null = null;

function calcBannerParallax() {
	if (!bannerEl.value || !CSS.supports('view-timeline-inset', 'auto 100px')) return;
	const elRect = bannerEl.value.getBoundingClientRect();
	const scrollEl = getScrollContainer(bannerEl.value);
	const scrollPosition = scrollEl?.scrollTop ?? window.scrollY;
	const scrollContainerHeight = scrollEl?.clientHeight ?? window.innerHeight;
	const scrollContainerTop = scrollEl?.getBoundingClientRect().top ?? 0;
	const top = scrollPosition + elRect.top - scrollContainerTop;
	const bottom = scrollContainerHeight - top;
	bannerEl.value.style.setProperty('--bannerParallaxInset', `auto ${bottom}px`);
}

function initCalcBannerParallax() {
	const scrollEl = bannerEl.value ? getScrollContainer(bannerEl.value) : null;
	if (scrollEl != null && CSS.supports('view-timeline-inset', 'auto 100px')) {
		bannerParallaxResizeObserver = new ResizeObserver(() => {
			calcBannerParallax();
		});
		bannerParallaxResizeObserver.observe(scrollEl);
	}
}

function disposeBannerParallaxResizeObserver() {
	if (bannerParallaxResizeObserver) {
		bannerParallaxResizeObserver.disconnect();
		bannerParallaxResizeObserver = null;
	}
}

onMounted(() => {
	if (isBirthday(user.value)) {
		confetti({
			duration: 1000 * 4,
		});
	}

	nextTick(() => {
		calcBannerParallax();
		adjustMemoTextarea();
	});

	initCalcBannerParallax();
});

onActivated(() => {
	if (bannerEl.value) {
		calcBannerParallax();
		initCalcBannerParallax();
	}
});

onUnmounted(disposeBannerParallaxResizeObserver);
onDeactivated(disposeBannerParallaxResizeObserver);
</script>

<style lang="scss" scoped>
.ftskorzw {

	> .main {

		> .punished {
			font-size: 0.8em;
			padding: 16px;
		}

		> .profile {

			> .main {
				position: relative;
				overflow: clip;

				> .banner-container {
					position: relative;
					--bannerHeight: 250px;
					height: var(--bannerHeight);
					overflow: clip;

					> .banner {
						width: 100%;
						height: 100%;
						background-size: cover;
						background-color: #4c5e6d;
						background-repeat: repeat-y;
						background-position-x: center;
						background-position-y: 50%;
						will-change: background-position-y;
					}

					> .fade {
						position: absolute;
						bottom: 0;
						left: 0;
						width: 100%;
						height: 78px;
						background: linear-gradient(transparent, rgba(#000, 0.7));
					}

					> .followed {
						position: absolute;
						top: 12px;
						left: 12px;
						padding: 4px 8px;
						color: #fff;
						background: rgba(0, 0, 0, 0.7);
						font-size: 0.7em;
						border-radius: var(--MI-radius-xs);
					}

					> .actions {
						position: absolute;
						top: 12px;
						right: 12px;
						-webkit-backdrop-filter: var(--MI-blur, blur(8px));
						backdrop-filter: var(--MI-blur, blur(8px));
						background: rgba(0, 0, 0, 0.2);
						padding: 8px;
						border-radius: var(--MI-radius-xl);

						> .menu {
							vertical-align: bottom;
							height: 31px;
							width: 31px;
							color: #fff;
							text-shadow: 0 0 8px #000;
							font-size: 16px;
						}

						> .koudoku {
							margin-left: 4px;
							vertical-align: bottom;
						}
					}

					> .title {
						position: absolute;
						bottom: 0;
						left: 0;
						width: 100%;
						padding: 0 0 8px 154px;
						box-sizing: border-box;
						color: #fff;

						> .name {
							display: flex;
							align-items: center;
							margin: -10px;
							padding: 10px;
							line-height: 32px;
							font-weight: bold;
							font-size: 1.8em;
							filter: drop-shadow(0 0 4px #000);
						}

						> .bottom {
							> * {
								display: inline-block;
								margin-right: 16px;
								line-height: 20px;
								opacity: 0.8;

								&.username {
									font-weight: bold;
								}
							}

							> .add-note-button {
								background: rgba(0, 0, 0, 0.2);
								color: #fff;
								-webkit-backdrop-filter: var(--MI-blur, blur(8px));
								backdrop-filter: var(--MI-blur, blur(8px));
								border-radius: var(--MI-radius-xl);
								padding: 4px 8px;
								font-size: 80%;
							}
						}
					}
				}

				> .title {
					display: none;
					text-align: center;
					padding: 50px 8px 16px 8px;
					font-weight: bold;
					border-bottom: solid 0.5px var(--MI_THEME-divider);

					> .bottom {
						> * {
							display: inline-block;
							margin-right: 8px;
							opacity: 0.8;
						}
					}
				}

				> .avatar {
					display: block;
					position: absolute;
					top: 170px;
					left: 16px;
					z-index: 2;
					width: 120px;
					height: 120px;
					box-shadow: var(--MI-shadow-md);
				}

				> .followedMessage {
					padding: 24px 24px 0 154px;

					> .fukidashi {
						display: block;
						--fukidashi-bg: color-mix(in srgb, var(--MI_THEME-accent), var(--MI_THEME-panel) 85%);
						--fukidashi-radius: 16px;
						font-size: 0.9em;

						.messageHeader {
							opacity: 0.7;
							font-size: 0.85em;
						}
					}
				}

				> .roles {
					padding: 24px 24px 0 154px;
					font-size: 0.95em;
					display: flex;
					flex-wrap: wrap;
					gap: 8px;

					> .role {
						border: solid 1px var(--color, var(--MI_THEME-divider));
						border-radius: var(--MI-radius-full);
						margin-right: 4px;
						padding: 3px 8px;
					}
				}

				> .moderationNote {
					margin: 12px 24px 0 154px;
				}

				> .memo {
					margin: 12px 24px 0 154px;
					background: transparent;
					color: var(--MI_THEME-fg);
					border: 1px solid var(--MI_THEME-divider);
					border-radius: var(--MI-radius-sm);
					padding: 8px;
					line-height: 0;

					> .heading {
						text-align: left;
						color: color(from var(--MI_THEME-fg) srgb r g b / 0.5);
						line-height: 1.5;
						font-size: 85%;
					}

					textarea {
						margin: 0;
						padding: 0;
						resize: none;
						border: none;
						outline: none;
						width: 100%;
						height: auto;
						min-height: 0;
						line-height: 1.5;
						color: var(--MI_THEME-fg);
						overflow: hidden;
						background: transparent;
						font-family: inherit;
					}
				}

				> .description {
					padding: 24px 24px 24px 154px;
					font-size: 0.95em;

					> .empty {
						margin: 0;
						opacity: 0.5;
					}
				}

				> .status {
					display: flex;
					padding: 24px;
					border-top: solid 0.5px var(--MI_THEME-divider);

					> a {
						flex: 1;
						text-align: center;

						&.active {
							color: var(--MI-c-accentInk);
						}

						&:hover {
							text-decoration: none;
						}

						> b {
							display: block;
							line-height: 16px;
						}

						> span {
							font-size: 70%;
						}
					}
				}
			}
		}

		> .contents {
			> .content {
				margin-bottom: var(--MI-margin);
			}
		}
	}

}

@container (max-width: 500px) {
	.ftskorzw {
		> .main {
			> .profile > .main {
				> .banner-container {
					--bannerHeight: 140px;
					height: var(--bannerHeight);

					> .fade {
						display: none;
					}

					> .title {
						display: none;
					}
				}

				> .title {
					display: block;
				}

				> .avatar {
					top: 90px;
					left: 0;
					right: 0;
					width: 92px;
					height: 92px;
					margin: auto;
				}

				> .followedMessage {
					padding: 16px 16px 0 16px;
				}

				> .roles {
					padding: 16px 16px 0 16px;
					justify-content: center;
				}

				> .moderationNote {
					margin: 16px 16px 0 16px;
				}

				> .memo {
					margin: 16px 16px 0 16px;
				}

				> .description {
					padding: 16px;
					text-align: center;
				}

				> .status {
					padding: 16px;
				}
			}

			> .contents {
				> .nav {
					font-size: 80%;
				}
			}
		}
	}
}

@supports (view-timeline-name: --name) {
	.ftskorzw {
		> .main {
			> .profile > .main {
				> .banner-container {
					view-timeline-name: --bannerParallax;
					view-timeline-inset: var(--bannerParallaxInset, auto);
					view-timeline-axis: block;

					> .banner {
						animation: bannerParallaxKeyframes linear both;
						animation-timeline: --bannerParallax;
						animation-range: cover;
					}
				}
			}
		}
	}
}

@keyframes bannerParallaxKeyframes {
	from {
		background-position-y: 50%;
	}
	to {
		background-position-y: calc(50% + var(--bannerHeight, 250px) / 3);
	}
}
</style>

<style lang="scss" module>
.profileLayout {
	display: flex;
	flex-direction: column;
	gap: var(--MI-margin);

	@container (min-width: 740px) {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
		align-items: start;
	}

	> :global(.main) {
		min-width: 0;
	}
}

.profileSidebar {
	min-width: 0;
	container-type: inline-size;
}

.sideHeading,
.newsHeading {
	margin: 0;
}

.sideHeading {
	font-size: 1.125em;
	display: flex;
	align-items: center;
	gap: 8px;

	&::before {
		content: '';
		flex-shrink: 0;
		width: 6px;
		height: 6px;
		border-radius: var(--MI-radius-full);
		background: var(--MI_THEME-accent);
	}
}

.newsHeading {
	font-size: 0.9em;
}

.emptyNews {
	margin: 0;
	padding: 12px;
	font-size: 0.8em;
}

.streamingBanners {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 100px), 130px));
	gap: 8px;
	padding: 0;
	margin: 0;
	list-style: none;

	img {
		display: block;
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: var(--MI-radius-sm);
		background: var(--MI_THEME-panel);
	}
}

.streamingBanner {
	position: relative;
	display: block;
	border-radius: var(--MI-radius-sm);

	&:is(a):hover {
		box-shadow: 0 0 0 2px var(--MI_THEME-accent);
	}
}

.bannerLinkIcon {
	position: absolute;
	inset-inline-end: 6px;
	inset-block-end: 6px;
	padding: 4px;
	border-radius: var(--MI-radius-sm);
	background: var(--MI_THEME-accent);
	color: var(--MI-c-fgOnAccent);
}

.nickname {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
}

.streamerIcon {
	flex-shrink: 0;
	margin-inline-start: 0.35em;
	font-size: 0.8em;
}

.streamingLinks {
	padding: 12px;
	font-size: 0.9em;

	> h3 {
		margin: 0 0 6px;
		padding-inline: 8px;
		font-size: 1em;
	}
}

.linkRows {
	margin: 0;
	padding: 0;
	list-style: none;
}

.linkRows > li + li {
	border-top: 1px solid var(--MI_THEME-divider);
}

.streamingLinks .linkRow {
	display: grid;
	grid-template-columns: 34px minmax(0, 1fr) auto;
	align-items: center;
	gap: 8px;
	padding: 8px;
	border-radius: var(--MI-radius-sm);
	color: var(--MI_THEME-fg);
	text-decoration: none;

	&:hover {
		background: var(--MI_THEME-buttonBg);
	}
}

.linkIcon {
	display: grid;
	place-items: center;
	width: 34px;
	height: 34px;
	border-radius: var(--MI-radius-sm);
	background: var(--MI_THEME-buttonBg);
}

.featuredLinkIcon {
	background: color-mix(in srgb, var(--MI_THEME-accent) 16%, var(--MI_THEME-panel));
	color: var(--MI-c-accentInk);
}

.linkText {
	display: grid;
	gap: 1px;
	min-width: 0;
	word-break: normal;
	overflow-wrap: anywhere;

	> small {
		opacity: 0.7;
	}
}

.tl {
	background: var(--MI_THEME-bg);
	border-radius: var(--MI-radius);
	box-shadow: 0 0 0 1px var(--MI-c-border);
	overflow: clip;
	--MI-paginationControl-margin: 0;
	--MI-paginationControl-padding: 10px 12px;
	--MI-paginationControl-border: solid 1px var(--MI-c-border);
}

</style>

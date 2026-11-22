<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div style="position: relative;">
	<MkA :to="`/channels/${channel.id}`" class="eftoefju" @click="updateLastReadedAt">
		<div class="banner" :style="bannerStyle">
			<i v-if="!channel.bannerUrl" class="ti ti-device-tv bannerIcon" aria-hidden="true"></i>
			<div v-if="channel.isSensitive" class="sensitiveIndicator">{{ i18n.ts.sensitive }}</div>
		</div>
		<article>
			<h3 class="name"><i class="ti ti-device-tv" aria-hidden="true"></i> {{ channel.name }}</h3>
			<p v-if="channel.description" class="description" :title="channel.description">{{ channel.description }}</p>
			<div class="status">
				<span>
					<i class="ti ti-users ti-fw"></i>
					<I18n :src="i18n.ts._channel.usersCount" tag="span">
						<template #n>
							<b>{{ channel.usersCount }}</b>
						</template>
					</I18n>
				</span>
				<span>
					<i class="ti ti-pencil ti-fw"></i>
					<I18n :src="i18n.ts._channel.notesCount" tag="span">
						<template #n>
							<b>{{ channel.notesCount }}</b>
						</template>
					</I18n>
				</span>
				<span v-if="$i != null && $i.id === channel.userId" class="admin">
					<i class="ti ti-user-star ti-fw"></i>
					<span>{{ i18n.ts.youAreAdmin }}</span>
				</span>
			</div>
			<footer v-if="channel.lastNotedAt">
				{{ i18n.ts.updatedAt }}: <MkTime :time="channel.lastNotedAt"/>
			</footer>
		</article>
	</MkA>
	<div
		v-if="channel.lastNotedAt && (channel.isFavorited || channel.isFollowing) && (!lastReadedAt || Date.parse(channel.lastNotedAt) > lastReadedAt)"
		class="indicator"
	></div>
</div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import * as Misskey from 'misskey-js';
import { $i } from '@/i.js';
import { i18n } from '@/i18n.js';
import { miLocalStorage } from '@/local-storage.js';

const props = defineProps<{
	channel: Misskey.entities.Channel;
}>();

const getLastReadedAt = (): number | null => {
	return miLocalStorage.getItemAsJson(`channelLastReadedAt:${props.channel.id}`) ?? null;
};

const lastReadedAt = ref(getLastReadedAt());

watch(() => props.channel.id, () => {
	lastReadedAt.value = getLastReadedAt();
});

const updateLastReadedAt = () => {
	lastReadedAt.value = props.channel.lastNotedAt ? Date.parse(props.channel.lastNotedAt) : Date.now();
};

const bannerStyle = computed(() => {
	if (props.channel.bannerUrl) {
		return { backgroundImage: `url(${props.channel.bannerUrl})` };
	} else {
		return {};
	}
});
</script>

<style lang="scss" scoped>
// 一覧用カード: MkPagePreview と同じく上に 16:9 バナー、下に本文。区切りは枠線のみ
.eftoefju {
	position: relative;
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
	background: var(--MI_THEME-panel);
	border-radius: var(--MI-radius-lg);
	box-shadow: 0 0 0 1px var(--MI-c-border);
	transition: box-shadow var(--MI-duration-fast) var(--MI-ease);

	&:hover {
		text-decoration: none;
		box-shadow: 0 0 0 1px var(--MI-c-borderStrong);
	}

	&:focus-within {
		outline: none;

		&::after {
			content: '';
			position: absolute;
			inset: 0;
			border-radius: inherit;
			pointer-events: none;
			box-shadow: inset 0 0 0 2px var(--MI_THEME-focus);
		}
	}

	> .banner {
		position: relative;
		display: grid;
		place-items: center;
		aspect-ratio: 16 / 9;
		background-color: var(--MI-c-sunken);
		background-position: center;
		background-size: cover;

		> .bannerIcon {
			color: var(--MI-c-fgSubtle);
			font-size: 1.5em;
		}

		> .sensitiveIndicator {
			position: absolute;
			top: 10px;
			left: 10px;
			padding: 3px 8px;
			background: var(--MI_THEME-panel);
			color: var(--MI_THEME-warn);
			border-radius: var(--MI-radius-full);
			font-weight: bold;
			font-size: 0.75em;
		}
	}

	> article {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 6px;
		padding: 12px 14px 14px;

		> .name {
			margin: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			font-size: 1em;

			> i {
				color: var(--MI-c-accentInk);
			}
		}

		> .description {
			display: -webkit-box;
			margin: 0;
			overflow: hidden;
			color: var(--MI-c-fgMuted);
			font-size: 0.85em;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 2;
		}

		> .status {
			display: flex;
			flex-wrap: wrap;
			gap: 4px 12px;
			color: var(--MI-c-fgMuted);
			font-size: 0.8em;

			> .admin {
				color: var(--MI_THEME-warn);
			}
		}

		> footer {
			margin-top: auto;
			padding-top: 4px;
			color: var(--MI-c-fgSubtle);
			font-size: 0.8em;
		}
	}
}

.indicator {
	position: absolute;
	top: 0;
	right: 0;
	transform: translate(25%, -25%);
	background-color: var(--MI_THEME-accent);
	border: solid var(--MI_THEME-bg) 4px;
	border-radius: 100%;
	width: 1.5rem;
	height: 1.5rem;
	aspect-ratio: 1 / 1;
}
</style>

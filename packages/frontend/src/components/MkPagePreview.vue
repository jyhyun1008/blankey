<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkA :to="`/@${page.user.username}/pages/${page.name}`" class="vhpxefrj" :class="{ compact }">
	<div class="thumbnail">
		<MediaImage
			v-if="page.eyeCatchingImage"
			:image="page.eyeCatchingImage"
			:disableImageLink="true"
			:controls="false"
			:cover="true"
			:class="[$style.eyeCatchingImageRoot, { [$style.compactImage]: compact }]"
		/>
		<div v-else :class="[$style.eyeCatchingImageRoot, { [$style.compactImage]: compact }]" aria-hidden="true"><i class="ti ti-file-text"></i></div>
	</div>
	<article>
		<header>
			<h1 :title="page.title">{{ page.title }}</h1>
			<MkTime :time="page.createdAt" mode="absolute" :datetime="page.createdAt" :class="$style.createdAt"/>
		</header>
		<MkHashtagPills :tags="tags" singleLine :class="$style.tags"/>
		<p v-if="page.summary" :title="page.summary">{{ page.summary.length > 85 ? page.summary.slice(0, 85) + '…' : page.summary }}</p>
		<footer v-if="!compact">
			<img v-if="page.user.avatarUrl" class="icon" :src="page.user.avatarUrl"/>
			<p>{{ userName(page.user) }}</p>
		</footer>
	</article>
</MkA>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import * as Misskey from 'misskey-js';
import { userName } from '@@/js/user.js';
import MediaImage from '@/components/MkMediaImage.vue';
import MkHashtagPills from '@/components/MkHashtagPills.vue';
import { getPageHashtags } from '@/utility/post-hashtags.js';

const props = defineProps<{
	page: Misskey.entities.Page;
	compact?: boolean;
}>();
const tags = computed(() => getPageHashtags(props.page));
</script>

<style module>
.tags {
	--hashtag-pills-margin-end: 8px;
}

.createdAt {
	display: block;
	margin-top: 2px;
	color: var(--MI-c-fgSubtle);
	font-size: 0.8em;
}

.eyeCatchingImageRoot {
	display: grid;
	place-items: center;
	width: 100%;
	aspect-ratio: 16 / 9;
	overflow: hidden;
	background: var(--MI-c-sunken);
	color: var(--MI-c-fgSubtle);
	font-size: 1.5em;
}

.compactImage {
	border-radius: var(--MI-radius-sm);
	font-size: 1.1em;
}
</style>

<style lang="scss" scoped>
// 一覧用カード: 上に 16:9 サムネイル、下に本文。区切りは枠線のみ
.vhpxefrj {
	position: relative;
	display: flex;
	flex-direction: column;
	min-width: 0;
	overflow: hidden;
	background: var(--MI_THEME-panel);
	border-radius: var(--MI-radius-lg);
	box-shadow: 0 0 0 1px var(--MI-c-border);
	transition: box-shadow var(--MI-duration-fast) var(--MI-ease);

	&:hover {
		text-decoration: none;
		box-shadow: 0 0 0 1px var(--MI-c-borderStrong);

		> .thumbnail > * {
			transform: scale(1.04);
		}
	}

	&:focus-within {
		outline: none;

		&::after {
			content: "";
			position: absolute;
			inset: 0;
			border-radius: inherit;
			pointer-events: none;
			box-shadow: inset 0 0 0 2px var(--MI_THEME-focus);
		}
	}

	> .thumbnail {
		overflow: hidden;

		> * {
			transition: transform var(--MI-duration-slow) var(--MI-ease);
		}
	}

	> article {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
		padding: 12px 14px 14px;

		> header > h1 {
			display: -webkit-box;
			margin: 0;
			overflow: hidden;
			font-size: 1em;
			font-weight: bold;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 2;
		}

		> p {
			display: -webkit-box;
			margin: 0;
			overflow: hidden;
			color: var(--MI-c-fgMuted);
			font-size: 0.85em;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 2;
		}

		> footer {
			display: flex;
			align-items: center;
			gap: 6px;
			margin-top: auto;
			padding-top: 4px;
			color: var(--MI-c-fgMuted);
			font-size: 0.8em;

			> img {
				flex-shrink: 0;
				width: 18px;
				height: 18px;
				object-fit: cover;
				border-radius: var(--MI-radius-full);
			}

			> p {
				margin: 0;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
		}
	}

	// 一覧の行: 左にサムネイル、右に本文
	&.compact {
		display: grid;
		grid-template-columns: minmax(0, 34%) minmax(0, 1fr);
		gap: 12px;
		align-items: center;
		padding: 6px;
		overflow: visible;
		background: none;
		border-radius: var(--MI-radius-md);
		box-shadow: none;
		transition: background var(--MI-duration-fast) var(--MI-ease);

		&:hover {
			background: var(--MI-c-hover);
			box-shadow: none;

			> .thumbnail > * {
				transform: none;
			}
		}

		> .thumbnail {
			grid-area: 1 / 1;
			border-radius: var(--MI-radius-sm);
		}

		> article {
			display: block;
			grid-area: 1 / 2;
			padding: 0;

			> p {
				display: block;
				margin-top: 2px;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
				font-size: 0.8em;
			}

			> header > h1 {
				display: block;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
				font-size: 0.9em;
			}
		}
	}
}

@media (prefers-reduced-motion: reduce) {
	.vhpxefrj:hover > .thumbnail > * {
		transform: none;
	}
}
</style>

<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_panel" :class="[$style.card, { [$style.compact]: compact }]">
	<component
		:is="external ? 'a' : 'MkA'"
		:class="$style.link"
		:aria-label="title"
		v-bind="external ? { href: to, target: '_blank', rel: 'nofollow noopener' } : { to }"
	>
		<div :class="$style.thumbnail">
			<slot name="thumbnail" :imageClass="$style.image">
				<i class="ti ti-video" :class="$style.placeholder" aria-hidden="true"></i>
			</slot>
		</div>
		<footer :class="$style.caption">
			<span :class="$style.title" :title="title">{{ title }}</span>
			<MkHashtagPills :tags="tags" singleLine :class="$style.tags"/>
			<MkTime v-if="createdAt" :time="createdAt" mode="absolute" :datetime="createdAt" :class="$style.createdAt"/>
		</footer>
	</component>
	<MkAvatar v-if="user && !compact" :user="user" :class="$style.avatar" link preview/>
</div>
</template>

<script lang="ts" setup>
import type { entities } from 'misskey-js';
import MkHashtagPills from '@/components/MkHashtagPills.vue';

withDefaults(defineProps<{
	to: string;
	title: string;
	createdAt?: string;
	tags?: string[];
	user?: entities.UserLite;
	compact?: boolean;
	external?: boolean;
}>(), {
	tags: () => [],
});
</script>

<style lang="scss" module>
$captionScrim: #161318;
$captionForeground: #fff;

.card {
	position: relative;
	// 高さを固定しない一覧 (動画アーカイブ等) は --media-preview-height: auto で比率に従わせる
	height: var(--media-preview-height, 200px);
	aspect-ratio: var(--media-preview-aspect-ratio, auto);

	&:hover > .link {
		text-decoration: none;

		> .thumbnail {
			transform: scale(1.1);
		}

		> .caption::before {
			opacity: 1;
		}
	}
}

.compact {
	height: auto;
	aspect-ratio: var(--media-preview-aspect-ratio, 1);

	.caption {
		padding: 4px;
		font-size: 0.8em;
	}
}

.link,
.thumbnail,
.image {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}

.thumbnail {
	display: grid;
	place-items: center;
	transition: transform 0.5s ease;
}

.image {
	object-fit: cover;
}

.placeholder {
	opacity: 0.6;
	font-size: 1.375em;
}

.avatar {
	position: absolute;
	z-index: 1;
	top: 12px;
	right: 12px;
	width: 32px;
	height: 32px;
}

.caption {
	position: absolute;
	isolation: isolate;
	bottom: 0;
	width: 100%;
	padding: 16px;
	box-sizing: border-box;
	color: $captionForeground;
	text-shadow: 0 0 8px $captionScrim;
	background: linear-gradient(transparent, rgba($captionScrim, 0.7));

	&::before {
		content: "";
		position: absolute;
		z-index: -1;
		inset: 0;
		background: linear-gradient(rgba($captionScrim, 0.4), transparent);
		opacity: 0;
		transition: opacity 0.5s ease;
	}
}

.title {
	font-weight: bold;
	overflow-wrap: anywhere;
}

.compact .title {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.createdAt {
	display: block;
	margin-top: 2px;
	font-size: 0.75em;
}

.tags {
	--hashtag-pills-margin-start: 6px;
}
</style>

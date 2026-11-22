<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.authorCard">
	<MkAvatar :user="user" :class="$style.authorAvatar" indicator link preview/>
	<div :class="$style.authorText">
		<MkA :to="userPage(user)" :class="$style.authorName"><MkUserName :user="user" :nowrap="false"/></MkA>
		<MkAcct :user="user" :class="$style.authorAcct"/>
	</div>
	<MkFollowButton v-if="$i && $i.id !== user.id" :user="user" @update:user="u => emit('update:user', u)"/>
</div>
</template>

<script lang="ts" setup>
import type * as Misskey from 'misskey-js';
import { userPage } from '@@/js/user.js';
import MkFollowButton from '@/components/MkFollowButton.vue';
import { $i } from '@/i.js';

defineProps<{
	user: Misskey.entities.UserDetailed;
}>();

const emit = defineEmits<{
	(ev: 'update:user', user: Misskey.entities.UserDetailed): void;
}>();
</script>

<style lang="scss" module>
.authorCard {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 16px;
	border-radius: var(--MI-radius-md);
	background: var(--MI-c-inset);
}

.authorAvatar {
	flex: none;
	width: 52px;
	height: 52px;
}

.authorText {
	flex: 1;
	min-width: 0;
}

.authorName {
	font-weight: bold;
	color: var(--MI_THEME-fg);
}

.authorAcct {
	display: block;
	color: var(--MI-c-fgMuted);
	font-size: 0.85em;
}
</style>

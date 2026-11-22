<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<XPostCategoryList class="_spacer _profileContent" :userId="user.id" :pageSize="pageSize" :loadBatch="loadBatch" :getTags="getGalleryPostHashtags">
	<template #actions>
		<div v-if="$i?.id === user.id" class="_buttons">
			<MkButton primary type="routerLink" to="/gallery/new"><i class="ti ti-plus"></i> {{ i18n.ts.add }}</MkButton>
		</div>
	</template>
	<MkPagination v-slot="{items}" :paginator="paginator" withControl>
		<div :class="$style.root">
			<MkGalleryPostPreview v-for="post in items" :key="post.id" :post="post" class="post"/>
		</div>
	</MkPagination>
	<template #filtered="{ items }">
		<div :class="$style.root">
			<MkGalleryPostPreview v-for="post in items" :key="post.id" :post="post" class="post"/>
		</div>
	</template>
</XPostCategoryList>
</template>

<script lang="ts" setup>
import { computed, markRaw } from 'vue';
import type * as Misskey from 'misskey-js';
import XPostCategoryList from './post-category-list.vue';
import MkButton from '@/components/MkButton.vue';
import MkGalleryPostPreview from '@/components/MkGalleryPostPreview.vue';
import MkPagination from '@/components/MkPagination.vue';
import { Paginator } from '@/utility/paginator.js';
import { getGalleryPostHashtags } from '@/utility/post-hashtags.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { $i } from '@/i.js';
import { i18n } from '@/i18n.js';

const props = defineProps<{
	user: Misskey.entities.User;
}>();

const pageSize = 6;
const paginator = markRaw(new Paginator('users/gallery/posts', {
	limit: pageSize,
	computedParams: computed(() => ({
		userId: props.user.id,
	})),
}));

function loadBatch(userId: string, limit: number, untilId: string | undefined, signal: AbortSignal) {
	return misskeyApi('users/gallery/posts', { userId, limit, untilId }, undefined, signal);
}
</script>

<style lang="scss" module>
.root {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
	grid-gap: 12px;
	margin: var(--MI-margin);
}
</style>

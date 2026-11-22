<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<XPostCategoryList class="_spacer _profileContent" :userId="user.id" :pageSize="pageSize" :loadBatch="loadBatch" :getTags="getPageHashtags">
	<template #actions>
		<div v-if="$i?.id === user.id" class="_buttons">
			<MkButton primary type="routerLink" to="/pages/new"><i class="ti ti-plus"></i> {{ i18n.ts.add }}</MkButton>
		</div>
	</template>
	<MkPagination v-slot="{items}" :paginator="paginator" withControl>
		<div class="_cardGrid">
			<MkPagePreview v-for="page in items" :key="page.id" :page="page"/>
		</div>
	</MkPagination>
	<template #filtered="{ items }">
		<div class="_cardGrid">
			<MkPagePreview v-for="page in items" :key="page.id" :page="page"/>
		</div>
	</template>
</XPostCategoryList>
</template>

<script lang="ts" setup>
import { computed, markRaw } from 'vue';
import type * as Misskey from 'misskey-js';
import XPostCategoryList from './post-category-list.vue';
import MkButton from '@/components/MkButton.vue';
import MkPagePreview from '@/components/MkPagePreview.vue';
import MkPagination from '@/components/MkPagination.vue';
import { Paginator } from '@/utility/paginator.js';
import { getPageHashtags } from '@/utility/post-hashtags.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { $i } from '@/i.js';
import { i18n } from '@/i18n.js';

const props = defineProps<{
	user: Misskey.entities.User;
}>();

const pageSize = 20;
const paginator = markRaw(new Paginator('users/pages', {
	limit: pageSize,
	computedParams: computed(() => ({
		userId: props.user.id,
	})),
}));

function loadBatch(userId: string, limit: number, untilId: string | undefined, signal: AbortSignal) {
	return misskeyApi('users/pages', { userId, limit, untilId }, undefined, signal);
}
</script>

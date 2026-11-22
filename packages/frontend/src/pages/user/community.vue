<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_spacer _profileContent">
	<MkResult v-if="user.host != null" type="empty"/>
	<MkChannelList v-else :paginator="paginator"/>
</div>
</template>

<script lang="ts" setup>
import { computed, markRaw } from 'vue';
import type { entities } from 'misskey-js';
import MkChannelList from '@/components/MkChannelList.vue';
import MkResult from '@/components/global/MkResult.vue';
import { Paginator } from '@/utility/paginator.js';

const props = defineProps<{
	user: entities.UserDetailed;
}>();

const paginator = markRaw(new Paginator('channels/search', {
	limit: 20,
	computedParams: computed(() => ({
		query: '',
		userId: props.user.id,
	})),
}));
</script>

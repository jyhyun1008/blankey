<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_spacer" style="--MI_SPACER-w: 800px;">
	<MkTab v-model="tab" :tabs="searchTabs" :class="$style.tabs"/>
	<template v-if="tab === 'note'">
		<XNote v-if="notesSearchAvailable || ignoreNotesSearchAvailable" v-bind="props"/>
		<MkInfo v-else warn>{{ i18n.ts.notesSearchNotAvailable }}</MkInfo>
	</template>
	<template v-else-if="tab === 'user'">
		<XUser v-if="usersSearchAvailable" v-bind="props"/>
		<MkInfo v-else warn>{{ i18n.ts.usersSearchNotAvailable }}</MkInfo>
	</template>
</div>
</template>

<script lang="ts" setup>
import { defineAsyncComponent, ref, toRef } from 'vue';
import { i18n } from '@/i18n.js';
import { notesSearchAvailable, usersSearchAvailable } from '@/utility/check-permissions.js';
import MkInfo from '@/components/MkInfo.vue';
import MkTab from '@/components/MkTab.vue';
import type { Tab } from '@/components/MkTab.vue';

const props = withDefaults(defineProps<{
	query?: string,
	userId?: string,
	username?: string,
	host?: string | null,
	type?: 'note' | 'user',
	origin?: 'combined' | 'local' | 'remote',
	// For storybook only
	ignoreNotesSearchAvailable?: boolean,
}>(), {
	query: '',
	userId: undefined,
	username: undefined,
	host: undefined,
	type: 'note',
	origin: 'combined',
	ignoreNotesSearchAvailable: false,
});

const XNote = defineAsyncComponent(() => import('./search.note.vue'));
const XUser = defineAsyncComponent(() => import('./search.user.vue'));

const tab = ref(toRef(props, 'type').value);

// explore ページの検索タブ本文。ノート / ユーザー検索を切り替える
const searchTabs: Tab<'note' | 'user'>[] = [{
	key: 'note',
	label: i18n.ts.notes,
	icon: 'ti ti-pencil',
}, {
	key: 'user',
	label: i18n.ts.users,
	icon: 'ti ti-users',
}];
</script>

<style lang="scss" module>
.tabs {
	margin-bottom: var(--MI-margin);
}
</style>

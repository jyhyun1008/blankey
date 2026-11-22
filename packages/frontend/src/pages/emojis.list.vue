<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps">
	<slot name="header"></slot>

	<MkInput v-model="q" :placeholder="i18n.ts.search" type="search" autocapitalize="off">
		<template #prefix><i class="ti ti-search"></i></template>
	</MkInput>

	<template v-if="searchResult">
		<div v-if="searchResult.length" :class="$style.emojis">
			<XEmoji v-for="emoji in searchResult" :key="emoji.name" :emoji="emoji"/>
		</div>
		<MkResult v-else type="empty"/>
	</template>
	<template v-else-if="grouped">
		<MkFoldableSection v-for="category in categories" :key="category ?? '___root___'" :expanded="categories.length === 1">
			<template #header>{{ category || i18n.ts.other }}</template>
			<div :class="$style.emojis">
				<XEmoji v-for="emoji in emojis.filter(e => e.category === category)" :key="emoji.name" :emoji="emoji"/>
			</div>
		</MkFoldableSection>
	</template>
	<div v-else-if="emojis.length" :class="$style.emojis">
		<XEmoji v-for="emoji in emojis" :key="emoji.name" :emoji="emoji"/>
	</div>
	<MkResult v-else type="empty"/>
</div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import * as Misskey from 'misskey-js';
import XEmoji from './emojis.emoji.vue';
import MkInput from '@/components/MkInput.vue';
import MkFoldableSection from '@/components/MkFoldableSection.vue';
import { i18n } from '@/i18n.js';

// サーバーのカスタム絵文字一覧 (about) とユーザーページの絵文字タブで共通の、検索 + カード一覧
const props = defineProps<{
	emojis: Misskey.entities.EmojiSimple[];
	/** カテゴリーごとに折りたたみで分ける */
	grouped?: boolean;
}>();

const q = ref('');

const categories = computed(() => [...new Set(props.emojis.map(emoji => emoji.category))]);

const searchResult = computed<Misskey.entities.EmojiSimple[] | null>(() => {
	const query = q.value.trim();
	if (query === '') return null;

	const names = query.match(/:([a-z0-9_]*):/g);
	if (names) return props.emojis.filter(emoji => names.includes(`:${emoji.name}:`));
	return props.emojis.filter(emoji => emoji.name.includes(query) || emoji.aliases.includes(query));
});
</script>

<style lang="scss" module>
.emojis {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 190px), 1fr));
	gap: 10px;
}
</style>

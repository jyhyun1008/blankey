<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps_m">
	<MkInfo v-if="!$i?.isStreamer">{{ i18n.ts._profile.streamingCustomEmojisRequiresStreamer }}</MkInfo>
	<template v-else>
		<MkInfo>{{ i18n.ts._profile.streamingCustomEmojisDescription }}</MkInfo>
		<MkButton primary :disabled="!canCreate" @click="createEmoji"><i class="ti ti-plus"></i> {{ i18n.ts.add }}</MkButton>
	</template>

	<MkLoading v-if="loading"/>
	<MkError v-else-if="loadFailed" @retry="loadEmojis"/>
	<MkInfo v-else-if="!emojis.length">{{ i18n.ts.nothing }}</MkInfo>
	<ul v-else :class="$style.list" class="_gaps_s">
		<li v-for="emoji in emojis" :key="emoji.id" :class="$style.row" class="_panel">
			<MkCustomEmoji :name="emoji.name" :url="emoji.url" :normal="true"/>
			<div :class="$style.shortcode">
				<div>:{{ emoji.name }}:</div>
				<div v-if="emoji.aliases.length">{{ i18n.ts.tags }} · {{ emoji.aliases.join(', ') }}</div>
				<div v-if="emoji.license">{{ i18n.ts.license }} · {{ emoji.license }}</div>
			</div>
			<MkButton danger :disabled="saving" @click="deleteEmoji(emoji)">{{ i18n.ts.delete }}</MkButton>
		</li>
	</ul>
</div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, shallowRef } from 'vue';
import type { entities } from 'misskey-js';
import MkButton from '@/components/MkButton.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkCustomEmoji from '@/components/global/MkCustomEmoji.vue';
import { $i } from '@/i.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { fetchCustomEmojis } from '@/custom-emojis.js';
import * as os from '@/os.js';

const emojis = shallowRef<entities.EmojiDetailed[]>([]);
const loading = ref(true);
const loadFailed = ref(false);
const saving = ref(false);
const canCreate = computed(() => $i?.isStreamer && !loading.value && !loadFailed.value && !saving.value
	&& emojis.value.length < 20);

async function loadEmojis(): Promise<void> {
	loading.value = true;
	loadFailed.value = false;
	try {
		emojis.value = await misskeyApi('i/streamer-emojis/list', {});
	} catch {
		loadFailed.value = true;
	} finally {
		loading.value = false;
	}
}

async function createEmoji(): Promise<void> {
	if (!canCreate.value || !$i) return;

	const { dispose } = await os.popupAsyncWithDialog(import('../emoji-edit-dialog.vue').then(x => x.default), {
		streamerUsername: $i.username,
	}, {
		done: ({ created }) => {
			if (!created) return;
			emojis.value = [...emojis.value, created];
			void fetchCustomEmojis(true).catch(() => {});
		},
		closed: () => dispose(),
	});
}

async function deleteEmoji(emoji: entities.EmojiDetailed): Promise<void> {
	if (saving.value) return;
	const { canceled } = await os.confirm({
		type: 'warning',
		text: i18n.tsx.removeAreYouSure({ x: ':' + emoji.name + ':' }),
	});
	if (canceled || saving.value) return;

	saving.value = true;
	try {
		await os.apiWithDialog('i/streamer-emojis/delete', { id: emoji.id });
		emojis.value = emojis.value.filter(item => item.id !== emoji.id);
		void fetchCustomEmojis(true).catch(() => {});
	} catch {
		// apiWithDialog displays the server error.
	} finally {
		saving.value = false;
	}
}

onMounted(loadEmojis);

definePage(() => ({
	title: i18n.ts._profile.streamingCustomEmojis,
	icon: 'ti ti-mood-smile',
}));
</script>

<style lang="scss" module>
.list {
	padding: 0;
	list-style: none;
}

.row {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px;
}

.shortcode {
	flex: 1;
	overflow-wrap: anywhere;
}
</style>

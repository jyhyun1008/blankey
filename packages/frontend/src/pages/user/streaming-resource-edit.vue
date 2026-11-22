<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader>
	<div class="_spacer" style="--MI_SPACER-w: 880px;">
		<MkResult v-if="!isOwner || !fieldName || (resourceId && !existing)" type="notFound"/>
		<div v-else class="_gaps_m" :class="$style.panel">
			<XForm v-model="draft" :isVideo="isVideo" :user="$i!" :disabled="saving"/>
			<div :class="$style.actions">
				<MkButton primary rounded :disabled="saving" @click="save"><i class="ti ti-check"></i> {{ i18n.ts.save }}</MkButton>
				<MkButton rounded :disabled="saving" @click="close">{{ i18n.ts.cancel }}</MkButton>
				<MkButton v-if="existing" danger rounded :disabled="saving" :class="$style.delete" @click="remove"><i class="ti ti-trash"></i> {{ i18n.ts.delete }}</MkButton>
			</div>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import * as Misskey from 'misskey-js';
import XForm from './streaming-resource-form.vue';
import MkButton from '@/components/MkButton.vue';
import { $i } from '@/i.js';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { definePage } from '@/page.js';
import { useRouter } from '@/router.js';
import { getStreamingResources, streamingGoodsServicesFieldName, streamingVideoArchiveFieldName } from '@/utility/streaming-overview.js';
import { fromStreamingResourceDraft, saveStreamingResources, toStreamingResourceDraft } from '@/utility/streaming-resource-draft.js';

// 動画 / グッズ・サービスを 1 件ずつ追加・編集するページ (resourceId があれば編集)
const props = defineProps<{
	acct: string;
	section: string;
	resourceId?: string;
}>();

const router = useRouter();

const isVideo = computed(() => props.section === 'video-archive');
const fieldName = computed(() => props.section === 'video-archive' ? streamingVideoArchiveFieldName : props.section === 'goods-services' ? streamingGoodsServicesFieldName : null);
const isOwner = computed(() => {
	if (!$i) return false;
	const { username, host } = Misskey.acct.parse(props.acct);
	return host == null && username.toLowerCase() === $i.username.toLowerCase();
});
const entries = computed(() => $i && fieldName.value ? getStreamingResources($i.fields, fieldName.value) : []);
const existing = computed(() => props.resourceId ? entries.value.find(entry => entry.id === props.resourceId) : undefined);
const draft = ref(toStreamingResourceDraft(existing.value));
const saving = ref(false);

function goDetail(resourceId: string, replace = false) {
	const args = { params: { acct: props.acct, section: props.section, resourceId } } as const;
	if (replace) router.replace('/@:acct/:section/:resourceId', args);
	else router.push('/@:acct/:section/:resourceId', args);
}

function goList(replace = false) {
	const args = { params: { acct: props.acct, page: props.section } } as const;
	if (replace) router.replace('/@:acct/:page?', args);
	else router.push('/@:acct/:page?', args);
}

function close() {
	if (existing.value) goDetail(existing.value.id);
	else goList();
}

async function save() {
	if (!$i || !fieldName.value || saving.value) return;
	const result = fromStreamingResourceDraft(draft.value, isVideo.value);
	if ('error' in result) {
		await os.alert({ type: 'error', ...result.error });
		return;
	}

	// 新しい項目は先頭に追加 (一覧の最初に出る)
	const next = existing.value
		? entries.value.map(entry => entry.id === result.entry.id ? result.entry : entry)
		: [result.entry, ...entries.value];

	saving.value = true;
	try {
		if (await saveStreamingResources(fieldName.value, next)) {
			goDetail(result.entry.id, true);
		}
	} finally {
		saving.value = false;
	}
}

async function remove() {
	if (!$i || !fieldName.value || !existing.value || saving.value) return;
	const { canceled } = await os.confirm({
		type: 'warning',
		text: i18n.tsx.removeAreYouSure({ x: existing.value.title }),
	});
	if (canceled) return;

	saving.value = true;
	try {
		const id = existing.value.id;
		if (await saveStreamingResources(fieldName.value, entries.value.filter(entry => entry.id !== id))) {
			goList(true);
		}
	} finally {
		saving.value = false;
	}
}

definePage(() => ({
	title: `${isVideo.value ? i18n.ts._profile.streamingVideoArchive : i18n.ts._profile.streamingGoodsServices} · ${props.resourceId ? i18n.ts.edit : i18n.ts.add}`,
	icon: props.resourceId ? 'ti ti-pencil' : 'ti ti-plus',
}));
</script>

<style lang="scss" module>
.panel {
	padding: clamp(16px, 4vw, 28px);
	border-radius: var(--MI-radius);
	background: var(--MI_THEME-panel);
	box-shadow: 0 0 0 1px var(--MI-c-border);
}

.actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	padding-top: 16px;
	border-top: 1px solid var(--MI-c-border);
}

.delete {
	margin-inline-start: auto;
}
</style>

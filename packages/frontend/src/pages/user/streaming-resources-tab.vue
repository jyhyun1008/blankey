<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_spacer _profileContent _gaps">
	<!-- 動画だけ、複数をまとめて編集できる (グッズ・サービスは各詳細ページで編集) -->
	<template v-if="isOwner && draft">
		<div v-for="(entry, index) in draft" :key="entry.id" class="_gaps_s" :class="$style.entry">
			<XForm v-model="draft[index]" :isVideo="isVideoArchive" :user="user" :disabled="saving"/>
			<div><MkButton danger :disabled="saving" @click="removeEntry(entry.id)"><i class="ti ti-trash"></i> {{ i18n.ts.remove }}</MkButton></div>
		</div>
		<div class="_buttons">
			<MkButton :disabled="saving" @click="draft.push(toStreamingResourceDraft())"><i class="ti ti-plus"></i> {{ i18n.ts.add }}</MkButton>
			<MkButton primary :disabled="saving" @click="save">{{ i18n.ts.save }}</MkButton>
			<MkButton :disabled="saving" @click="draft = null">{{ i18n.ts.cancel }}</MkButton>
		</div>
	</template>
	<template v-else>
		<div v-if="isOwner" class="_buttons">
			<MkButton primary rounded :disabled="saving" @click="router.push('/@:acct/:section/new', { params: { acct: getAcct(user), section } })"><i class="ti ti-plus"></i> {{ i18n.ts.add }}</MkButton>
			<MkButton v-if="isVideoArchive && entries.length" rounded :disabled="saving" @click="startBulkEditing"><i class="ti ti-list-details"></i> {{ i18n.ts.edit }}</MkButton>
		</div>
		<MkSelect v-model="selectedTag" :items="categoryItems" :disabled="categoryItems.length === 1">
			<template #label>{{ i18n.ts.category }}</template>
		</MkSelect>
		<XStreamingResources :entries="visibleEntries" :profile="user" :fieldName="fieldName" :class="{ [$style.archiveGrid]: isVideoArchive }"/>
	</template>
</div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import type * as Misskey from 'misskey-js';
import { acct as getAcct } from '@@/js/user.js';
import XStreamingResources from './streaming-resources.vue';
import XForm from './streaming-resource-form.vue';
import MkButton from '@/components/MkButton.vue';
import MkSelect from '@/components/MkSelect.vue';
import { $i } from '@/i.js';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { useRouter } from '@/router.js';
import { getStreamingResources, streamingVideoArchiveFieldName } from '@/utility/streaming-overview.js';
import type { StreamingResource, streamingResourceFieldNames } from '@/utility/streaming-overview.js';
import { fromStreamingResourceDraft, isEmptyStreamingResourceDraft, toStreamingResourceDraft } from '@/utility/streaming-resource-draft.js';
import type { StreamingResourceDraft } from '@/utility/streaming-resource-draft.js';

const props = defineProps<{
	user: Misskey.entities.UserDetailed;
	fieldName: typeof streamingResourceFieldNames[number];
	saving: boolean;
	saveEntries: (fieldName: typeof streamingResourceFieldNames[number], entries: StreamingResource[]) => Promise<boolean>;
}>();

const router = useRouter();
const isVideoArchive = computed(() => props.fieldName === streamingVideoArchiveFieldName);
const section = computed(() => isVideoArchive.value ? 'video-archive' : 'goods-services');
const isOwner = computed(() => props.user.host === null && $i?.id === props.user.id);
const entries = computed(() => getStreamingResources(props.user.fields, props.fieldName));
const draft = ref<StreamingResourceDraft[] | null>(null);
const selectedTag = ref('');
const categoryItems = computed(() => {
	const tags = [...new Set(entries.value.flatMap(entry => entry.tags ?? []))].sort((a, b) => a.localeCompare(b));
	return [{ value: '', label: i18n.ts.all }, ...tags.map(tag => ({ value: tag, label: `#${tag}` }))];
});
const visibleEntries = computed(() => selectedTag.value
	? entries.value.filter(entry => entry.tags?.includes(selectedTag.value))
	: entries.value);

watch(categoryItems, items => {
	if (!items.some(item => item.value === selectedTag.value)) selectedTag.value = '';
});

function removeEntry(id: string) {
	draft.value = draft.value?.filter(entry => entry.id !== id) ?? null;
}

function startBulkEditing() {
	draft.value = entries.value.map(entry => toStreamingResourceDraft(entry));
}

async function save() {
	if (!isOwner.value || !draft.value || props.saving) return;

	const next: StreamingResource[] = [];
	for (const item of draft.value) {
		if (isEmptyStreamingResourceDraft(item)) continue;
		const result = fromStreamingResourceDraft(item, isVideoArchive.value);
		if ('error' in result) return os.alert({ type: 'error', ...result.error });
		next.push(result.entry);
	}

	if (await props.saveEntries(props.fieldName, next)) draft.value = null;
}
</script>

<style lang="scss" module>
.entry {
	padding: 16px;
	border-radius: var(--MI-radius);
	box-shadow: 0 0 0 1px var(--MI-c-border);
}

.archiveGrid {
	--video-card-gap: 12px;
	--video-card-grid-margin: var(--MI-margin);
}
</style>

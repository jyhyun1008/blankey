<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps">
	<slot name="actions"></slot>
	<div :aria-busy="loadingCategories" class="_gaps_s">
		<MkSelect v-model="selectedTag" :items="categoryItems" :disabled="categoryItems.length === 1">
			<template #label>{{ i18n.ts.category }}</template>
		</MkSelect>
		<MkError v-if="categoryError" @retry="loadCategories"/>
	</div>
	<div v-show="!selectedTag">
		<slot></slot>
	</div>
	<div v-if="selectedTag" class="_gaps">
		<slot name="filtered" :items="visibleCategoryPosts"></slot>
		<MkButton v-if="visibleCategoryPosts.length < categoryPosts.length" rounded @click="visibleLimit += pageSize">{{ i18n.ts.loadMore }}</MkButton>
	</div>
</div>
</template>

<script lang="ts" setup generic="T extends { id: string }">
import { computed, onScopeDispose, ref, shallowRef, triggerRef, watch } from 'vue';
import MkButton from '@/components/MkButton.vue';
import MkSelect from '@/components/MkSelect.vue';
import { i18n } from '@/i18n.js';

const props = defineProps<{
	userId: string;
	pageSize: number;
	loadBatch: (userId: string, limit: number, untilId: string | undefined, signal: AbortSignal) => Promise<T[]>;
	getTags: (post: T) => string[];
}>();

const categoryBatchSize = 50;
const selectedTag = ref('');
const visibleLimit = ref(props.pageSize);
const postsByTag = shallowRef(new Map<string, T[]>());
const loadingCategories = ref(false);
const categoryError = ref(false);
let controller: AbortController | undefined;
let untilId: string | undefined;
let categoriesComplete = false;

const categoryItems = computed(() => [
	{ value: '', label: i18n.ts.all },
	...Array.from(postsByTag.value.keys()).sort((a, b) => a.localeCompare(b)).map(tag => ({ value: tag, label: `#${tag}` })),
]);
const categoryPosts = computed(() => [...(postsByTag.value.get(selectedTag.value) ?? [])]);
const visibleCategoryPosts = computed(() => categoryPosts.value.slice(0, visibleLimit.value));

watch(selectedTag, () => { visibleLimit.value = props.pageSize; });
watch(() => props.userId, () => {
	controller?.abort();
	selectedTag.value = '';
	postsByTag.value = new Map();
	loadingCategories.value = false;
	categoryError.value = false;
	untilId = undefined;
	categoriesComplete = false;
	void loadCategories();
}, { immediate: true });
onScopeDispose(() => controller?.abort());

async function loadCategories() {
	if (loadingCategories.value || categoriesComplete) return;

	controller = new AbortController();
	const { signal } = controller;
	const userId = props.userId;
	loadingCategories.value = true;
	categoryError.value = false;
	try {
		while (!signal.aborted && !categoriesComplete) {
			const pages = await props.loadBatch(userId, categoryBatchSize, untilId, signal);
			if (signal.aborted) return;
			const nextId = pages.at(-1)?.id;
			if (!nextId || nextId === untilId) {
				categoriesComplete = true;
				break;
			}
			for (const page of pages) {
				for (const tag of props.getTags(page)) {
					const taggedPages = postsByTag.value.get(tag);
					if (taggedPages) taggedPages.push(page);
					else postsByTag.value.set(tag, [page]);
				}
			}
			untilId = nextId;
			categoriesComplete = pages.length < categoryBatchSize;
			triggerRef(postsByTag);
		}
	} catch {
		if (!signal.aborted) categoryError.value = true;
	} finally {
		if (!signal.aborted) loadingCategories.value = false;
	}
}
</script>

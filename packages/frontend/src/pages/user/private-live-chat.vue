<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<section :class="$style.chat">
	<h4 :class="$style.title"><i class="ti ti-messages" aria-hidden="true"></i> {{ i18n.ts._profile.privateLiveChat }}</h4>
	<MkInfo v-if="!$i || allowed === false">{{ i18n.ts._profile.privateLiveDenied }}</MkInfo>
	<MkLoading v-else-if="allowed === null && !loadFailed"/>
	<MkError v-else-if="loadFailed" @retry="refresh"/>
	<template v-else>
		<div ref="scroll" :class="$style.scroll" role="log" :aria-label="i18n.ts._profile.privateLiveChat">
			<div v-if="!messages.length" :class="$style.empty">{{ i18n.ts._profile.privateLiveChatEmpty }}</div>
			<ul v-else :class="$style.messages">
				<li v-for="message in messages" :key="message.id">
					<strong>{{ message.name || '@' + message.username }}</strong>
					<span>{{ message.text }}</span>
				</li>
			</ul>
		</div>
		<form :class="$style.form" @submit.prevent="send">
			<MkInput v-model="draft" autocomplete="off" :placeholder="i18n.ts._profile.privateLiveChatInput" :ariaLabel="i18n.ts._profile.privateLiveChatInput"/>
			<MkButton type="submit" primary :disabled="sending || !draft.trim() || draft.length > 300">{{ i18n.ts.send }}</MkButton>
		</form>
		<div :class="$style.notice">{{ i18n.ts._profile.privateLiveChatVisibleOnStream }}</div>
		<div v-if="sendFailed" role="status" :class="$style.error">{{ i18n.ts._profile.privateLiveChatSendError }}</div>
	</template>
</section>
</template>

<script lang="ts" setup>
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef } from 'vue';
import type { Endpoints } from 'misskey-js';
import MkButton from '@/components/MkButton.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkInput from '@/components/MkInput.vue';
import { $i } from '@/i.js';
import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';

const props = defineProps<{ creatorId: string }>();
type ChatResult = Endpoints['i/private-live-chat']['res'];

const allowed = ref<boolean | null>(null);
const messages = shallowRef<ChatResult['messages']>([]);
const draft = ref('');
const sending = ref(false);
const sendFailed = ref(false);
const loadFailed = ref(false);
const scroll = useTemplateRef('scroll');
const controller = new AbortController();
let timer: number | undefined;
let requestId = 0;
let refreshing = false;

async function display(result: ChatResult) {
	const container = scroll.value;
	const atBottom = !container || container.scrollHeight - container.scrollTop - container.clientHeight < 32;
	allowed.value = result.allowed;
	messages.value = result.messages;
	loadFailed.value = false;
	if (!atBottom) return;
	await nextTick();
	if (scroll.value) scroll.value.scrollTop = scroll.value.scrollHeight;
}

async function refresh() {
	if (!$i || sending.value || refreshing) return;
	refreshing = true;
	const id = ++requestId;
	try {
		const result = await misskeyApi('i/private-live-chat', { creatorId: props.creatorId }, undefined, controller.signal);
		if (id === requestId && !controller.signal.aborted) await display(result);
	} catch {
		if (id === requestId && !controller.signal.aborted && allowed.value === null) loadFailed.value = true;
	} finally {
		refreshing = false;
	}
}

async function send() {
	const text = draft.value.trim();
	if (sending.value || !text || text.length > 300) return;
	sending.value = true;
	sendFailed.value = false;
	++requestId;
	try {
		const result = await misskeyApi('i/private-live-chat', { creatorId: props.creatorId, text }, undefined, controller.signal);
		if (controller.signal.aborted) return;
		if (result.sent && draft.value.trim() === text) draft.value = '';
		sendFailed.value = !result.sent;
		await display(result);
	} catch {
		if (!controller.signal.aborted) sendFailed.value = true;
	} finally {
		sending.value = false;
	}
}

onMounted(() => {
	if (!$i) return;
	void refresh();
	timer = window.setInterval(() => {
		if (!window.document.hidden) void refresh();
	}, 4000);
});

onBeforeUnmount(() => {
	window.clearInterval(timer);
	controller.abort();
});
</script>

<style lang="scss" module>
.chat {
	display: grid;
	gap: 8px;
	min-width: 0;
	padding: 12px;
	border: 1px solid var(--MI_THEME-divider);
	border-radius: var(--MI-radius);
	background: var(--MI_THEME-panel);
}

.title {
	margin: 0;
	font-size: 0.9em;
}

.scroll {
	min-height: 4rem;
	max-height: 13rem;
	overflow: auto;
	overflow-wrap: anywhere;
}

.messages {
	display: grid;
	gap: 8px;
	list-style: none;
	margin: 0;
	padding: 0;

	strong {
		margin-inline-end: 8px;
		color: var(--MI-c-accentInk);
	}
}

.empty,
.notice {
	opacity: 0.75;
}

.notice {
	font-size: 0.8em;
}

.form {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	align-items: start;
	gap: 8px;
}

.error {
	color: var(--MI_THEME-error);
	font-size: 0.8em;
}
</style>

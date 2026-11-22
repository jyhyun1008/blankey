<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps_m">
	<MkLoading v-if="loading"/>
	<MkError v-else-if="loadFailed" @retry="loadSettings"/>
	<MkInfo v-else-if="!settings">{{ i18n.ts._profile.privateLivePublishUnavailable }}</MkInfo>
	<template v-else>
		<MkInfo>{{ i18n.ts._profile.privateLivePublishHelp }}</MkInfo>
		<div class="_gaps_s">
			<MkInput :modelValue="settings.server" readonly :ariaLabel="i18n.ts._profile.privateLiveServer">
				<template #label>{{ i18n.ts._profile.privateLiveServer }}</template>
			</MkInput>
			<MkButton @click="copyToClipboard(settings.server)">{{ i18n.ts.copy }}</MkButton>
		</div>
		<div class="_gaps_s">
			<MkInput :modelValue="settings.streamKey" :type="showKey ? 'text' : 'password'" readonly autocomplete="off" :ariaLabel="i18n.ts._profile.privateLiveStreamKey">
				<template #label>{{ i18n.ts._profile.privateLiveStreamKey }}</template>
			</MkInput>
			<div class="_buttons">
				<MkButton @click="showKey = !showKey">{{ showKey ? i18n.ts.hide : i18n.ts.show }}</MkButton>
				<MkButton @click="copyToClipboard(settings.streamKey)">{{ i18n.ts.copy }}</MkButton>
			</div>
		</div>
	</template>
	<MkFolder v-if="chatOverlayUrl" :defaultOpen="true">
		<template #label>{{ i18n.ts._profile.privateLiveChatOverlay }}</template>
		<div class="_gaps_s">
			<MkInfo>{{ i18n.ts._profile.privateLiveChatOverlayHelp }}</MkInfo>
			<div class="_buttons">
				<MkButton @click="copyToClipboard(chatOverlayUrl)">{{ i18n.ts._profile.privateLiveChatOverlayCopy }}</MkButton>
				<MkButton :disabled="resettingChatOverlay" @click="resetChatOverlay">{{ i18n.ts._profile.privateLiveChatOverlayReset }}</MkButton>
			</div>
		</div>
	</MkFolder>
	<MkFolder :defaultOpen="true">
		<template #label>{{ i18n.ts._profile.coffeeOverlay }}</template>
		<div class="_gaps_s">
			<MkInfo>{{ i18n.ts._profile.coffeeOverlayHelp }}</MkInfo>
			<MkLoading v-if="overlayLoading"/>
			<MkError v-else-if="overlayFailed" @retry="loadOverlay"/>
			<MkInfo v-else-if="!overlayUrl">{{ i18n.ts._profile.coffeeOverlayUnavailable }}</MkInfo>
			<template v-else>
				<MkButton @click="copyToClipboard(overlayUrl)">{{ i18n.ts._profile.coffeeOverlayCopy }}</MkButton>
				<div class="_gaps_s">
					<div id="obs-test-label">{{ i18n.ts._profile.coffeeOverlayTestSend }}</div>
					<div class="_buttons" role="group" aria-labelledby="obs-test-label">
						<MkButton :disabled="testSending" @click="sendOverlayTest('donation')">{{ i18n.ts._profile.coffeeOverlayDonation }}</MkButton>
						<MkButton :disabled="testSending" @click="sendOverlayTest('membership')">{{ i18n.ts._profile.coffeeOverlayMembership }}</MkButton>
						<MkButton :disabled="testSending" @click="sendOverlayTest('recurring_donation')">{{ i18n.ts._profile.coffeeOverlayRecurring }}</MkButton>
					</div>
				</div>
			</template>
		</div>
	</MkFolder>
</div>
</template>

<script lang="ts" setup>
import { onMounted, ref, shallowRef } from 'vue';
import { lang } from '@@/js/config.js';
import MkButton from '@/components/MkButton.vue';
import MkFolder from '@/components/MkFolder.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkInput from '@/components/MkInput.vue';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import * as os from '@/os.js';
import { copyToClipboard } from '@/utility/copy-to-clipboard.js';
import { misskeyApi } from '@/utility/misskey-api.js';

const settings = shallowRef<{ server: string; streamKey: string } | null>(null);
const loading = ref(true);
const loadFailed = ref(false);
const showKey = ref(false);
const chatOverlayUrl = ref<string | null>(null);
const resettingChatOverlay = ref(false);
const overlayUrl = ref<string | null>(null);
const overlayLoading = ref(true);
const overlayFailed = ref(false);
const overlayLang = encodeURIComponent(lang.split('-')[0]);
const testSending = ref(false);

async function loadSettings(): Promise<void> {
	loading.value = true;
	loadFailed.value = false;
	try {
		const { server, streamKey, chatOverlayUrl: chatUrl } = await misskeyApi('i/private-live-publish-settings', {});
		settings.value = server && streamKey ? { server, streamKey } : null;
		chatOverlayUrl.value = chatUrl ? new URL(chatUrl, window.location.origin).href : null;
	} catch {
		loadFailed.value = true;
	} finally {
		loading.value = false;
	}
}

onMounted(loadSettings);

async function resetChatOverlay(): Promise<void> {
	if (resettingChatOverlay.value) return;
	resettingChatOverlay.value = true;
	try {
		const { canceled } = await os.confirm({ type: 'warning', text: i18n.ts._profile.privateLiveChatOverlayResetConfirm });
		if (canceled) return;
		const { chatOverlayUrl: chatUrl } = await misskeyApi('i/private-live-publish-settings', { rotateChatOverlay: true });
		chatOverlayUrl.value = chatUrl ? new URL(chatUrl, window.location.origin).href : null;
	} catch {
		await os.alert({ type: 'error', text: i18n.ts.somethingHappened });
	} finally {
		resettingChatOverlay.value = false;
	}
}

async function loadOverlay(): Promise<void> {
	overlayLoading.value = true;
	overlayFailed.value = false;
	try {
		const { overlayUrl: url } = await misskeyApi('i/buy-me-a-coffee', {});
		if (!url) {
			overlayUrl.value = null;
			return;
		}
		const overlay = new URL(url);
		overlayUrl.value = `${window.location.origin}${overlay.pathname}?lang=${overlayLang}${overlay.hash}`;
	} catch {
		overlayFailed.value = true;
	} finally {
		overlayLoading.value = false;
	}
}

onMounted(loadOverlay);

async function sendOverlayTest(testOverlay: 'donation' | 'membership' | 'recurring_donation'): Promise<void> {
	if (testSending.value) return;
	testSending.value = true;
	try {
		const { verified } = await misskeyApi('i/buy-me-a-coffee', { testOverlay });
		if (verified) {
			os.toast(i18n.ts._profile.coffeeOverlayTestSent);
		} else {
			overlayUrl.value = null;
		}
	} catch {
		await os.alert({ type: 'error', text: i18n.ts.somethingHappened });
	} finally {
		testSending.value = false;
	}
}

definePage(() => ({
	title: i18n.ts._profile.privateLiveSettings,
	icon: 'ti ti-broadcast',
}));
</script>

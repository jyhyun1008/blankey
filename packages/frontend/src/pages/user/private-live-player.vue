<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps_s">
	<div ref="stage" :class="$style.stage" :aria-busy="status === 'loading'" @fullscreenchange="syncFullscreen">
		<video
			v-show="status === 'playing'"
			ref="video"
			:class="$style.video"
			:controls="prefer.s.useNativeUiForVideoAudioPlayer || nativeFullscreen"
			playsinline
			:aria-label="i18n.ts._profile.privateLive"
			@play="paused = false"
			@pause="paused = true"
			@ended="paused = true"
			@volumechange="syncVolume"
			@loadedmetadata="syncTimeline"
			@timeupdate="syncTimeline"
			@progress="syncTimeline"
			@webkitbeginfullscreen="nativeFullscreen = true"
			@webkitendfullscreen="nativeFullscreen = false"
		></video>
		<div v-if="status === 'playing' && !prefer.s.useNativeUiForVideoAudioPlayer && !nativeFullscreen" :class="$style.controls" role="group" :aria-label="i18n.ts._profile.privateLiveControls">
			<input
				v-if="seekEnd > seekStart"
				:class="$style.timeline"
				type="range"
				:min="seekStart"
				:max="seekEnd"
				:value="Math.min(seekEnd, Math.max(seekStart, position))"
				step="any"
				:aria-label="i18n.ts._profile.privateLivePosition"
				@input="seek"
			>
			<div :class="$style.toolbar">
				<button class="_button" :class="$style.control" :aria-label="playLabel" :title="playLabel" @click="togglePlayback">
					<i :class="paused ? 'ti ti-player-play' : 'ti ti-player-pause'" aria-hidden="true"></i>
				</button>
				<button class="_button" :class="$style.control" :aria-label="soundOff ? i18n.ts.unmute : i18n.ts.mute" :title="soundOff ? i18n.ts.unmute : i18n.ts.mute" @click="toggleMute">
					<i :class="soundOff ? 'ti ti-volume-off' : 'ti ti-volume'" aria-hidden="true"></i>
				</button>
				<input :class="$style.volume" type="range" min="0" max="1" step="0.05" :value="soundOff ? 0 : volume" :aria-label="i18n.ts.volume" @input="changeVolume">
				<button
					class="_button"
					:class="[$style.live, { [$style.atLive]: atLive }]"
					:disabled="seekEnd <= seekStart"
					:aria-label="atLive ? i18n.ts._profile.privateLiveNow : i18n.ts._profile.privateLiveJump"
					:title="atLive ? i18n.ts._profile.privateLiveNow : i18n.ts._profile.privateLiveJump"
					@click="jumpToLive"
				>
					<span :class="$style.liveDot" aria-hidden="true"></span>
					{{ i18n.ts._profile.privateLiveNow }}
				</button>
				<button v-if="fullscreenAvailable" class="_button" :class="[$style.control, $style.fullscreen]" :aria-label="fullscreenLabel" :title="fullscreenLabel" @click="toggleFullscreen">
					<i :class="fullscreen ? 'ti ti-minimize' : 'ti ti-maximize'" aria-hidden="true"></i>
				</button>
			</div>
		</div>
		<div v-if="status !== 'playing'" :class="$style.placeholder">
			<MkButton primary rounded :disabled="status === 'loading'" @click="play">
				<i :class="status === 'loading' ? 'ti ti-loader' : 'ti ti-player-play'" aria-hidden="true"></i>
				{{ status === 'loading' ? i18n.ts.loading : i18n.ts._profile.privateLiveWatch }}
			</MkButton>
		</div>
	</div>
	<MkInfo v-if="message" warn>{{ message }}</MkInfo>
	<XPrivateLiveChat v-if="showChat || status === 'playing'" :creatorId="creatorId"/>
	<MkButton v-else @click="showChat = true"><i class="ti ti-messages" aria-hidden="true"></i> {{ i18n.ts._profile.privateLiveChat }}</MkButton>
</div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, useTemplateRef } from 'vue';
import type Hls from 'hls.js';
import XPrivateLiveChat from './private-live-chat.vue';
import MkButton from '@/components/MkButton.vue';
import MkInfo from '@/components/MkInfo.vue';
import { $i } from '@/i.js';
import { i18n } from '@/i18n.js';
import { prefer } from '@/preferences.js';
import { misskeyApi } from '@/utility/misskey-api.js';

const props = defineProps<{ creatorId: string }>();

const video = useTemplateRef('video');
const stage = useTemplateRef('stage');
const status = ref<'idle' | 'loading' | 'playing' | 'denied' | 'unavailable' | 'error'>('idle');
const showChat = ref(false);
const paused = ref(true);
const muted = ref(false);
const volume = ref(1);
const position = ref(0);
const seekStart = ref(0);
const seekEnd = ref(0);
const livePosition = ref(0);
const fullscreen = ref(false);
const nativeFullscreen = ref(false);
const soundOff = computed(() => muted.value || volume.value === 0);
const atLive = computed(() => !paused.value && seekEnd.value > seekStart.value && livePosition.value - position.value <= 2);
const playLabel = computed(() => paused.value ? i18n.ts._profile.privateLivePlay : i18n.ts._profile.privateLivePause);
const fullscreenLabel = computed(() => fullscreen.value ? i18n.ts._profile.privateLiveExitFullscreen : i18n.ts._profile.privateLiveFullscreen);
const fullscreenAvailable = computed(() => window.document.fullscreenEnabled || (
	video.value != null && 'webkitEnterFullscreen' in video.value
));
const message = computed(() => {
	switch (status.value) {
		case 'denied': return i18n.ts._profile.privateLiveDenied;
		case 'unavailable': return i18n.ts._profile.privateLiveUnavailable;
		case 'error': return i18n.ts._profile.privateLiveError;
		default: return null;
	}
});
let player: Hls | undefined;
let sessionTimer: number | undefined;
let token: string;
let disposed = false;

function syncTimeline() {
	if (!video.value) return;
	const { currentTime, seekable } = video.value;
	position.value = currentTime;
	seekStart.value = seekable.length ? seekable.start(seekable.length - 1) : 0;
	seekEnd.value = seekable.length ? seekable.end(seekable.length - 1) : 0;
	const syncPosition = player?.liveSyncPosition;
	const target = syncPosition != null && Number.isFinite(syncPosition) ? syncPosition : seekEnd.value - 0.25;
	livePosition.value = Math.min(seekEnd.value, Math.max(seekStart.value, target));
}

function seek(event: Event) {
	if (video.value) video.value.currentTime = (event.currentTarget as HTMLInputElement).valueAsNumber;
}

function jumpToLive() {
	if (!video.value) return;
	syncTimeline();
	if (seekEnd.value <= seekStart.value) return;
	video.value.currentTime = livePosition.value;
	void video.value.play().catch(() => {});
}

function togglePlayback() {
	if (!video.value) return;
	if (video.value.paused) void video.value.play().catch(() => {});
	else video.value.pause();
}

function syncVolume() {
	if (!video.value) return;
	volume.value = video.value.volume;
	muted.value = video.value.muted;
}

function changeVolume(event: Event) {
	if (!video.value) return;
	video.value.volume = (event.currentTarget as HTMLInputElement).valueAsNumber;
	video.value.muted = false;
}

function toggleMute() {
	if (!video.value) return;
	const unmuting = soundOff.value;
	if (unmuting && video.value.volume === 0) video.value.volume = 0.5;
	video.value.muted = !unmuting;
}

function syncFullscreen() {
	fullscreen.value = window.document.fullscreenElement === stage.value;
}

function toggleFullscreen() {
	if (!stage.value || !video.value) return;
	if (fullscreen.value) {
		void window.document.exitFullscreen().catch(() => {});
	} else if (window.document.fullscreenEnabled) {
		void stage.value.requestFullscreen().catch(() => {});
	} else {
		(video.value as HTMLVideoElement & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen?.();
	}
}

function stop(nextStatus: typeof status.value) {
	window.clearInterval(sessionTimer);
	player?.destroy();
	player = undefined;
	if (stage.value && window.document.fullscreenElement === stage.value) void window.document.exitFullscreen().catch(() => {});
	paused.value = true;
	seekStart.value = seekEnd.value = 0;
	status.value = nextStatus;
}

async function refreshSession() {
	try {
		const session = await misskeyApi('i/private-live', { creatorId: props.creatorId });
		if (disposed || !player) return;
		if (session.token) token = session.token;
		else stop('denied');
	} catch {
		if (!disposed) stop('error');
	}
}

async function play() {
	if (!$i) {
		status.value = 'denied';
		return;
	}
	status.value = 'loading';
	try {
		const session = await misskeyApi('i/private-live', { creatorId: props.creatorId });
		if (disposed) return;
		if (!session.enabled || !session.token) {
			status.value = session.enabled ? 'denied' : 'unavailable';
			return;
		}
		const { default: HlsPlayer } = await import('hls.js');
		if (disposed || !video.value) return;
		if (!HlsPlayer.isSupported()) {
			status.value = 'error';
			return;
		}

		token = session.token;
		const mediaPath = `/private-live/${props.creatorId}/`;
		player = new HlsPlayer({
			lowLatencyMode: false,
			xhrSetup: (xhr, url) => {
				const media = new URL(url, window.location.href);
				if (media.origin !== window.location.origin || !media.pathname.startsWith(mediaPath)) {
					throw new Error('Invalid private live media URL.');
				}
				xhr.open('GET', media.href, true);
				xhr.setRequestHeader('Authorization', `Bearer ${token}`);
			},
		});
		player.on(HlsPlayer.Events.MANIFEST_PARSED, () => {
			status.value = 'playing';
			void video.value?.play().catch(() => {});
		});
		player.on(HlsPlayer.Events.ERROR, (_, data) => {
			if (data.fatal) stop(data.response?.code === 403 ? 'denied' : 'error');
		});
		player.on(HlsPlayer.Events.LEVEL_UPDATED, syncTimeline);
		player.attachMedia(video.value);
		player.loadSource(mediaPath + 'index.m3u8');
		sessionTimer = window.setInterval(() => void refreshSession(), 120_000);
	} catch {
		if (!disposed) stop('error');
	}
}

onBeforeUnmount(() => {
	disposed = true;
	stop('idle');
});
</script>

<style lang="scss" module>
.stage {
	overflow: hidden;
	border: 1px solid var(--MI_THEME-divider);
	border-radius: var(--MI-radius);
	background: var(--MI-c-inset);
}

.placeholder {
	display: grid;
	place-items: center;
	min-height: clamp(9rem, 24vw, 13rem);
	padding: 16px;
	background: linear-gradient(155deg, var(--MI_THEME-accentedBg), var(--MI-c-inset) 75%);
}

.video {
	display: block;
	box-sizing: border-box;
	width: 100%;
	aspect-ratio: 16 / 9;
	object-fit: contain;
	background: var(--MI-c-inset);
}

.controls {
	background: var(--MI_THEME-panel);
	padding: 4px 8px;
}

.toolbar {
	display: flex;
	align-items: center;
	gap: 4px;
}

.control,
.live {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	height: 36px;
	min-width: 36px;
	border-radius: var(--MI-radius);

	&:hover:not(:disabled) {
		background: var(--MI_THEME-accentedBg);
		color: var(--MI-c-accentInk);
	}
}

.timeline,
.volume {
	accent-color: var(--MI_THEME-accent);
	margin: 0;
	min-width: 0;
}

.timeline {
	display: block;
	width: 100%;
}

.volume {
	width: clamp(2rem, 16%, 4rem);
}

.live {
	color: var(--MI_THEME-fg);
	font-size: 0.8em;
	white-space: nowrap;
	gap: 4px;
	padding: 0 8px;
}

.liveDot {
	width: 7px;
	height: 7px;
	border-radius: 50%;
	background: currentColor;
	opacity: 0.45;
}

.atLive .liveDot {
	background: var(--MI_THEME-error);
	opacity: 1;
}

.fullscreen {
	margin-left: auto;
}

.stage:fullscreen {
	display: flex;
	flex-direction: column;
	border: 0;
	border-radius: 0;
	background: var(--MI-c-inset);

	> .video {
		flex: 1;
		min-height: 0;
	}
}
</style>

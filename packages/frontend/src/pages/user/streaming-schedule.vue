<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<section :class="$style.section" class="_panel _gaps_s">
	<header :class="$style.header">
		<h3><i class="ti ti-calendar" aria-hidden="true"></i> {{ i18n.ts._profile.streamingSchedule }}</h3>
		<MkButton v-if="isOwnProfile && !scheduleDraft" small @click="editSchedule">{{ i18n.ts.edit }}</MkButton>
	</header>
	<form v-if="isOwnProfile && scheduleDraft" class="_gaps_s" @submit.prevent="saveSchedule">
		<div :class="$style.scheduleEditor">
			<fieldset v-for="(day, index) in weekdays" :key="day" :class="[$style.scheduleDay, { [$style.dayOff]: scheduleDraft[index].off }]" class="_gaps_s">
				<legend>{{ day }}</legend>
				<label :class="$style.dayOffToggle">
					<input v-model="scheduleDraft[index].off" type="checkbox" :disabled="savingSchedule">
					{{ i18n.ts._profile.streamingScheduleOff }}
				</label>
				<MkInput v-model="scheduleDraft[index].time" type="time" :ariaLabel="`${day} · ${i18n.ts._profile.streamingScheduleTime}`" :autofocus="index === 0 && !scheduleDraft[index].off" :disabled="savingSchedule || scheduleDraft[index].off">
					<template #label>{{ i18n.ts._profile.streamingScheduleTime }}</template>
				</MkInput>
				<MkInput v-model="scheduleDraft[index].content" :ariaLabel="`${day} · ${i18n.ts._profile.streamingScheduleContent}`" :disabled="savingSchedule || scheduleDraft[index].off">
					<template #label>{{ i18n.ts._profile.streamingScheduleContent }}</template>
					<template v-if="isScheduleEntryTooLong(serializedDraft[index])" #caption>{{ i18n.ts.tooLong }}</template>
				</MkInput>
			</fieldset>
		</div>
		<div :class="$style.actions">
			<MkButton primary type="submit" :disabled="savingSchedule || serializedDraft.some(isScheduleEntryTooLong)">{{ i18n.ts.save }}</MkButton>
			<MkButton type="button" :disabled="savingSchedule" @click="scheduleDraft = undefined">{{ i18n.ts.cancel }}</MkButton>
		</div>
	</form>
	<ul v-else :class="$style.schedule">
		<li v-for="(day, index) in weekdays" :key="index" :class="[$style.placeholder, { [$style.dayOff]: schedule[index].off }]">
			<span>{{ day }}</span>
			<div v-if="schedule[index].off" :class="$style.scheduleEntry">{{ i18n.ts._profile.streamingScheduleOff }}</div>
			<div v-else-if="schedule[index].time || schedule[index].content" :class="$style.scheduleEntry">
				<time v-if="schedule[index].time" :datetime="schedule[index].time">{{ schedule[index].time }}</time>
				<div v-if="schedule[index].content">{{ schedule[index].content }}</div>
			</div>
		</li>
	</ul>
</section>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import type * as Misskey from 'misskey-js';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import { updateCurrentAccount } from '@/accounts.js';
import { $i } from '@/i.js';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';

const props = defineProps<{
	user: Misskey.entities.UserDetailed;
}>();

const weekdays = computed(() => [
	i18n.ts._weekday.monday,
	i18n.ts._weekday.tuesday,
	i18n.ts._weekday.wednesday,
	i18n.ts._weekday.thursday,
	i18n.ts._weekday.friday,
	i18n.ts._weekday.saturday,
	i18n.ts._weekday.sunday,
]);

type ScheduleEntry = { time: string; content: string; off: boolean };

const isOwnProfile = computed(() => props.user.host == null && $i?.id === props.user.id);
const savedSchedule = computed(() => (isOwnProfile.value ? $i?.streamingSchedule : undefined) ?? props.user.streamingSchedule ?? []);
const schedule = computed(() => weekdays.value.map((_, index) => parseScheduleEntry(savedSchedule.value[index] ?? '')));
const scheduleDraft = ref<ScheduleEntry[]>();
const serializedDraft = computed(() => scheduleDraft.value?.map(serializeScheduleEntry) ?? []);
const savingSchedule = ref(false);

function readScheduleEntry(entry: string): ScheduleEntry | undefined {
	if (!entry.startsWith('[')) return undefined;
	try {
		const value: unknown = JSON.parse(entry);
		if (!Array.isArray(value) || value[0] !== 'schedule') return undefined;
		if (value.length === 2 && value[1] === 'off') return { time: '', content: '', off: true };
		if (value.length === 3 && typeof value[1] === 'string' && typeof value[2] === 'string') {
			return { time: value[1], content: value[2], off: false };
		}
	} catch {
		// Treat legacy free-form entries as content.
	}
	return undefined;
}

function parseScheduleEntry(entry: string) {
	return readScheduleEntry(entry) ?? { time: '', content: entry, off: false };
}

function serializeScheduleEntry({ time, content, off }: ScheduleEntry) {
	if (off) return JSON.stringify(['schedule', 'off']);
	const text = content.trim();
	return time || readScheduleEntry(text) ? JSON.stringify(['schedule', time, text]) : text;
}

function isScheduleEntryTooLong(entry: string) {
	return Array.from(entry).length > 120;
}

function editSchedule() {
	scheduleDraft.value = schedule.value.map(entry => ({ ...entry }));
}

async function saveSchedule() {
	if (!isOwnProfile.value || !scheduleDraft.value || savingSchedule.value) return;
	const entries = serializedDraft.value;
	if (entries.some(isScheduleEntryTooLong)) return;

	savingSchedule.value = true;
	try {
		const account = await os.apiWithDialog('i/update', { streamingSchedule: entries });
		updateCurrentAccount({ streamingSchedule: account.streamingSchedule });
		scheduleDraft.value = undefined;
	} catch {
		// Keep the draft for retry. apiWithDialog displays the error.
	} finally {
		savingSchedule.value = false;
	}
}
</script>

<style lang="scss" module>
.section {
	container-type: inline-size;
	min-width: 0;
	padding: clamp(14px, 2vw, 20px);
}

.header {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	justify-content: space-between;
	gap: 4px 12px;

	h3 {
		margin: 0;
		font-size: 1.05em;

		> i {
			color: var(--MI-c-accentInk);
		}
	}
}

.placeholder {
	background: var(--MI-c-sunken);
	border-radius: var(--MI-radius-md);
}

.actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.schedule {
	display: grid;
	grid-template-columns: repeat(7, minmax(0, 1fr));
	gap: 4px;
	margin: 0;
	padding: 0;
	list-style: none;

	> li {
		padding: 8px 2px;
		min-height: 42px;
		text-align: center;
		font-size: 0.8em;
		overflow-wrap: anywhere;
	}
}

@container (max-width: 519px) {
	.schedule:has(.scheduleEntry) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

.scheduleEntry {
	margin: 4px 0 0;
	white-space: pre-wrap;
}

.scheduleEditor {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(100%, 160px), 1fr));
	gap: 8px;
}
.scheduleDay {
	min-width: 0;
	margin: 0;
	padding: 8px;
	border: 1px solid var(--MI-c-border);
	border-radius: var(--MI-radius);
}
.dayOff {
	background: color-mix(in srgb, var(--MI_THEME-warn) 14%, var(--MI_THEME-panel));
}

.dayOffToggle {
	display: flex;
	align-items: center;
	gap: 8px;
}
</style>

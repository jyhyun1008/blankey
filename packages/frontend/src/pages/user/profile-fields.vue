<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="[$style.fields, { [$style.compact]: compact }]">
	<dl v-if="user.location" :class="$style.field">
		<dt :class="$style.name"><i class="ti ti-map-pin ti-fw"></i> {{ i18n.ts.location }}</dt>
		<dd :class="$style.value">{{ user.location }}</dd>
	</dl>
	<dl v-if="user.birthday" :class="$style.field">
		<dt :class="$style.name"><i class="ti ti-cake ti-fw"></i> {{ i18n.ts.birthday }}</dt>
		<dd :class="$style.value">{{ user.birthday.replace('-', '/').replace('-', '/') }} ({{ i18n.tsx.yearsOld({ age }) }})</dd>
	</dl>
	<dl :class="$style.field">
		<dt :class="$style.name"><i class="ti ti-calendar ti-fw"></i> {{ i18n.ts.registeredDate }}</dt>
		<dd :class="$style.value">{{ dateString(user.createdAt) }} (<MkTime :time="user.createdAt"/>)</dd>
	</dl>
</div>
<div v-if="profileFields.length > 0" :class="[$style.fields, { [$style.compact]: compact }]">
	<dl v-for="(field, i) in profileFields" :key="i" :class="$style.field">
		<dt :class="$style.name">
			<Mfm :text="field.name" :author="user" :plain="true" :colored="false" class="_selectable"/>
		</dt>
		<dd :class="$style.value">
			<Mfm :text="field.value" :author="user" :colored="false" class="_selectable"/>
			<i v-if="user.verifiedLinks.includes(field.value)" v-tooltip:dialog="i18n.ts.verifiedLink" class="ti ti-circle-check" :class="$style.verifiedLink"></i>
		</dd>
	</dl>
</div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import type * as Misskey from 'misskey-js';
import { dateString } from '@/filters/date.js';
import { i18n } from '@/i18n.js';

const props = defineProps<{
	user: Misskey.entities.UserDetailed;
	profileFields: Misskey.entities.UserDetailed['fields'];
	compact?: boolean;
}>();

function calcAge(birthdate: string): number {
	const date = new Date(birthdate);
	const now = new Date();

	let yearDiff = now.getFullYear() - date.getFullYear();
	const monthDiff = now.getMonth() - date.getMonth();
	const pastDate = now.getDate() < date.getDate();

	if (monthDiff < 0 || (monthDiff === 0 && pastDate)) {
		yearDiff--;
	}

	return yearDiff;
}

const age = computed(() => {
	return props.user.birthday ? calcAge(props.user.birthday) : NaN;
});
</script>

<style lang="scss" module>
.fields {
	padding: 24px;
	font-size: 0.9em;
	border-top: solid 0.5px var(--MI_THEME-divider);
}

.field {
	display: flex;
	align-items: center;
	margin: 0;

	&:not(:last-child) {
		margin-bottom: 8px;
	}
}

.name,
.value {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.name {
	width: 30%;
	font-weight: bold;
	text-align: center;
}

.value {
	width: 70%;
	margin: 0;
}

.compact {
	padding: 12px;

	&:first-child {
		border-top: 0;
	}

	.field {
		align-items: baseline;
		gap: 12px;
	}

	.name,
	.value {
		white-space: normal;
		overflow-wrap: anywhere;
		text-align: start;
	}
}

.verifiedLink {
	margin-inline-start: 4px;
	color: var(--MI_THEME-success);
}

@container (max-width: 500px) {
	.fields:not(.compact) {
		padding: 16px;
	}
}
</style>

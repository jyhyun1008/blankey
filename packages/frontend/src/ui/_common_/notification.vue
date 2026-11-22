<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<XNotification :notification="notification" class="notification _acrylic" :contentVisibilityAuto="false" :full="false"/>
</div>
</template>

<script lang="ts" setup>
import { } from 'vue';
import * as Misskey from 'misskey-js';
import XNotification from '@/components/MkNotification.vue';

defineProps<{
	notification: Misskey.entities.Notification;
}>();
</script>

<style lang="scss" module>
.root {
	box-shadow: var(--MI-shadow-pop);
	border-radius: var(--MI-radius-sm);
	overflow: clip;
	contain: content;
}
</style>

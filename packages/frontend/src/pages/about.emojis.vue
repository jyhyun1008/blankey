<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<XEmojiList :emojis="customEmojis" grouped>
	<template #header>
		<MkButton v-if="$i && ($i.isModerator || $i.policies.canManageCustomEmojis)" primary type="routerLink" to="/custom-emojis-manager">{{ i18n.ts.manageCustomEmojis }}</MkButton>
	</template>
</XEmojiList>
</template>

<script lang="ts" setup>
import XEmojiList from './emojis.list.vue';
import MkButton from '@/components/MkButton.vue';
import { customEmojis } from '@/custom-emojis.js';
import { i18n } from '@/i18n.js';
import { $i } from '@/i.js';
</script>

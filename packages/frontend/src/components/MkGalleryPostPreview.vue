<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkMediaPreviewCard
	:to="`/gallery/${post.id}`"
	:title="post.title"
	:createdAt="post.createdAt"
	:tags="tags"
	:user="post.user"
	:compact="compact"
	@pointerenter="hover = true"
	@pointerleave="hover = false"
>
	<template #thumbnail="{ imageClass }">
		<Transition>
			<MkImgWithBlurhash
				:class="imageClass"
				:transition="safe ? null : {
					duration: 500,
					leaveActiveClass: $style.transition_toggle_leaveActive,
					leaveToClass: $style.transition_toggle_leaveTo,
				}"
				:src="post.files?.[0]?.thumbnailUrl"
				:hash="post.files?.[0]?.blurhash"
				:forceBlurhash="!show"
			/>
		</Transition>
	</template>
</MkMediaPreviewCard>
</template>

<script lang="ts" setup>
import * as Misskey from 'misskey-js';
import { computed, ref } from 'vue';
import MkImgWithBlurhash from '@/components/MkImgWithBlurhash.vue';
import MkMediaPreviewCard from '@/components/MkMediaPreviewCard.vue';
import { prefer } from '@/preferences.js';
import { getGalleryPostHashtags } from '@/utility/post-hashtags.js';

const props = defineProps<{
	post: Misskey.entities.GalleryPost;
	compact?: boolean;
}>();
const tags = computed(() => getGalleryPostHashtags(props.post));

const hover = ref(false);
const safe = computed(() => prefer.s.nsfw === 'ignore' || prefer.s.nsfw === 'respect' && !props.post.isSensitive);
const show = computed(() => safe.value || hover.value);

</script>

<style lang="scss" module>
.transition_toggle_leaveActive {
	transition: opacity .5s;
	position: absolute;
	top: 0;
	left: 0;
}

.transition_toggle_leaveTo {
	opacity: 0;
}
</style>

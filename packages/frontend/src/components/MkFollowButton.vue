<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<button
	class="_button"
	:class="[$style.root, { [$style.wait]: wait, [$style.active]: isFollowing || hasPendingFollowRequestFromYou, [$style.full]: full, [$style.large]: large }]"
	:disabled="wait"
	@click="onClick"
>
	<template v-if="!wait">
		<template v-if="hasPendingFollowRequestFromYou && user.isLocked">
			<span v-if="full" :class="$style.text">{{ i18n.ts.followRequestPending }}</span><i class="ti ti-hourglass-empty"></i>
		</template>
		<template v-else-if="hasPendingFollowRequestFromYou && !user.isLocked">
			<!-- つまりリモートフォローの場合。 -->
			<span v-if="full" :class="$style.text">{{ i18n.ts.processing }}</span><MkLoading :em="true" :colored="false"/>
		</template>
		<template v-else-if="isFollowing">
			<span v-if="full" :class="$style.text">{{ i18n.ts.youFollowing }}</span><i class="ti ti-minus"></i>
		</template>
		<template v-else-if="!isFollowing && user.isLocked">
			<span v-if="full" :class="$style.text">{{ i18n.ts.followRequest }}</span><i class="ti ti-plus"></i>
		</template>
		<template v-else-if="!isFollowing && !user.isLocked">
			<span v-if="full" :class="$style.text">{{ i18n.ts.follow }}</span><i class="ti ti-plus"></i>
		</template>
	</template>
	<template v-else>
		<span v-if="full" :class="$style.text">{{ i18n.ts.processing }}</span><MkLoading :em="true" :colored="false"/>
	</template>
</button>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as Misskey from 'misskey-js';
import { host } from '@@/js/config.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { useStream } from '@/stream.js';
import { i18n } from '@/i18n.js';
import { claimAchievement } from '@/utility/achievements.js';
import { pleaseLogin } from '@/utility/please-login.js';
import { $i } from '@/i.js';
import { prefer } from '@/preferences.js';
import { haptic } from '@/utility/haptic.js';

const props = withDefaults(defineProps<{
	user: Misskey.entities.UserDetailed,
	full?: boolean,
	large?: boolean,
}>(), {
	full: false,
	large: false,
});

const emit = defineEmits<{
	(_: 'update:user', value: Misskey.entities.UserDetailed): void
}>();

const isFollowing = ref(props.user.isFollowing);
const hasPendingFollowRequestFromYou = ref(props.user.hasPendingFollowRequestFromYou);
const wait = ref(false);
const connection = useStream().useChannel('main');

if (props.user.isFollowing == null && $i) {
	misskeyApi('users/show', {
		userId: props.user.id,
	})
		.then(onFollowChange);
}

function onFollowChange(user: Misskey.entities.UserDetailed) {
	if (user.id === props.user.id) {
		isFollowing.value = user.isFollowing;
		hasPendingFollowRequestFromYou.value = user.hasPendingFollowRequestFromYou;
	}
}

async function onClick() {
	const isLoggedIn = await pleaseLogin({
		openOnRemote: {
			type: 'web',
			path: `/@${props.user.username}@${props.user.host ?? host}`,
		},
	});
	if (!isLoggedIn) return;

	wait.value = true;

	haptic();

	try {
		if (isFollowing.value) {
			const { canceled } = await os.confirm({
				type: 'warning',
				text: i18n.tsx.unfollowConfirm({ name: props.user.name || props.user.username }),
			});

			if (canceled) {
				wait.value = false;
				return;
			}

			await misskeyApi('following/delete', {
				userId: props.user.id,
			});
		} else if (hasPendingFollowRequestFromYou.value) {
			const { canceled } = await os.confirm({
				type: 'question',
				text: i18n.tsx.cancelFollowRequestConfirm({ name: props.user.name || props.user.username }),
				okText: i18n.ts.yes,
				cancelText: i18n.ts.no,
			});

			if (canceled) {
				wait.value = false;
				return;
			}

			await misskeyApi('following/requests/cancel', {
				userId: props.user.id,
			});
			hasPendingFollowRequestFromYou.value = false;
		} else {
			if (prefer.s.alwaysConfirmFollow) {
				const { canceled } = await os.confirm({
					type: 'question',
					text: i18n.tsx.followConfirm({ name: props.user.name || props.user.username }),
				});

				if (canceled) {
					wait.value = false;
					return;
				}
			}

			await misskeyApi('following/create', {
				userId: props.user.id,
				withReplies: prefer.s.defaultFollowWithReplies,
			});
			emit('update:user', {
				...props.user,
				withReplies: prefer.s.defaultFollowWithReplies,
			});
			hasPendingFollowRequestFromYou.value = true;

			if ($i == null) {
				wait.value = false;
				return;
			}

			claimAchievement('following1');

			if ($i.followingCount >= 10) {
				claimAchievement('following10');
			}
			if ($i.followingCount >= 50) {
				claimAchievement('following50');
			}
			if ($i.followingCount >= 100) {
				claimAchievement('following100');
			}
			if ($i.followingCount >= 300) {
				claimAchievement('following300');
			}
		}
	} catch (err) {
		console.error(err);
	} finally {
		wait.value = false;
	}
}

onMounted(() => {
	connection.on('follow', onFollowChange);
	connection.on('unfollow', onFollowChange);
});

onBeforeUnmount(() => {
	connection.dispose();
});
</script>

<style lang="scss" module>
.root {
	position: relative;
	display: inline-block;
	font-weight: bold;
	color: var(--MI-c-accentInk);
	background: var(--MI_THEME-panel);
	border: solid 1px color(from var(--MI_THEME-accent) srgb r g b / 0.5);
	padding: 0;
	height: var(--MI-controlHeightSm);
	font-size: 16px;
	border-radius: var(--MI-radius-full);
	transition:
		background var(--MI-duration-fast) var(--MI-ease),
		border-color var(--MI-duration-fast) var(--MI-ease),
		transform var(--MI-duration) var(--MI-easeSpring);

	&.full {
		padding: 0 10px 0 14px;
		font-size: 14px;
	}

	&.large {
		font-size: 16px;
		height: var(--MI-controlHeight);
		padding: 0 14px 0 18px;
	}

	&:not(.full) {
		width: var(--MI-controlHeightSm);
	}

	&:focus-visible {
		outline-offset: 2px;
	}

	&:not(:disabled):hover {
		background: var(--MI-c-accentSoft);
		border-color: var(--MI_THEME-accent);
	}

	&:not(:disabled):active {
		background: var(--MI-c-accentSoftHover);
		transform: scale(0.97);
	}

	&.active {
		color: var(--MI-c-fgOnAccent);
		background: var(--MI_THEME-accent);
		border-color: var(--MI_THEME-accent);

		&:not(:disabled):hover {
			background: var(--MI-c-accentHover);
			border-color: var(--MI-c-accentHover);
		}

		&:not(:disabled):active {
			background: var(--MI-c-accentPressed);
			border-color: var(--MI-c-accentPressed);
		}
	}

	&.wait {
		cursor: wait !important;
		opacity: 0.7;
	}
}

@media (prefers-reduced-motion: reduce) {
	.root:not(:disabled):active {
		transform: none;
	}
}

.text {
	margin-right: 6px;
}
</style>

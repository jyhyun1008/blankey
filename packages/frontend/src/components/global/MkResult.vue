<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<Transition :name="prefer.s.animation ? '_transition_zoom' : ''" appear>
	<div :class="[$style.root, { [$style.animated]: prefer.s.animation }]" class="_gaps">
		<img v-if="customImageUrl" :src="customImageUrl" alt="" draggable="false" :class="$style.img"/>
		<div v-else :class="[$style.figure, $style[type]]" aria-hidden="true">
			<span :class="$style.halo"></span>
			<svg v-for="n in 3" :key="n" :class="[$style.sparkle, $style[`sparkle${n}`]]" viewBox="0 0 24 24">
				<path d="M12 2C12.6 7.6 16.4 11.4 22 12C16.4 12.6 12.6 16.4 12 22C11.4 16.4 7.6 12.6 2 12C7.6 11.4 11.4 7.6 12 2Z"/>
			</svg>
			<svg v-if="type === 'empty'" :class="[$style.mascot, $style.floating]" viewBox="0 0 120 120">
				<path :class="$style.mascotBody" d="M30 98V58C30 41.4 43.4 28 60 28C76.6 28 90 41.4 90 58V98C86 98 85 92 80 92C75 92 74 98 70 98C66 98 65 92 60 92C55 92 54 98 50 98C46 98 45 92 40 92C35 92 34 98 30 98Z"/>
				<path :class="$style.mascotLine" d="M46 60Q50.5 65 55 60M65 60Q69.5 65 74 60"/>
				<path :class="$style.mascotLine" d="M55 71Q57.5 74 60 71Q62.5 74 65 71"/>
				<circle :class="$style.mascotCheek" cx="44" cy="69" r="4"/>
				<circle :class="$style.mascotCheek" cx="76" cy="69" r="4"/>
			</svg>
			<MkSystemIcon v-else :type="type === 'notFound' ? 'question' : 'error'" :class="[$style.icon, $style.floating]"/>
		</div>

		<div :class="$style.text">{{ props.text ?? (type === 'empty' ? i18n.ts.nothing : type === 'notFound' ? i18n.ts.notFound : type === 'error' ? i18n.ts.somethingHappened : null) }}</div>
		<slot></slot>
	</div>
</Transition>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { instance } from '@/instance.js';
import { i18n } from '@/i18n.js';
import { prefer } from '@/preferences.js';

const props = defineProps<{
	type: 'empty' | 'notFound' | 'error';
	text?: string;
}>();

const customImageUrl = computed(() =>
	props.type === 'empty' ? instance.infoImageUrl :
	props.type === 'notFound' ? instance.notFoundImageUrl :
	props.type === 'error' ? instance.serverErrorImageUrl :
	null,
);
</script>

<style lang="scss" module>
.root {
	position: relative;
	text-align: center;
	padding: 40px 24px;
}

.img {
	vertical-align: bottom;
	height: 128px;
	margin: auto auto 16px;
	border-radius: var(--MI-radius-lg);
}

.figure {
	position: relative;
	width: 136px;
	height: 120px;
	margin: 0 auto 4px;
	--resultTone: var(--MI_THEME-accent);
	color: var(--resultTone);

	&.error {
		--resultTone: var(--MI_THEME-error);
	}
}

.halo {
	position: absolute;
	inset: 8px 16px 0;
	border-radius: var(--MI-radius-full);
	background:
		radial-gradient(circle at 35% 30%, color(from var(--resultTone) srgb r g b / 0.3), transparent 62%),
		radial-gradient(circle at 70% 75%, color(from var(--resultTone) srgb r g b / 0.2), transparent 55%),
		color(from var(--resultTone) srgb r g b / 0.1);
}

.mascot {
	position: absolute;
	inset: 6px 18px 0;
	overflow: visible;
}

.mascotBody {
	fill: var(--MI_THEME-panel);
	stroke: currentColor;
	stroke-width: 3;
	stroke-linejoin: round;
}

.mascotLine {
	fill: none;
	stroke: currentColor;
	stroke-width: 3;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.mascotCheek {
	fill: color(from var(--MI_THEME-love) srgb r g b / 0.35);
}

.icon {
	position: absolute;
	top: 22px;
	left: 34px;
	width: 68px;
	height: 68px;
}

.sparkle {
	position: absolute;
	fill: currentColor;
	opacity: 0.7;
}

.sparkle1 {
	top: 6px;
	right: 10px;
	width: 16px;
	height: 16px;
}

.sparkle2 {
	top: 40px;
	left: 2px;
	width: 11px;
	height: 11px;
	opacity: 0.5;
}

.sparkle3 {
	bottom: 12px;
	right: 2px;
	width: 9px;
	height: 9px;
	opacity: 0.45;
}

.text {
	color: var(--MI-c-fgMuted);
}

.animated {
	.floating {
		animation: resultFloat 3.2s var(--MI-ease) infinite alternate;
	}

	.sparkle {
		animation: resultTwinkle 2.4s ease-in-out infinite;
	}

	.sparkle2 {
		animation-delay: 0.8s;
	}

	.sparkle3 {
		animation-delay: 1.6s;
	}
}

@keyframes resultFloat {
	from {
		transform: translateY(2px);
	}

	to {
		transform: translateY(-4px);
	}
}

@keyframes resultTwinkle {
	0%, 100% {
		transform: scale(0.6) rotate(0deg);
		opacity: 0.2;
	}

	50% {
		transform: scale(1) rotate(20deg);
		opacity: 0.8;
	}
}

@media (prefers-reduced-motion: reduce) {
	.animated {
		.floating,
		.sparkle {
			animation: none;
		}
	}
}
</style>

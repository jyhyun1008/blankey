<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<component
	:is="component"
	ref="el"
	class="_button"
	:class="[$style.root, { [$style.inline]: inline, [$style.primary]: primary, [$style.gradate]: gradate, [$style.danger]: danger, [$style.rounded]: rounded, [$style.full]: full, [$style.small]: small, [$style.large]: large, [$style.transparent]: transparent, [$style.asLike]: asLike, [$style.iconOnly]: iconOnly, [$style.wait]: wait, [$style.active]: active }]"
	v-bind="cProps"
	@click="emit('click', $event)"
	@mousedown="onMousedown"
>
	<div ref="ripples" :class="$style.ripples" :data-children-class="$style.ripple"></div>
	<div :class="$style.content">
		<slot></slot>
	</div>
</component>
</template>

<script lang="ts" setup>
import { nextTick, computed, onMounted, useTemplateRef } from 'vue';
import MkA from '@/components/global/MkA.vue';
import type { MkABehavior } from '@/components/global/MkA.vue';

const props = defineProps<{
	type?: 'button' | 'submit' | 'reset' | 'a' | 'routerLink';
	primary?: boolean;
	gradate?: boolean;
	rounded?: boolean;
	inline?: boolean;
	autofocus?: boolean;
	wait?: boolean;
	danger?: boolean;
	full?: boolean;
	small?: boolean;
	large?: boolean;
	transparent?: boolean;
	asLike?: boolean;
	iconOnly?: boolean;
	active?: boolean;

	// for type=button
	name?: string;
	value?: string;
	disabled?: boolean;

	// for type=a
	href?: string;
	target?: string;
	rel?: string;

	// for type=routerLink
	to?: string;
	linkBehavior?: MkABehavior;
}>();

const emit = defineEmits<{
	(ev: 'click', payload: PointerEvent): void;
}>();

const el = useTemplateRef('el');
const ripples = useTemplateRef('ripples');

const component = computed(() => {
	if (props.type === 'a') return 'a';
	if (props.type === 'routerLink') return MkA;
	return 'button';
});
const cProps = computed(() => {
	if (props.type === 'a') return { href: props.href ?? '#', target: props.target, rel: props.rel };
	if (props.type === 'routerLink') return { to: props.to!, behavior: props.linkBehavior };
	return {
		type: props.type ?? 'button',
		name: props.name,
		value: props.value,
		disabled: props.disabled || props.wait,
	};
});

onMounted(() => {
	if (props.autofocus) {
		nextTick(() => {
			el.value!.focus();
		});
	}
});

function distance(p: { x: number; y: number }, q: { x: number; y: number }): number {
	return Math.hypot(p.x - q.x, p.y - q.y);
}

function calcCircleScale(boxW: number, boxH: number, circleCenterX: number, circleCenterY: number): number {
	const origin = { x: circleCenterX, y: circleCenterY };
	const dist1 = distance({ x: 0, y: 0 }, origin);
	const dist2 = distance({ x: boxW, y: 0 }, origin);
	const dist3 = distance({ x: 0, y: boxH }, origin);
	const dist4 = distance({ x: boxW, y: boxH }, origin);
	return Math.max(dist1, dist2, dist3, dist4) * 2;
}

function onMousedown(evt: MouseEvent): void {
	const target = evt.target! as HTMLElement;
	const rect = target.getBoundingClientRect();

	const ripple = window.document.createElement('div');
	ripple.classList.add(ripples.value!.dataset.childrenClass!);
	ripple.style.top = (evt.clientY - rect.top - 1).toString() + 'px';
	ripple.style.left = (evt.clientX - rect.left - 1).toString() + 'px';

	ripples.value!.appendChild(ripple);

	const circleCenterX = evt.clientX - rect.left;
	const circleCenterY = evt.clientY - rect.top;

	const scale = calcCircleScale(target.clientWidth, target.clientHeight, circleCenterX, circleCenterY);

	ripple.animate({
		transform: ['scale(1)', `scale(${scale / 2})`],
	}, {
		duration: 500,
		easing: 'cubic-bezier(0,.5,0,1)',
		fill: 'forwards',
	});

	const removeRipple = () => ripple.remove();
	ripple.animate({
		opacity: [1, 0],
	}, {
		delay: 1000,
		duration: 1000,
		easing: 'ease',
		fill: 'forwards',
	}).finished.then(removeRipple, removeRipple);
}
</script>

<style lang="scss" module>
.root {
	position: relative;
	z-index: 1; // 他コンポーネントのbox-shadowに隠されないようにするため
	display: block;
	min-width: 100px;
	min-height: 36px;
	width: max-content;
	padding: 8px 16px;
	text-align: center;
	font-weight: normal;
	font-size: 95%;
	box-shadow: none;
	text-decoration: none;
	background: var(--MI_THEME-buttonBg);
	border-radius: var(--MI-radius-md);
	overflow: clip;
	box-sizing: border-box;
	transition:
		background var(--MI-duration-fast) var(--MI-ease),
		transform var(--MI-duration) var(--MI-easeSpring);

	&:hover {
		text-decoration: none;
	}

	&:not(:disabled):hover {
		background: var(--MI_THEME-buttonHoverBg);
	}

	&:not(:disabled):active {
		background: var(--MI_THEME-buttonHoverBg);
		transform: scale(0.97);
	}

	&.iconOnly {
		padding: 8px;
		min-width: 36px;
	}

	&.small {
		font-size: 90%;
		min-height: var(--MI-controlHeightSm);
		padding: 6px 12px;
		border-radius: var(--MI-radius-sm);
	}

	&.large {
		font-size: 100%;
		min-height: var(--MI-controlHeight);
		padding: 10px 20px;
	}

	&.full {
		width: 100%;
	}

	&.rounded {
		border-radius: var(--MI-radius-full);
	}

	&.primary {
		font-weight: bold;
		color: var(--MI-c-fgOnAccent) !important;
		background: var(--MI_THEME-accent);

		&:not(:disabled):hover {
			background: var(--MI-c-accentHover);
		}

		&:not(:disabled):active {
			background: var(--MI-c-accentPressed);
		}
	}

	&.asLike {
		color: var(--MI_THEME-love);
		background: color(from var(--MI_THEME-love) srgb r g b / 0.08);

		&:not(:disabled):hover {
			background: color(from var(--MI_THEME-love) srgb r g b / 0.14);
		}

		&:not(:disabled):active {
			background: color(from var(--MI_THEME-love) srgb r g b / 0.18);
		}

		&.primary {
			color: oklch(from var(--MI_THEME-love) clamp(0.25, (0.66 - l) * 1000, 1) 0 h) !important;
			background: var(--MI_THEME-love);

			&:not(:disabled):hover,
			&:not(:disabled):active {
				background: oklch(from var(--MI_THEME-love) calc(l + 0.04) c h);
			}
		}
	}

	&.transparent {
		background: transparent;
	}

	&.gradate {
		font-weight: bold;
		color: var(--MI-c-fgOnAccent) !important;
		background: linear-gradient(90deg, var(--MI_THEME-buttonGradateA), var(--MI_THEME-buttonGradateB));

		&:not(:disabled):hover {
			background: linear-gradient(90deg, oklch(from var(--MI_THEME-buttonGradateA) calc(l + 0.04) c h), oklch(from var(--MI_THEME-buttonGradateB) calc(l + 0.04) c h));
		}

		&:not(:disabled):active {
			background: linear-gradient(90deg, oklch(from var(--MI_THEME-buttonGradateA) calc(l - 0.05) c h), oklch(from var(--MI_THEME-buttonGradateB) calc(l - 0.05) c h));
		}
	}

	&.danger {
		font-weight: bold;
		color: var(--MI_THEME-error);

		&.primary {
			color: var(--MI-c-fgOnError) !important;
			background: var(--MI_THEME-error);

			&:not(:disabled):hover {
				background: oklch(from var(--MI_THEME-error) calc(l + 0.04) c h);
			}

			&:not(:disabled):active {
				background: oklch(from var(--MI_THEME-error) calc(l - 0.05) c h);
			}
		}
	}

	&.active {
		color: var(--MI-c-accentInk) !important;
		background: var(--MI-c-accentSoft);
	}

	&:disabled {
		opacity: 0.5;
	}

	&.wait {
		cursor: wait !important;
	}

	&:focus-visible {
		outline-offset: 2px;
	}

	&.inline {
		display: inline-block;
		width: auto;
		min-width: 100px;
	}

	&.primary > .ripples > .ripple,
	&.gradate > .ripples > .ripple {
		background: color(from var(--MI-c-fgOnAccent) srgb r g b / 0.25);
	}
}

@media (prefers-reduced-motion: reduce) {
	.root:not(:disabled):active {
		transform: none;
	}
}

.ripples {
	position: absolute;
	z-index: 0;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	border-radius: inherit;
	overflow: clip;
	pointer-events: none;
}

.ripple {
	position: absolute;
	width: 2px;
	height: 2px;
	border-radius: 100%;
	background: color(from currentColor srgb r g b / 0.12);
}

.content {
	position: relative;
	z-index: 1;
	pointer-events: none;
}
</style>

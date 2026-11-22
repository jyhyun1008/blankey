/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { StoryObj } from '@storybook/vue3';
import MkHashtagPills from './MkHashtagPills.vue';

export const Default = {
	render(args) {
		return {
			components: { MkHashtagPills },
			setup: () => ({ args }),
			template: '<MkHashtagPills v-bind="args"/>',
		};
	},
	args: {
		tags: ['일상', '그림', 'archive'],
	},
} satisfies StoryObj<typeof MkHashtagPills>;

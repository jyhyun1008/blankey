/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { StoryObj } from '@storybook/vue3';
import MkMediaPreviewCard from './MkMediaPreviewCard.vue';

export const Default = {
	render(args) {
		return {
			components: { MkMediaPreviewCard },
			setup: () => ({ args }),
			template: '<div style="width:260px"><MkMediaPreviewCard v-bind="args"/></div>',
		};
	},
	args: {
		to: 'https://example.com/video',
		title: 'Archived broadcast',
		tags: ['archive'],
		external: true,
	},
} satisfies StoryObj<typeof MkMediaPreviewCard>;

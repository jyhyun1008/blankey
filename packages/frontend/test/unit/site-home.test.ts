/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { cleanup, render } from '@testing-library/vue';
import { afterEach, assert, test, vi } from 'vitest';
import SiteHome from '@/pages/site-home.vue';
import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';

vi.mock('@/i.js', () => ({ $i: null }));
vi.mock('@/router.js', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/ui/_common_/common.js', () => ({
	openSigninDialog: vi.fn(),
	openSignupDialog: vi.fn(),
}));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: vi.fn() }));

afterEach(cleanup);

test.each([true, false])('shows home resources with primary sources available: %s', async hasPrimarySources => {
	const user = { id: 'creator', name: 'Creator', username: 'creator', host: null };
	vi.mocked(misskeyApi).mockImplementation(async endpoint => {
		switch (endpoint) {
			case 'notes': return [
				{ id: 'publicnote', user, visibility: 'public', cw: 'Content warning', text: 'Hidden body' },
				{ id: 'privatenote', user, visibility: 'followers', text: 'Private body' },
			];
			case 'gallery/posts': return [{ id: 'gallerypost', title: 'Gallery preview' }];
			case 'channels/featured': return hasPrimarySources ? [{ id: 'channel', name: 'Community', lastNotedAt: '2026-11-21T00:00:00Z' }] : [];
			case 'channels/search': return [{ id: 'channel', name: 'Community' }];
			case 'pinned-users':
			case 'users': return endpoint === 'pinned-users' && !hasPrimarySources ? [] : [{
				...user,
				isStreamer: true,
				fields: [
					{ name: 'streaming:video-archive', value: '[{"id":"video","title":"Past stream","url":"https://example.org/video"}]' },
					{ name: 'streaming:goods-services', value: '[{"id":"goods","title":"Shop","url":"https://example.org/shop"}]' },
				],
			}];
			default: throw new Error(`Unexpected endpoint ${endpoint}`);
		}
	});

	const home = render(SiteHome, {
		global: {
			stubs: {
				MkA: { props: ['to'], template: '<a :href="to"><slot/></a>' },
				MkAvatar: true,
				MkGalleryPostPreview: { props: ['post'], template: '<a :href="\'/gallery/\' + post.id">{{ post.title }}</a>' },
				MkTime: true,
				MkNotesTimeline: { props: ['paginator'], template: '<div data-testid="public-notes">{{ paginator.endpoint }}</div>' },
			},
		},
	});

	assert.exists(home.getByTestId('signin'));
	assert.exists(home.getByTestId('signup'));
	assert.equal(home.getAllByRole('link', { name: i18n.ts.timeline })[0].getAttribute('href'), '/timeline');
	// 最近の公開ノートはタイムラインと同じ MkNotesTimeline で表示する
	assert.equal(home.getByTestId('public-notes').textContent, 'notes');
	assert.equal((await home.findByRole('link', { name: /Community/ })).getAttribute('href'), '/channels/channel');
	assert.equal((await home.findByRole('link', { name: 'Gallery preview' })).getAttribute('href'), '/gallery/gallerypost');
	assert.equal((await home.findByRole('link', { name: 'Past stream' })).getAttribute('href'), '/@creator/video-archive/video');
	assert.equal((await home.findByRole('link', { name: 'Shop' })).getAttribute('href'), '/@creator/goods-services/goods');
	assert.isNull(home.queryByText('Hidden body'));
	assert.isNull(home.queryByText('Private body'));
});

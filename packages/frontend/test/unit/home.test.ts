/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { afterEach, assert, describe, test, vi } from 'vitest';
import { cleanup, render, within, type RenderResult } from '@testing-library/vue';
import * as Misskey from 'misskey-js';
import { directives } from '@/directives/index.js';
import { components } from '@/components/index.js';
import { i18n } from '@/i18n.js';
import XHome from '@/pages/user/home.vue';
import { getStreamingPlatformName } from '@/utility/streaming-platforms.js';
import 'intersection-observer';

const session = vi.hoisted(() => ({ userId: undefined as string | undefined }));

vi.mock('@/i.js', async importOriginal => ({
	...await importOriginal<typeof import('@/i.js')>(),
	get $i() { return session.userId ? { id: session.userId } : null; },
}));

describe('XHome', () => {
	const renderHome = (user: Partial<Misskey.entities.UserDetailed>): RenderResult => {
		return render(XHome, {
			props: { user: user as Misskey.entities.UserDetailed, disableNotes: true },
			global: { directives, components },
		});
	};

	afterEach(() => {
		cleanup();
		session.userId = undefined;
	});

	test.each([true, false])('hides the streaming schedule on a regular profile (owner: %s)', (isOwner) => {
		session.userId = isOwner ? 'blobcat' : 'visitor';
		const home = renderHome({
			id: 'blobcat',
			username: 'blobcat',
			host: null,
			isStreamer: false,
			isFollowing: false,
			roles: [],
			createdAt: '1970-01-01T00:00:00.000Z',
			fields: [],
			pinnedNotes: [],
			streamingSchedule: isOwner ? [] : ['20:00 Game stream'],
			avatarDecorations: [],
		});

		assert.isNull(home.queryByRole('heading', { name: i18n.ts._profile.streamingSchedule }));
		assert.isNull(home.queryByText('20:00 Game stream'));
		assert.exists(home.getByRole('heading', { name: i18n.ts.basicInfo }));
	});

	test('Should render the remote caution when user.host exists', async () => {
		const home = renderHome({
			id: 'blobcat',
			name: 'blobcat',
			host: 'example.com',
			uri: 'https://example.com/@user',
			url: 'https://example.com/@user/profile',
			roles: [],
			createdAt: '1970-01-01T00:00:00.000Z',
			fields: [],
			pinnedNotes: [],
			avatarUrl: 'https://example.com',
			avatarDecorations: [],
		});

		const anchor = home.container.querySelector<HTMLAnchorElement>('a[href^="https://example.com/"]');
		assert.exists(anchor, 'anchor to the remote exists');
		assert.strictEqual(anchor?.href, 'https://example.com/@user/profile');
	});

	test.each([false, true])('Shows streamer profile content only when streamer mode is enabled (%s)', (isStreamer) => {
		const home = renderHome({
			id: 'blobcat',
			username: 'blobcat',
			host: null,
			isStreamer,
			roles: [],
			createdAt: '1970-01-01T00:00:00.000Z',
			fields: [
				{ name: 'streaming:channel', value: 'https://chzzk.naver.com/example' },
				{ name: 'streaming:tags', value: JSON.stringify([{ tag: '팬아트', label: '팬아트 전용' }, { tag: 'blankey', label: '' }]) },
				{ name: 'streaming:support', value: 'https://ko-fi.com/example' },
				{ name: 'streaming:support', value: 'https://buymeacoffee.com/example' },
				{ name: 'streaming:banner', value: 'https://example.com/first.webp' },
				{ name: 'streaming:banner', value: JSON.stringify({ imageUrl: 'https://example.com/second.webp', link: 'https://example.com/banner-target' }) },
				{ name: 'streaming:banner', value: JSON.stringify({ imageUrl: 'https://example.com/third.webp', link: 'javascript:alert(1)' }) },
				{ name: 'streaming:banner', value: '{invalid' },
				{ name: 'streaming:banner', value: 'https://example.com/first.webp' },
				{ name: 'streaming:banner', value: 'data:image/png;base64,AA==' },
			],
			verifiedLinks: [],
			pinnedNotes: [],
			avatarUrl: 'https://example.com',
			avatarDecorations: [],
		});

		const badges = home.queryAllByLabelText(i18n.ts._profile.streamerAccount);
		assert.lengthOf(badges, isStreamer ? 2 : 0);

		const banners = home.queryByRole('list', { name: i18n.ts._profile.streamingBanners });
		assert.strictEqual(banners != null, isStreamer);
		assert.isNull(home.queryByText('streaming:banner'));
		if (banners) {
			const sources = Array.from(banners.querySelectorAll('img'), image => new URL(image.src).searchParams.get('url'));
			assert.deepEqual(sources, ['https://example.com/first.webp', 'https://example.com/second.webp', 'https://example.com/third.webp']);
			const links = within(banners).getAllByRole('link');
			assert.lengthOf(links, 1);
			assert.strictEqual(links[0].getAttribute('href'), 'https://example.com/banner-target');
			assert.strictEqual(links[0].getAttribute('target'), '_blank');
		}

		const heading = home.queryByRole('heading', { name: i18n.ts._profile.streamingQuickLinks });
		assert.strictEqual(heading != null, isStreamer);
		const sidebar = home.queryByRole('complementary');
		assert.exists(sidebar);
		assert.isNull(home.queryByText('streaming:channel'));
		if (isStreamer && sidebar) {
			const emojiLink = within(sidebar).getByRole('link', { name: i18n.ts._profile.streamingOpenCustomEmojis });
			assert.strictEqual(emojiLink.getAttribute('href'), '/@blobcat/custom-emojis');
			const channel = within(sidebar).getByRole('link', { name: `CHZZK ${i18n.ts._profile.streamingChannel}` });
			assert.strictEqual(channel.getAttribute('href'), 'https://chzzk.naver.com/example');
			const support = within(sidebar).getByRole('link', { name: `Buy Me a Coffee ${i18n.ts._profile.streamingSupport}` });
			assert.strictEqual(support.getAttribute('href'), 'https://buymeacoffee.com/example');
			assert.isNull(home.queryByText('streaming:support'));
			assert.strictEqual(channel.getAttribute('target'), '_blank');
			assert.strictEqual(support.getAttribute('target'), '_blank');
			const tag = within(sidebar).getByRole('link', { name: '#팬아트 팬아트 전용' });
			assert.strictEqual(tag.getAttribute('href'), `/tags/${encodeURIComponent('팬아트')}`);
			assert.strictEqual(tag.querySelector('strong')?.textContent, '#팬아트');
			assert.strictEqual(tag.querySelector('small')?.textContent, '팬아트 전용');
			assert.strictEqual(tag.closest('ul'), support.closest('ul'));
			assert.strictEqual(tag.querySelector('strong')?.parentElement?.className, support.querySelector('strong')?.parentElement?.className);
			assert.exists(within(sidebar).getByRole('link', { name: `#blankey ${i18n.ts.hashtags}` }));
		}
	});

	test('The remote caution should fall back to uri if url is null', async () => {
		const home = renderHome({
			id: 'blobcat',
			name: 'blobcat',
			host: 'example.com',
			uri: 'https://example.com/@user',
			url: null,
			roles: [],
			createdAt: '1970-01-01T00:00:00.000Z',
			fields: [],
			pinnedNotes: [],
			avatarUrl: 'https://example.com',
			avatarDecorations: [],
		});

		const anchor = home.container.querySelector<HTMLAnchorElement>('a[href^="https://example.com/"]');
		assert.exists(anchor, 'anchor to the remote exists');
		assert.strictEqual(anchor?.href, 'https://example.com/@user');
	});
});

describe('Streaming platform names', () => {
	test.each([
		['channel', 'https://m.twitch.tv/example', 'Twitch'],
		['channel', 'https://www.youtube.com/@example', 'YouTube'],
		['channel', 'https://youtu.be/example', 'YouTube'],
		['channel', 'https://play.sooplive.com/example', 'SOOP'],
		['channel', 'https://play.sooplive.co.kr/example', 'SOOP'],
		['channel', 'https://bj.afreecatv.com/example', 'SOOP'],
		['channel', 'https://chzzk.naver.com/example', 'CHZZK'],
		['channel', 'https://ci.me/@example', 'CI.ME'],
		['support', 'https://buymeacoffee.com/example', 'Buy Me a Coffee'],
		['support', 'https://www.patreon.com/c/example', 'Patreon'],
		['support', 'https://ko-fi.com/example', undefined],
		['support', 'https://patreon.com.example.org/', undefined],
		['support', 'https://notpatreon.com/', undefined],
		['support', 'https://patreon.com@example.org/', undefined],
		['support', 'http://patreon.com/example', undefined],
		['channel', 'https://example.org/youtube.com', undefined],
	] as const)('identifies %s platform from %s', (kind, url, expected) => {
		assert.strictEqual(getStreamingPlatformName(new URL(url), kind), expected);
	});
});

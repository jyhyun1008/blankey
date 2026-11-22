/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { reactive } from 'vue';
import { afterEach, assert, test, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/vue';
import type * as Misskey from 'misskey-js';
import StreamerOverview from '@/pages/user/streamer-overview.vue';
import * as api from '@/utility/misskey-api.js';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { getStreamingTagLinks, isStreamingTag, parseStreamingChannelId, parseStreamingTags } from '@/utility/streaming-overview.js';

const { session } = vi.hoisted(() => ({
	session: { account: null as { id: string; streamingSchedule: string[] } | null },
}));

vi.mock('@/i.js', async importOriginal => ({
	...await importOriginal<typeof import('@/i.js')>(),
	get $i() { return session.account; },
}));

afterEach(() => {
	session.account = null;
	cleanup();
	vi.restoreAllMocks();
});

test('validates normalized hashtags and same-server community links', () => {
	const tags = parseStreamingTags('＃ＢＬＡＮＫＥＹ #팬아트 #blankey');
	assert.deepEqual(tags, ['blankey', '팬아트']);
	assert.isTrue(tags.every(isStreamingTag));
	assert.isFalse(isStreamingTag('tag%'));
	assert.isFalse(isStreamingTag('a'.repeat(129)));
	assert.strictEqual(parseStreamingChannelId('https://example.com/channels/abc1', 'https://example.com'), 'abc1');
	assert.isUndefined(parseStreamingChannelId('https://example.com.other.com/channels/abc1', 'https://example.com'));
});

test('reads legacy and labeled hashtags from the same profile field', () => {
	const field = (value: string) => [{ name: 'streaming:tags', value }];
	assert.deepEqual(getStreamingTagLinks(field('#updates fanart')), [
		{ tag: 'updates', label: '' },
		{ tag: 'fanart', label: '' },
	]);
	assert.deepEqual(getStreamingTagLinks(field(JSON.stringify([
		null,
		{ tag: '＃ＦＡＮＡＲＴ', label: ' 팬아트 전용 ' },
		{ tag: 'fanart', label: 'Duplicate' },
		{ tag: 'tag%' },
		{ tag: 'updates' },
	]))), [
		{ tag: 'fanart', label: '팬아트 전용' },
		{ tag: 'updates', label: '' },
	]);
	assert.deepEqual(getStreamingTagLinks(field('[invalid')), []);
});

test.each([false, true])('shows recent content and only public tagged notes (owned channel: %s)', async (owned) => {
	const publicNote = { id: 'public', visibility: 'public', localOnly: false, user: {} };
	const request = vi.spyOn(api, 'misskeyApi').mockImplementation((endpoint, data) => {
		const responses = {
			'users/pages': [{ id: 'page', title: 'Recent page' }],
			'users/gallery/posts': [
				{ id: 'video', title: 'Recent video', files: [{ type: 'video/mp4' }] },
				{ id: 'image', title: 'Recent image', files: [{ type: 'image/webp' }] },
			],
			'channels/show': { id: 'channel', name: 'Community channel', userId: owned ? 'streamer' : 'other' },
			'channels/timeline': [
				{ ...publicNote, id: 'public-community-note', channelId: 'channel' },
				{ ...publicNote, id: 'private-community-note', visibility: 'specified', channelId: 'channel' },
			],
			'notes/search-by-tag': (data as { tag?: string } | undefined)?.tag === 'fanart' ? [
				{ ...publicNote, id: 'fanart-note' },
			] : [
				{ ...publicNote, id: 'followers-note', visibility: 'followers' },
				{ ...publicNote, id: 'hidden-note', isHidden: true },
				{ ...publicNote, id: 'local-note', localOnly: true },
				{ ...publicNote, id: 'channel-note', channelId: 'another-channel' },
				{ ...publicNote, id: 'signin-note', user: { requireSigninToViewContents: true } },
				{ ...publicNote, id: 'federated-note', user: { host: 'example.org' } },
			],
		};
		return Promise.resolve(responses[endpoint as keyof typeof responses] as never);
	});

	const view = render(StreamerOverview, {
		props: {
			user: {
				id: 'streamer',
				username: 'streamer',
				host: null,
				isStreamer: true,
				fields: [
					{ name: 'streaming:tags', value: JSON.stringify([{ tag: 'updates', label: 'Announcements' }, { tag: 'fanart', label: 'Fan art' }]) },
					{ name: 'streaming:community', value: 'channel' },
					{ name: 'streaming:goods-services', value: JSON.stringify([{ title: 'Creator shop', url: 'https://example.com/shop' }]) },
					{
						name: 'streaming:video-archive',
						value: JSON.stringify([1, 2, 3, 4].map(n => ({ title: `Archived video ${n}`, url: `https://example.com/watch/${n}` }))),
					},
				],
				streamingSchedule: ['20:00 Game stream', JSON.stringify(['schedule', 'off']), '', '', '', '', ''],
			} as Misskey.entities.UserDetailed,
		},
		global: {
			stubs: {
				MkA: { props: ['to'], template: '<a :href="to"><slot/></a>' },
				MkLink: { props: ['url'], template: '<a :href="url"><slot/></a>' },
				MkLoading: true,
				MkNote: { props: ['note'], template: '<article>{{ note.id }}</article>' },
				MkPagePreview: { props: ['page'], template: '<article>{{ page.title }}</article>' },
				MkGalleryPostPreview: { props: ['post'], template: '<article>{{ post.title }}</article>' },
			},
		},
	});

	await view.findByText('Recent page');
	const archive = within(view.getByRole('heading', { name: i18n.ts._profile.streamingVideoArchive }).closest('section')!);
	assert.lengthOf(archive.getAllByText(/^Archived video /u), 3);
	assert.isNull(archive.queryByText('Archived video 4'));
	assert.strictEqual(archive.getByRole('link', { name: i18n.ts.showMore }).getAttribute('href'), '/@streamer/video-archive');
	assert.strictEqual(view.getByRole('link', { name: 'Creator shop' }).getAttribute('href'), '/@streamer/goods-services/legacy-0');
	assert.exists(view.getByText('20:00 Game stream'));
	assert.exists(view.getByText(i18n.ts._profile.streamingScheduleOff));
	assert.isNull(view.queryByRole('button', { name: i18n.ts.edit }));
	const image = await view.findByText('Recent image');
	assert.lengthOf(image.parentElement!.children, 6);
	await view.findByText('federated-note');
	for (const text of ['Recent video', 'followers-note', 'hidden-note', 'local-note', 'channel-note', 'signin-note']) {
		assert.isNull(view.queryByText(text));
	}
	if (owned) {
		await view.findByText('public-community-note');
		assert.isNull(view.queryByText('private-community-note'));
		assert.deepInclude(view.emitted().communityResolved, [{ id: 'channel', name: 'Community channel', userId: 'streamer' }]);
	} else {
		assert.isNull(view.queryByText('public-community-note'));
		assert.isFalse(request.mock.calls.some(([endpoint]) => endpoint === 'channels/timeline'));
	}
	assert.strictEqual(view.getByRole('link', { name: i18n.ts._profile.openStreamingTag }).getAttribute('href'), '/tags/updates');

	await fireEvent.click(view.getByRole('button', { name: '#fanart' }));
	await view.findByText('fanart-note');
	assert.isNull(view.queryByText('federated-note'));
	assert.isTrue(request.mock.calls.some(([endpoint, params]) => endpoint === 'notes/search-by-tag' && (params as { tag?: string } | undefined)?.tag === 'fanart'));
});

test('keeps the overview sections visible when there is no content or configuration', async () => {
	const request = vi.spyOn(api, 'misskeyApi').mockResolvedValue([] as never);
	const fields: Misskey.entities.UserDetailed['fields'] = [];
	const view = render(StreamerOverview, {
		props: {
			user: { id: 'streamer', username: 'streamer', host: null, isStreamer: true, fields } as Misskey.entities.UserDetailed,
		},
	});

	for (const title of [
		i18n.ts._profile.streamingContent,
		i18n.ts._profile.streamingSchedule,
		i18n.ts._profile.streamingVideoArchive,
		i18n.ts._profile.streamingGoodsServices,
		i18n.ts._profile.streamingRecentPages,
		i18n.ts._profile.streamingRecentGallery,
		i18n.ts._profile.streamingTaggedNotes,
		i18n.ts._profile.streamingCommunity,
	]) {
		assert.exists(view.getByRole('heading', { name: title }));
	}

	await waitFor(() => assert.lengthOf(view.getAllByText(i18n.ts.nothing), 4));
	for (const caption of view.getAllByText(i18n.ts.nothing)) {
		const tile = caption.parentElement!;
		assert.strictEqual(tile.parentElement?.children[1], tile);
	}
	const gallery = view.getByRole('heading', { name: i18n.ts._profile.streamingRecentGallery }).closest('section');
	assert.lengthOf(gallery!.lastElementChild!.children, 6);
	assert.lengthOf(view.getAllByText(i18n.ts.noNotes), 2);
	assert.lengthOf(view.queryAllByRole('link'), 0);
	assert.deepEqual(request.mock.calls.map(([endpoint]) => endpoint), ['users/pages', 'users/gallery/posts']);
});

test('loads only public content for the hashtags tab', async () => {
	const request = vi.spyOn(api, 'misskeyApi').mockResolvedValue([
		{ id: 'public-note', visibility: 'public', user: {} },
		{ id: 'private-note', visibility: 'specified', user: {} },
	] as never);
	const view = render(StreamerOverview, {
		props: {
			hashtagsOnly: true,
			user: {
				id: 'streamer',
				host: null,
				isStreamer: true,
				fields: [
					{ name: 'streaming:tags', value: 'fanart' },
					{ name: 'streaming:community', value: 'channel' },
				],
			} as Misskey.entities.UserDetailed,
		},
		global: {
			stubs: {
				MkA: { props: ['to'], template: '<a :href="to"><slot/></a>' },
				MkLoading: true,
				MkNote: { props: ['note'], template: '<article>{{ note.id }}</article>' },
			},
		},
	});

	await view.findByText('public-note');
	assert.isNull(view.queryByText('private-note'));
	assert.isNull(view.queryByRole('heading', { name: i18n.ts._profile.streamingContent }));
	assert.deepEqual(request.mock.calls.map(([endpoint]) => endpoint), ['notes/search-by-tag']);
});

test('edits and clears the schedule in the account home', async () => {
	const account = reactive({ id: 'streamer', streamingSchedule: ['20:00 Game stream', '', '', '', '', '', ''] });
	session.account = account;
	vi.spyOn(api, 'misskeyApi').mockResolvedValue([] as never);
	const save = vi.spyOn(os, 'apiWithDialog').mockImplementation(async (_endpoint, params) => ({
		streamingSchedule: (params as { streamingSchedule: string[] }).streamingSchedule,
	}) as never);
	const view = render(StreamerOverview, {
		props: {
			user: { id: account.id, host: null, isStreamer: true, fields: [], streamingSchedule: account.streamingSchedule } as unknown as Misskey.entities.UserDetailed,
		},
	});

	const edit = () => fireEvent.click(view.getByRole('button', { name: i18n.ts.edit }));
	const content = (day: string) => view.getByLabelText(`${day} · ${i18n.ts._profile.streamingScheduleContent}`);
	const time = (day: string) => view.getByLabelText(`${day} · ${i18n.ts._profile.streamingScheduleTime}`) as HTMLInputElement;
	const dayOff = (day: string) => within(view.getByRole('group', { name: day })).getByRole('checkbox', { name: i18n.ts._profile.streamingScheduleOff }) as HTMLInputElement;
	await edit();
	await fireEvent.update(content(i18n.ts._weekday.monday), 'Canceled edit');
	await fireEvent.click(dayOff(i18n.ts._weekday.monday));
	assert.isTrue(time(i18n.ts._weekday.monday).disabled);
	await fireEvent.click(dayOff(i18n.ts._weekday.monday));
	assert.strictEqual((content(i18n.ts._weekday.monday) as HTMLInputElement).value, 'Canceled edit');
	await fireEvent.click(view.getByRole('button', { name: i18n.ts.cancel }));
	assert.exists(view.getByText('20:00 Game stream'));
	assert.lengthOf(save.mock.calls, 0);

	await edit();
	await fireEvent.update(content(i18n.ts._weekday.monday), '');
	await fireEvent.update(time(i18n.ts._weekday.thursday), '19:30');
	await fireEvent.update(time(i18n.ts._weekday.friday), '21:00');
	await fireEvent.update(content(i18n.ts._weekday.friday), '  Chatting  ');
	await fireEvent.update(content(i18n.ts._weekday.saturday), '22:00');
	await fireEvent.update(time(i18n.ts._weekday.sunday), '23:00');
	await fireEvent.click(dayOff(i18n.ts._weekday.sunday));
	await fireEvent.click(view.getByRole('button', { name: i18n.ts.save }));

	await view.findByText('Chatting');
	assert.strictEqual(view.getByText('21:00').getAttribute('datetime'), '21:00');
	assert.exists(view.getByText('19:30'));
	assert.exists(view.getByText('22:00'));
	assert.exists(view.getByText(i18n.ts._profile.streamingScheduleOff));
	assert.isNull(view.queryByText('23:00'));
	assert.isNull(view.queryByText('20:00 Game stream'));
	assert.deepEqual(save.mock.calls, [['i/update', { streamingSchedule: ['', '', '', JSON.stringify(['schedule', '19:30', '']), JSON.stringify(['schedule', '21:00', 'Chatting']), '22:00', JSON.stringify(['schedule', 'off'])] }]]);

	await edit();
	assert.strictEqual(time(i18n.ts._weekday.friday).value, '21:00');
	assert.strictEqual((content(i18n.ts._weekday.friday) as HTMLInputElement).value, 'Chatting');
	assert.strictEqual(time(i18n.ts._weekday.saturday).value, '');
	assert.isTrue(dayOff(i18n.ts._weekday.sunday).checked);
	assert.isTrue(time(i18n.ts._weekday.sunday).disabled);
	assert.strictEqual((content(i18n.ts._weekday.saturday) as HTMLInputElement).value, '22:00');
});

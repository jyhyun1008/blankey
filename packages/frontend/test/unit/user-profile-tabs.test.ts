/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { afterEach, assert, test, vi } from 'vitest';
import { ref } from 'vue';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/vue';
import UserProfile from '@/pages/user/index.vue';
import ResourceDetail from '@/pages/user/streaming-resource.vue';
import ResourceEdit from '@/pages/user/streaming-resource-edit.vue';
import BlogDetail from '@/pages/page.vue';
import BlogIndex from '@/pages/pages.vue';
import GalleryDetail from '@/pages/gallery/post.vue';
import UserBlog from '@/pages/user/pages.vue';
import UserGallery from '@/pages/user/gallery.vue';
import { DI } from '@/di.js';
import { i18n } from '@/i18n.js';
import * as api from '@/utility/misskey-api.js';
import * as os from '@/os.js';
import { customEmojis } from '@/custom-emojis.js';
import { prefer } from '@/preferences.js';

const { session, updateCurrentAccount } = vi.hoisted(() => ({
	session: { account: null as { id: string; username?: string; fields: { name: string; value: string }[] } | null },
	updateCurrentAccount: vi.fn(),
}));

vi.mock('@/i.js', async importOriginal => ({
	...await importOriginal<typeof import('@/i.js')>(),
	get $i() { return session.account; },
}));

vi.mock('@/accounts.js', async importOriginal => ({
	...await importOriginal<typeof import('@/accounts.js')>(),
	updateCurrentAccount,
}));

afterEach(() => {
	cleanup();
	customEmojis.value = [];
	session.account = null;
	updateCurrentAccount.mockReset();
	vi.restoreAllMocks();
});

test('shows recent and popular posts together on the first blog tab', () => {
	const view = render(BlogIndex, {
		global: {
			provide: { [DI.router]: { push: vi.fn() } },
			stubs: {
				PageWithHeader: { template: '<main><slot/></main>' },
				MkFoldableSection: { template: '<section><h2><slot name="header"/></h2><slot/></section>' },
				MkPagination: { props: ['paginator'], template: '<p>{{ paginator.endpoint }}</p>' },
			},
		},
	});
	assert.deepEqual(view.getAllByRole('heading').map(heading => heading.textContent), [i18n.ts.recentPosts, i18n.ts.popularPosts]);
	assert.exists(view.getByText('pages/recent'));
	assert.exists(view.getByText('pages/featured'));
});

test('shows the requested profile tabs in order and lists the streamer videos and custom emojis', async () => {
	vi.spyOn(api, 'misskeyApi').mockImplementation(endpoint => Promise.resolve((endpoint === 'users/show' ? {
		id: 'streamer',
		username: 'streamer',
		host: null,
		isStreamer: true,
		fields: [{
			name: 'streaming:video-archive',
			value: JSON.stringify([
				{ title: 'First broadcast', url: 'https://example.com/video' },
				{ title: 'Second broadcast', url: 'https://example.com/video/2' },
				{ title: 'Third broadcast', url: 'https://example.com/video/3' },
				{ title: 'Fourth broadcast', url: 'https://example.com/video/4' },
				{ title: 'Invalid link', url: 'javascript:alert(1)' },
			]),
		}],
	} : []) as never));

	customEmojis.value = [
		{ name: 'hello_streamer', streamerId: 'streamer', isStreamerOwned: true, aliases: ['hello'], category: 'streamer', url: '/hello.png', license: 'CC0' },
		{ name: 'assigned_hello', streamerId: 'streamer', aliases: [], category: 'streamer', url: '/assigned.png' },
		{ name: 'other_hello', streamerId: 'other', isStreamerOwned: true, aliases: [], category: null, url: '/other.png' },
		{ name: 'sensitive_hello', streamerId: 'streamer', isStreamerOwned: true, aliases: [], category: null, url: '/sensitive.png', isSensitive: true },
	];

	const view = render(UserProfile, {
		props: { acct: 'streamer', page: 'video-archive' },
		global: {
			stubs: {
				PageWithHeader: {
					props: ['tab', 'tabs', 'swipable'],
					emits: ['update:tab'],
					template: '<nav :data-swipable="swipable"><button v-for="item in tabs" :key="item.key" :aria-pressed="item.key === tab" @click="$emit(\'update:tab\', item.key)">{{ item.title }}</button></nav><slot/>',
				},
				MkLoading: true,
				MkCustomEmoji: true,
				MkA: { props: ['to'], template: '<a :href="to"><slot/></a>' },
			},
		},
	});

	const video = await view.findByRole('link', { name: 'First broadcast' });
	assert.strictEqual(video.getAttribute('href'), '/@streamer/video-archive/legacy-0');
	assert.strictEqual(view.getByRole('link', { name: 'Fourth broadcast' }).getAttribute('href'), '/@streamer/video-archive/legacy-3');
	assert.lengthOf(view.getAllByRole('link'), 4);
	assert.isNull(view.queryByText('Invalid link'));
	assert.isNull(view.queryByRole('button', { name: i18n.ts.add }));
	assert.deepEqual(view.getAllByRole('button').map(button => button.textContent), [
		i18n.ts.home,
		i18n.ts.notes,
		i18n.ts._profile.streamingVideoArchive,
		i18n.ts._profile.profileBlog,
		i18n.ts.gallery,
		i18n.ts._profile.streamingGoodsServices,
		i18n.ts._profile.streamingCommunity,
		i18n.ts.hashtags,
		i18n.ts.customEmojis,
		i18n.ts.achievements,
		i18n.ts.activity,
		'Raw',
	]);
	const emojiTab = view.getByRole('button', { name: i18n.ts.customEmojis });
	await fireEvent.click(emojiTab);
	assert.strictEqual(emojiTab.getAttribute('aria-pressed'), 'true');
	// サーバーの絵文字一覧と同じカード (名前 + タグ、ライセンスは詳細ダイアログ)
	assert.exists(await view.findByText('hello_streamer'));
	assert.exists(view.getByText('hello'));
	assert.isNull(view.queryByText('assigned_hello'));
	assert.isNull(view.queryByText('other_hello'));
	assert.isNull(view.queryByText('sensitive_hello'));
	assert.isNull(view.queryByText('First broadcast'));

	customEmojis.value = [];
	await waitFor(() => assert.isNull(view.queryByText('hello_streamer')));

	await view.rerender({ page: 'files' });
	assert.strictEqual(view.getByRole('navigation').getAttribute('data-swipable'), 'false');
});

test.each([
	{ component: BlogDetail, props: { username: 'creator', pageName: 'story' }, activeTab: 'pages', endpoint: 'pages/show' },
	{ component: GalleryDetail, props: { postId: 'story' }, activeTab: 'gallery', endpoint: 'gallery/posts/show' },
])('shows the author profile tabs in $activeTab detail without a second title', async ({ component, props, activeTab, endpoint }) => {
	const author = { id: 'creator', username: 'creator', name: 'Creator nickname', avatarUrl: '/creator.png', host: null };
	vi.spyOn(api, 'misskeyApi').mockImplementation(name => {
		if (name === 'users/show') return Promise.resolve({ ...author, isStreamer: true } as never);
		// 詳細ページ下部の「ほかの記事 / 投稿」
		if (name === 'users/pages' || name === 'users/gallery/posts') return Promise.resolve([] as never);
		assert.strictEqual(name, endpoint);
		return Promise.resolve({
			id: 'story',
			name: 'story',
			title: 'A new story',
			user: author,
			content: [{ type: 'text', text: '#art' }],
			description: '#art `#example`',
			tags: ['ART', 'gallery'],
			createdAt: '2026-01-01T00:00:00Z',
			updatedAt: '2026-01-01T00:00:00Z',
			files: [{ id: 'image', type: 'image/png', properties: {} }],
		} as never);
	});
	const push = vi.fn();
	const view = render(component, {
		props,
		global: {
			provide: { [DI.router]: { push } },
			directives: { tooltip: () => {}, clickAnime: () => {} },
			stubs: {
				PageWithHeader: {
					props: ['tabs', 'tab', 'hideTitle', 'swipable', 'overridePageMetadata'],
					template: '<header v-if="!hideTitle && overridePageMetadata"><img :src="overridePageMetadata.avatar.avatarUrl" alt=""><span>{{ overridePageMetadata.userName.name }}</span><span>{{ overridePageMetadata.subtitle }}</span></header><nav><button v-for="item in tabs" :key="item.key" :aria-pressed="tab === item.key" @click="item.onClick">{{ item.title }}</button></nav><slot/>',
				},
				MkA: { props: ['to'], template: '<a :href="to"><slot/></a>' },
				MkAvatar: true,
				MkUserName: true,
				MkAcct: true,
				MkTime: true,
				MkLoading: true,
				MkError: true,
				Mfm: true,
				MkAd: true,
				MkPagination: true,
				MkContainer: true,
				MkMediaList: { props: ['mediaList'], template: '<div>{{ mediaList[0].id }}</div>' },
				MkMediaImage: { props: ['image'], template: '<div>{{ image.id }}</div>' },
				XPage: true,
			},
		},
	});

	await view.findByRole('heading', { name: 'A new story', level: 1 });
	assert.lengthOf(view.getAllByText('A new story'), 1);
	const tagList = view.getByRole('list', { name: i18n.ts.hashtags });
	assert.deepEqual(Array.from(tagList.children, tag => tag.textContent), // ギャラリーでは説明文中のタグ (#art) は本文でリンクになるので、チップには出さない
		activeTab === 'gallery' ? ['#gallery'] : ['#art']);
	const identity = view.getByText('Creator nickname').closest('header');
	assert.strictEqual(identity?.querySelector('img')?.getAttribute('src'), '/creator.png');
	assert.strictEqual(view.getByText('@creator').closest('header'), identity);
	const activeTitle = activeTab === 'pages' ? i18n.ts._profile.profileBlog : i18n.ts.gallery;
	assert.strictEqual(view.getByRole('button', { name: activeTitle }).getAttribute('aria-pressed'), 'true');
	if (activeTab === 'gallery') assert.exists(view.getByText('image'));
	await fireEvent.click(await view.findByRole('button', { name: i18n.ts._profile.streamingGoodsServices }));
	assert.deepEqual(push.mock.lastCall, ['/@:acct/:page?', { params: { acct: 'creator', page: 'goods-services' } }]);
	await fireEvent.click(view.getByRole('button', { name: i18n.ts.home }));
	assert.deepEqual(push.mock.lastCall, ['/@:acct/:page?', { params: { acct: 'creator', page: undefined } }]);
});

test.each([
	{ component: UserBlog, endpoint: 'users/pages' },
	{ component: UserGallery, endpoint: 'users/gallery/posts' },
])('filters $endpoint by hashtags, including categories from older posts', async ({ component, endpoint }) => {
	const user = { id: 'creator', host: null, username: 'creator' };
	const firstBatch = Array.from({ length: 50 }, (_, i) => ({
		id: `post-${i}`,
		title: `Post ${i}`,
		content: i === 0 ? [{ type: 'text', text: '#DEV' }] : [],
		tags: i === 0 ? ['DEV'] : [],
	}));
	const olderBatch = [
		{
			id: 'older',
			title: 'Older dev post',
			content: [{ type: 'section', children: [{ type: 'text', text: '**bold #dev ** #archive `#example`' }] }],
			description: '**bold #dev ** #archive `#example`',
		},
		{
			id: 'locked',
			title: 'Locked post',
			content: [{ type: 'text', text: '#secret' }],
			supportersOnlyLocked: true,
		},
	];
	const request = vi.spyOn(api, 'misskeyApi').mockImplementation((name, params) => {
		assert.strictEqual(name, endpoint);
		return Promise.resolve(((params as { untilId?: string }).untilId ? olderBatch : firstBatch) as never);
	});
	const view = render(component, {
		props: { user: user as never },
		global: {
			stubs: {
				MkPagination: { template: '<div>Unfiltered posts</div>' },
				MkLoading: true,
				MkError: true,
				MkPagePreview: { props: ['page'], template: '<article>{{ page.title }}</article>' },
				MkGalleryPostPreview: { props: ['post'], template: '<article>{{ post.title }}</article>' },
				MkSelect: {
					props: ['items', 'modelValue'],
					emits: ['update:modelValue'],
					template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in items" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
				},
			},
		},
	});

	assert.exists(view.getByText('Unfiltered posts'));
	assert.exists(view.getByRole('combobox'));
	assert.isNull(view.queryByRole('button', { name: i18n.ts.category }));
	await view.findByRole('option', { name: '#archive' });
	assert.lengthOf(view.getAllByRole('option', { name: '#dev' }), 1);
	assert.isNull(view.queryByRole('option', { name: '#secret' }));
	assert.isNull(view.queryByRole('option', { name: '#example' }));
	assert.strictEqual((request.mock.calls[1][1] as { untilId: string }).untilId, 'post-49');
	await fireEvent.update(view.getByRole('combobox'), 'dev');
	assert.deepEqual(view.getAllByRole('article').map(card => card.textContent), ['Post 0', 'Older dev post']);
	await fireEvent.update(view.getByRole('combobox'), 'archive');
	assert.deepEqual(view.getAllByRole('article').map(card => card.textContent), ['Older dev post']);
});

test.each([
	{ page: 'video-archive', fieldName: 'streaming:video-archive' },
])('lets the profile owner bulk-edit and filter $page categories', async ({ page, fieldName }) => {
	const metadata = { name: 'Website', value: 'https://example.com' };
	const legacyEntry = { title: 'Existing link', url: 'https://example.com/legacy' };
	const fields = [metadata, { name: fieldName, value: JSON.stringify([legacyEntry]) }];
	session.account = { id: 'owner', fields };
	vi.spyOn(api, 'misskeyApi').mockImplementation(endpoint => Promise.resolve((endpoint === 'users/show' ? {
		id: 'owner',
		username: 'owner',
		host: null,
		isStreamer: true,
		fields,
	} : []) as never));
	const save = vi.spyOn(os, 'apiWithDialog').mockImplementation(async (_, params) => ({
		fields: (params as { fields: typeof session.account.fields }).fields,
		verifiedLinks: [],
	}) as never);
	const view = render(UserProfile, {
		props: { acct: 'owner', page },
		global: {
			provide: { [DI.router]: { push: vi.fn(), replace: vi.fn() } },
			stubs: {
				PageWithHeader: { template: '<main><slot/></main>' },
				MkLoading: true,
				MkPagination: true,
				MkTextarea: {
					props: ['modelValue'],
					emits: ['update:modelValue'],
					template: '<label><slot name="label"/><textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></textarea></label>',
				},
				MkInput: {
					props: ['modelValue'],
					emits: ['update:modelValue'],
					template: '<label><slot name="label"/><input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></label>',
				},
				MkSelect: {
					props: ['items', 'modelValue'],
					emits: ['update:modelValue'],
					template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in items" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
				},
				MkA: { props: ['to'], template: '<a :href="to"><slot/></a>' },
			},
		},
	});

	// 動画はまとめて編集できる (編集 → 追加)
	await fireEvent.click(await view.findByRole('button', { name: i18n.ts.edit }));
	await fireEvent.click(await view.findByRole('button', { name: i18n.ts.add }));
	await fireEvent.update(view.getAllByLabelText(i18n.ts.title)[1], 'Creator link');
	await fireEvent.update(view.getAllByLabelText(page === 'video-archive' ? i18n.ts._profile.streamingResourceUrl : i18n.ts._profile.streamingSalesUrl)[1], 'https://example.com/link');
	await fireEvent.update(view.getAllByLabelText(`${i18n.ts.hashtags} (${i18n.ts.optional})`)[1], '#Archive #archive #새소식');
	await fireEvent.update(view.getAllByLabelText(page === 'video-archive' ? i18n.ts._profile.streamingResourceBody : i18n.ts._profile.streamingDescription)[1], 'Post body');
	const portfolio = [{ title: 'Sample', imageUrl: 'https://example.com/sample.png', url: 'https://example.com/sample' }];
	if (page === 'goods-services') {
		await fireEvent.click(view.getAllByRole('button', { name: i18n.ts._profile.streamingPortfolioAdd })[1]);
		await fireEvent.update(view.getAllByLabelText(i18n.ts.title)[2], portfolio[0].title);
		await fireEvent.update(view.getByLabelText(`${i18n.ts.imageUrl} (${i18n.ts.optional})`), portfolio[0].imageUrl);
		await fireEvent.update(view.getByLabelText(`${i18n.ts._profile.streamingResourceUrl} (${i18n.ts.optional})`), portfolio[0].url);
	}
	await fireEvent.click(view.getByRole('button', { name: i18n.ts.save }));
	const link = await view.findByRole('link', { name: 'Creator link' });
	assert.match(link.getAttribute('href')!, new RegExp(`^/@owner/${page}/[a-z0-9]+$`));
	assert.deepEqual(save.mock.calls[0], ['i/update', {
		fields: [metadata, {
			name: fieldName,
			value: JSON.stringify([{ id: 'legacy-0', ...legacyEntry }, { id: link.getAttribute('href')!.split('/').at(-1), title: 'Creator link', url: 'https://example.com/link', tags: ['archive', '새소식'], body: 'Post body', ...(page === 'goods-services' ? { portfolio } : {}) }]),
		}],
	}]);
	assert.include(view.getByRole('list', { name: i18n.ts.hashtags }).textContent, '#새소식');
	assert.exists(view.getByRole('link', { name: 'Existing link' }));
	assert.isNull(view.queryByRole('button', { name: i18n.ts.category }));
	await fireEvent.update(view.getByRole('combobox'), 'archive');
	assert.isNull(view.queryByRole('link', { name: 'Existing link' }));
	assert.exists(view.getByRole('link', { name: 'Creator link' }));

	for (const [page, path] of [['gallery', '/gallery/new'], ['pages', '/pages/new']]) {
		await view.rerender({ page });
		const add = await view.findByRole('link', { name: i18n.ts.add });
		assert.strictEqual(add.getAttribute('href'), path);
	}

	session.account = null;
	await view.rerender({ page: 'gallery' });
	assert.isNull(view.queryByRole('link', { name: i18n.ts.add }));
});

test('adds goods on a dedicated page and deletes them from the detail page', async () => {
	const fieldName = 'streaming:goods-services';
	const existing = { id: 'old', title: 'Old goods', url: 'https://shop.example/old' };
	const fields = [{ name: fieldName, value: JSON.stringify([existing]) }];
	session.account = { id: 'owner', username: 'owner', fields };
	const push = vi.fn();
	const replace = vi.fn();
	vi.spyOn(api, 'misskeyApi').mockImplementation(endpoint => Promise.resolve((endpoint === 'users/show'
		? { id: 'owner', username: 'owner', host: null, isStreamer: true, fields }
		: []) as never));
	const save = vi.spyOn(os, 'apiWithDialog').mockImplementation(async (_, params) => ({
		fields: (params as { fields: typeof fields }).fields,
		verifiedLinks: [],
	}) as never);
	vi.spyOn(os, 'confirm').mockResolvedValue({ canceled: false } as never);
	const global = {
		provide: { [DI.router]: { push, replace } },
		directives: { tooltip: () => {} },
		stubs: {
			PageWithHeader: { template: '<main><slot/></main>' },
			MkLoading: true,
			MkPagination: true,
			MkInput: {
				props: ['modelValue'],
				emits: ['update:modelValue'],
				template: '<label><slot name="label"/><input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></label>',
			},
			MkSelect: { props: ['items', 'modelValue'], template: '<select></select>' },
			MkA: { props: ['to'], template: '<a :href="to"><slot/></a>' },
		},
	};

	// プロフィールのタブ: 追加は専用ページへ。グッズにはまとめて編集がない
	const profile = render(UserProfile, { props: { acct: 'owner', page: 'goods-services' }, global });
	await fireEvent.click(await profile.findByRole('button', { name: i18n.ts.add }));
	assert.deepEqual(push.mock.lastCall, ['/@:acct/:section/new', { params: { acct: 'owner', section: 'goods-services' } }]);
	assert.isNull(profile.queryByRole('button', { name: i18n.ts.edit }));
	profile.unmount();

	// 追加ページ: 1 件だけ入力して保存すると、先頭に追加して詳細ページへ
	const editor = render(ResourceEdit, { props: { acct: 'owner', section: 'goods-services' }, global });
	await fireEvent.update(editor.getByLabelText(i18n.ts.title), 'New goods');
	await fireEvent.update(editor.getByLabelText(i18n.ts._profile.streamingSalesUrl), 'https://shop.example/new');
	await fireEvent.update(editor.getByLabelText(`${i18n.ts._profile.streamingPrice} (${i18n.ts.optional})`), '₩5,000');
	await fireEvent.click(editor.getByRole('button', { name: i18n.ts.save }));
	await waitFor(() => assert.lengthOf(save.mock.calls, 1));
	const saved = JSON.parse((save.mock.calls[0][1] as { fields: typeof fields }).fields[0].value);
	assert.deepEqual(saved.map((entry: { title: string }) => entry.title), ['New goods', 'Old goods']);
	assert.strictEqual(saved[0].price, '₩5,000');
	assert.deepEqual(replace.mock.lastCall, ['/@:acct/:section/:resourceId', { params: { acct: 'owner', section: 'goods-services', resourceId: saved[0].id } }]);
	editor.unmount();

	// 詳細ページ: 自分の項目は編集・削除できる
	const detail = render(ResourceDetail, { props: { acct: 'owner', section: 'goods-services', resourceId: 'old' }, global });
	await detail.findByRole('heading', { name: 'Old goods' });
	assert.strictEqual(detail.getByRole('link', { name: i18n.ts.edit }).getAttribute('href'), '/@owner/goods-services/old/edit');
	await fireEvent.click(detail.getByRole('button', { name: i18n.ts.delete }));
	await waitFor(() => assert.lengthOf(save.mock.calls, 2));
	assert.deepEqual((save.mock.calls[1][1] as { fields: typeof fields }).fields, []);
	assert.deepEqual(replace.mock.lastCall, ['/@:acct/:page?', { params: { acct: 'owner', page: 'goods-services' } }]);
});

test('shows channels created by the profile owner in the community tab', async () => {
	prefer.r.enableInfiniteScroll = ref(false);
	const request = vi.spyOn(api, 'misskeyApi').mockImplementation(endpoint => {
		if (endpoint === 'users/show') return Promise.resolve({ id: 'owner', username: 'owner', host: null, isStreamer: false } as never);
		return Promise.resolve([
			{ id: 'first', name: 'Announcements' },
			{ id: 'second', name: 'Fan art' },
		] as never);
	});

	const view = render(UserProfile, {
		props: { acct: 'owner', page: 'community' },
		global: {
			directives: { appear: () => {} },
			stubs: {
				PageWithHeader: { template: '<main><slot/></main>' },
				MkLoading: true,
				MkChannelPreview: { props: ['channel'], template: '<article>{{ channel.name }}</article>' },
			},
		},
	});

	await view.findByText('Announcements');
	assert.exists(view.getByText('Fan art'));
	assert.deepEqual(request.mock.calls.map(([endpoint]) => endpoint), ['users/show', 'channels/search']);
	assert.include(request.mock.calls[1][1], { userId: 'owner', query: '' });
});

test('renders the goods detail, sales link, and validated portfolio for a regular local profile', async () => {
	vi.spyOn(api, 'misskeyApi').mockResolvedValue({
		id: 'creator',
		username: 'creator',
		host: null,
		isStreamer: false,
		fields: [{
			name: 'streaming:goods-services',
			value: JSON.stringify([{
				id: 'commission',
				title: 'Commissions',
				url: 'https://example.com/order',
				body: 'Commission details',
				portfolio: [
					{ title: 'Example commission', url: 'https://example.com/work' },
					{ title: 'Unlinked card', url: 'javascript:alert(1)' },
				],
			}]),
		}],
	} as never);

	const view = render(ResourceDetail, {
		props: { acct: 'creator', section: 'goods-services', resourceId: 'commission' },
		global: {
			provide: { [DI.router]: { push: vi.fn() } },
			stubs: {
				PageWithHeader: { props: ['tabs'], template: '<nav>{{ tabs.map(tab => tab.key).join(" ") }}</nav><slot/>' },
				MkA: { props: ['to'], template: '<a :href="to"><slot/></a>' },
				MkLink: { props: ['url'], template: '<a :href="url"><slot/></a>' },
				Mfm: { props: ['text'], template: '<p>{{ text }}</p>' },
				MkLoading: true,
			},
		},
	});

	await view.findByRole('heading', { name: 'Commissions' });
	assert.exists(view.getByText('Commission details'));
	assert.strictEqual(view.getByRole('link', { name: i18n.ts._profile.streamingBuy }).getAttribute('href'), 'https://example.com/order');
	assert.exists(view.getByRole('heading', { name: i18n.ts._profile.streamingPortfolio }));
	assert.strictEqual(view.getByRole('link', { name: 'Example commission' }).getAttribute('href'), 'https://example.com/work');
	assert.exists(view.getByText('Unlinked card'));
	assert.isNull(view.queryByRole('link', { name: 'Unlinked card' }));
	assert.notInclude(view.getByRole('navigation').textContent, 'custom-emojis');
});

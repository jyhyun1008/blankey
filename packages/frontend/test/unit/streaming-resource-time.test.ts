/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { afterEach, assert, beforeEach, describe, test, vi } from 'vitest';
import { genId } from '@/utility/id.js';
import {
	getStreamingBumpAvailableAt,
	getStreamingResourceCreatedAt,
	getStreamingResourceSortTime,
	getStreamingResources,
	pickStreamingResources,
	sortStreamingResourcesByTime,
	streamingBumpCooldown,
	streamingGoodsServicesFieldName,
	streamingVideoArchiveFieldName,
} from '@/utility/streaming-overview.js';
import type { StreamingResource } from '@/utility/streaming-overview.js';

const NOW = Date.UTC(2026, 10, 22, 12, 0, 0);
const HOUR = 1000 * 60 * 60;

function idAt(time: number) {
	vi.setSystemTime(time);
	const id = genId();
	vi.setSystemTime(NOW);
	return id;
}

function entry(id: string, extra: Partial<StreamingResource> = {}): StreamingResource {
	return { id, title: id, url: 'https://example.com/', ...extra };
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
});

afterEach(() => {
	vi.useRealTimers();
});

describe('getStreamingResourceCreatedAt', () => {
	test('genId の ID から登録日時を求める', () => {
		const time = NOW - 3 * HOUR;
		assert.strictEqual(getStreamingResourceCreatedAt(entry(idAt(time))), time);
	});

	test('旧形式の ID は null', () => {
		assert.isNull(getStreamingResourceCreatedAt(entry('legacy-0')));
	});

	test('未来の日時は現在時刻に丸める', () => {
		assert.strictEqual(getStreamingResourceCreatedAt(entry(idAt(NOW + 100 * HOUR))), NOW);
	});
});

describe('getStreamingResourceSortTime', () => {
	test('再掲日時が新しければそれを使う', () => {
		const created = NOW - 48 * HOUR;
		assert.strictEqual(getStreamingResourceSortTime(entry(idAt(created), { bumpedAt: NOW - HOUR })), NOW - HOUR);
	});

	test('旧形式でも再掲していればその日時', () => {
		assert.strictEqual(getStreamingResourceSortTime(entry('legacy-0', { bumpedAt: NOW - HOUR })), NOW - HOUR);
	});
});

test('sortStreamingResourcesByTime: 新しい順、日時の無い項目は元の順のまま末尾', () => {
	const old = entry(idAt(NOW - 10 * HOUR));
	const fresh = entry(idAt(NOW - HOUR));
	const bumped = entry(idAt(NOW - 100 * HOUR), { bumpedAt: NOW - 30 * 60 * 1000 });
	const legacyA = entry('legacy-0');
	const legacyB = entry('legacy-1');
	const sorted = sortStreamingResourcesByTime([legacyA, old, legacyB, fresh, bumped], item => item);
	assert.deepStrictEqual(sorted.map(item => item.id), [bumped.id, fresh.id, old.id, legacyA.id, legacyB.id]);
});

describe('pickStreamingResources', () => {
	const items = ['a', 'a', 'a', 'b', 'a', 'c'].map((creator, index) => ({ creator, index }));

	test('ユーザーごとの上限を守り、順序は保つ', () => {
		const picked = pickStreamingResources(items, item => item.creator, 2, 4);
		assert.deepStrictEqual(picked.map(item => item.index), [0, 1, 3, 5]);
	});

	test('上限内で足りなければ残りで埋める', () => {
		const picked = pickStreamingResources(items, item => item.creator, 1, 5);
		assert.deepStrictEqual(picked.map(item => item.index), [0, 1, 2, 3, 5]);
	});
});

test('getStreamingBumpAvailableAt: 最後の登録・再掲から間隔が空くまでは再掲できない', () => {
	const recent = entry(idAt(NOW - HOUR));
	assert.strictEqual(getStreamingBumpAvailableAt(recent), NOW - HOUR + streamingBumpCooldown);
	assert.isNull(getStreamingBumpAvailableAt(entry(idAt(NOW - 25 * HOUR))));
	assert.isNull(getStreamingBumpAvailableAt(entry('legacy-0')));
});

test('getStreamingResources: bumpedAt はグッズのみ読み、未来の値は丸める', () => {
	const id = idAt(NOW - 48 * HOUR);
	const value = JSON.stringify([{ id, title: 't', url: 'https://example.com/', bumpedAt: NOW + 10 * HOUR }]);
	const [goods] = getStreamingResources([{ name: streamingGoodsServicesFieldName, value }], streamingGoodsServicesFieldName);
	assert.strictEqual(goods.bumpedAt, NOW);
	const [video] = getStreamingResources([{ name: streamingVideoArchiveFieldName, value }], streamingVideoArchiveFieldName);
	assert.isUndefined(video.bumpedAt);
});

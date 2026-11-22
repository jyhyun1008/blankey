/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as mfm from 'mfm-js';
import { tryParseUrl } from '@@/js/url.js';
import { url as localUrl } from '@@/js/config.js';
import { getProxiedImageUrl } from '@/utility/media-proxy.js';
import { userPage } from '@@/js/user.js';
import type { entities } from 'misskey-js';

export const streamingTagsFieldName = 'streaming:tags';
export const streamingCommunityFieldName = 'streaming:community';
export const maxStreamingTags = 5;
export const streamingVideoArchiveFieldName = 'streaming:video-archive';
export const streamingGoodsServicesFieldName = 'streaming:goods-services';
export const streamingResourceFieldNames = [streamingVideoArchiveFieldName, streamingGoodsServicesFieldName] as const;

export type StreamingResource = {
	id: string;
	title: string;
	url: string;
	tags?: string[];
	body?: string;
	portfolio?: StreamingPortfolioItem[];
	/** グッズ・サービスのサムネイル画像 (アップロード / ドライブのファイル URL) */
	thumbnailUrl?: string;
	/** グッズ・サービスの価格 (自由記述) */
	price?: string;
	/** グッズ・サービスを最後に「再掲 (bump)」した日時 (UNIX ms) */
	bumpedAt?: number;
};

/** 再掲 (bump) できる間隔 */
export const streamingBumpCooldown = 1000 * 60 * 60 * 24;

const TIME2000 = 946684800000;

/** 項目 ID (utility/id.ts の genId: 先頭 8 文字が 2000 年からの経過 ms の 36 進数) から登録日時を求める。旧形式の ID は null */
export function getStreamingResourceCreatedAt(entry: Pick<StreamingResource, 'id'>): number | null {
	if (!/^[0-9a-z]{10}$/u.test(entry.id)) return null;
	const time = parseInt(entry.id.slice(0, 8), 36) + TIME2000;
	// ID はクライアントで生成されるので、未来の日時は現在時刻に丸める
	return Number.isFinite(time) ? Math.min(time, Date.now()) : null;
}

/** 一覧の並び順に使う日時: 再掲日時と登録日時の新しい方。どちらも無ければ null */
export function getStreamingResourceSortTime(entry: Pick<StreamingResource, 'id' | 'bumpedAt'>): number | null {
	const createdAt = getStreamingResourceCreatedAt(entry);
	if (entry.bumpedAt == null) return createdAt;
	return Math.max(entry.bumpedAt, createdAt ?? 0);
}

/** 新しい順に並べる。日時の無い (旧形式の) 項目は元の順のまま末尾に置く */
export function sortStreamingResourcesByTime<T>(items: T[], getEntry: (item: T) => StreamingResource): T[] {
	return items
		.map((item, index) => ({ item, index, time: getStreamingResourceSortTime(getEntry(item)) ?? -Infinity }))
		.sort((a, b) => b.time - a.time || a.index - b.index)
		.map(({ item }) => item);
}

/**
 * 並び順を保ったまま先頭から count 件選ぶ。1 人の項目で埋まらないよう、まずユーザーごとに最大 max 件までに絞り、
 * それで count 件に満たなければ残りの項目で埋める。
 */
export function pickStreamingResources<T>(items: T[], getCreatorId: (item: T) => string, max: number, count: number): T[] {
	const counts = new Map<string, number>();
	const picked = new Set<number>();
	items.forEach((item, index) => {
		const id = getCreatorId(item);
		const n = counts.get(id) ?? 0;
		if (picked.size >= count || n >= max) return;
		counts.set(id, n + 1);
		picked.add(index);
	});
	for (let index = 0; index < items.length && picked.size < count; index++) picked.add(index);
	return items.filter((_, index) => picked.has(index));
}

/** 再掲できるようになる日時 (UNIX ms)。今すぐできるなら null */
export function getStreamingBumpAvailableAt(entry: Pick<StreamingResource, 'id' | 'bumpedAt'>): number | null {
	const last = getStreamingResourceSortTime(entry);
	if (last == null) return null;
	const availableAt = last + streamingBumpCooldown;
	return availableAt > Date.now() ? availableAt : null;
}

export const maxStreamingPriceLength = 64;

export type StreamingPortfolioItem = { title: string; imageUrl?: string; url?: string };

export function streamingResourcePath(user: entities.UserLite, field: typeof streamingResourceFieldNames[number], id: string) {
	const tab = field === streamingVideoArchiveFieldName ? 'video-archive' : 'goods-services';
	return userPage(user, `${tab}/${encodeURIComponent(id)}`);
}

export function parseStreamingResourceUrl(value: string) {
	const url = tryParseUrl(value.trim());
	return url?.protocol === 'https:' && !url.username && !url.password ? url : undefined;
}

/** 画像 URL: https か、このサーバー自身 (ドライブのファイル) の URL */
export function parseStreamingImageUrl(value: string) {
	const url = tryParseUrl(value.trim());
	if (url == null || url.username || url.password) return undefined;
	if (url.protocol === 'https:' || url.origin === new URL(localUrl).origin) return url;
	return undefined;
}

/** 画像の表示用 URL: このサーバーのファイルはそのまま、外部はメディアプロキシ経由 */
export function getStreamingImageSrc(value: string, type?: 'preview') {
	const url = tryParseUrl(value);
	if (url && url.origin === new URL(localUrl).origin) return url.href;
	return getProxiedImageUrl(value, type, true, true);
}

/** 一覧や詳細で使うサムネイル: 指定があればそれ、なければポートフォリオの最初の画像 */
export function getStreamingResourceThumbnail(entry: Pick<StreamingResource, 'thumbnailUrl' | 'portfolio'>): string | undefined {
	return entry.thumbnailUrl ?? entry.portfolio?.find(item => item.imageUrl)?.imageUrl;
}

export function getStreamingResources(fields: readonly { name: string; value: string }[], name: typeof streamingResourceFieldNames[number]): StreamingResource[] {
	const value = fields.find(field => field.name === name)?.value;
	if (!value) return [];

	let entries: unknown;
	try {
		entries = JSON.parse(value);
	} catch {
		return [];
	}
	if (!Array.isArray(entries)) return [];

	const ids = new Set<string>();
	return entries.flatMap((entry: Partial<Record<keyof StreamingResource, unknown>> | null, index) => {
		if (typeof entry?.title !== 'string' || typeof entry.url !== 'string') return [];
		const title = entry.title.trim();
		const url = parseStreamingResourceUrl(entry.url);
		if (!title || !url) return [];
		const rawTags: unknown = entry.tags;
		const tags = Array.isArray(rawTags)
			? [...new Set(rawTags.flatMap((tag: unknown) => typeof tag === 'string' ? normalizeStreamingTag(tag) ?? [] : []))]
			: [];
		const id = typeof entry.id === 'string' && /^(?:[a-z0-9]+|legacy-[0-9]+)$/u.test(entry.id) ? entry.id : `legacy-${index}`;
		if (ids.has(id)) return [];
		ids.add(id);
		const body = typeof entry.body === 'string' ? entry.body.trim() : '';
		const portfolio = name === streamingGoodsServicesFieldName && Array.isArray(entry.portfolio)
			? entry.portfolio.flatMap((item: Partial<Record<keyof StreamingPortfolioItem, unknown>> | null) => {
				const title = typeof item?.title === 'string' ? item.title.trim() : '';
				const imageUrl = typeof item?.imageUrl === 'string' ? parseStreamingImageUrl(item.imageUrl)?.href : undefined;
				const url = typeof item?.url === 'string' ? parseStreamingResourceUrl(item.url)?.href : undefined;
				return title ? [{ title, ...(imageUrl ? { imageUrl } : {}), ...(url ? { url } : {}) }] : [];
			})
			: [];
		const thumbnailUrl = name === streamingGoodsServicesFieldName && typeof entry.thumbnailUrl === 'string' ? parseStreamingImageUrl(entry.thumbnailUrl)?.href : undefined;
		const price = name === streamingGoodsServicesFieldName && typeof entry.price === 'string' ? entry.price.trim().slice(0, maxStreamingPriceLength) : '';
		const bumpedAt = name === streamingGoodsServicesFieldName && typeof entry.bumpedAt === 'number' && Number.isFinite(entry.bumpedAt) && entry.bumpedAt > 0
			? Math.min(entry.bumpedAt, Date.now())
			: undefined;
		return [{
			id, title, url: url.href,
			...(tags.length ? { tags } : {}),
			...(body ? { body } : {}),
			...(portfolio.length ? { portfolio } : {}),
			...(thumbnailUrl ? { thumbnailUrl } : {}),
			...(price ? { price } : {}),
			...(bumpedAt ? { bumpedAt } : {}),
		}];
	});
}

export function parseStreamingTags(value: string) {
	return [...new Set(value.normalize('NFKC').toLowerCase().trim().split(/\s+/u).filter(Boolean).map(tag => tag.replace(/^#/, '')))];
}

export function normalizeStreamingTag(value: string) {
	const tag = value.normalize('NFKC').toLowerCase().trim().replace(/^#/, '');
	return isStreamingTag(tag) ? tag : undefined;
}

export function isStreamingTag(tag: string) {
	if (!tag || Array.from(tag).length > 128 || /["'\\%]/u.test(tag)) return false;
	const nodes = mfm.parse('#' + tag);
	return nodes.length === 1 && nodes[0].type === 'hashtag' && nodes[0].props.hashtag === tag;
}

export function parseStreamingChannelId(value: string, origin: string) {
	const url = tryParseUrl(value, origin);
	if (!url || url.origin !== origin || url.username || url.password) return undefined;
	return /^\/channels\/([a-z0-9]+)\/?$/u.exec(url.pathname)?.[1];
}

export function getStreamingTagLinks(fields: readonly { name: string; value: string }[]): { tag: string; label: string }[] {
	const value = fields.find(field => field.name === streamingTagsFieldName)?.value ?? '';
	if (!value.startsWith('[')) {
		return parseStreamingTags(value).filter(isStreamingTag).slice(0, maxStreamingTags).map(tag => ({ tag, label: '' }));
	}

	let entries: unknown;
	try {
		entries = JSON.parse(value);
	} catch {
		return [];
	}
	if (!Array.isArray(entries)) return [];

	const tags = new Map<string, string>();
	for (const entry of entries) {
		if (!entry || typeof entry.tag !== 'string') continue;
		const tag = normalizeStreamingTag(entry.tag);
		if (!tag || tags.has(tag)) continue;
		tags.set(tag, typeof entry.label === 'string' ? entry.label.trim() : '');
		if (tags.size === maxStreamingTags) break;
	}
	return Array.from(tags, ([tag, label]) => ({ tag, label }));
}

export function getStreamingOverviewTags(fields: readonly { name: string; value: string }[]) {
	return getStreamingTagLinks(fields).map(({ tag }) => tag);
}

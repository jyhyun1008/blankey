/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type * as Misskey from 'misskey-js';
import { updateCurrentAccount } from '@/accounts.js';
import { $i } from '@/i.js';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { genId } from '@/utility/id.js';
import { maxStreamingPriceLength, normalizeStreamingTag, parseStreamingImageUrl, parseStreamingResourceUrl } from '@/utility/streaming-overview.js';
import type { StreamingPortfolioItem, StreamingResource, streamingResourceFieldNames } from '@/utility/streaming-overview.js';

type FieldName = typeof streamingResourceFieldNames[number];

/** 編集フォーム用の 1 項目 (動画 / グッズ・サービス共通) */
export type StreamingResourceDraft = {
	id: string;
	title: string;
	url: string;
	hashtags: string;
	body: string;
	thumbnailUrl: string;
	price: string;
	portfolio: { id: string; title: string; imageUrl: string; url: string }[];
	/** 編集では変えず、そのまま引き継ぐ */
	bumpedAt?: number;
};

export function toStreamingResourceDraft(entry?: StreamingResource): StreamingResourceDraft {
	return {
		id: entry?.id ?? genId(),
		title: entry?.title ?? '',
		url: entry?.url ?? '',
		hashtags: (entry?.tags ?? []).map(tag => `#${tag}`).join(' '),
		body: entry?.body ?? '',
		thumbnailUrl: entry?.thumbnailUrl ?? '',
		price: entry?.price ?? '',
		portfolio: (entry?.portfolio ?? []).map(item => ({
			id: genId(),
			title: item.title,
			imageUrl: item.imageUrl ?? '',
			url: item.url ?? '',
		})),
		...(entry?.bumpedAt ? { bumpedAt: entry.bumpedAt } : {}),
	};
}

export function isEmptyStreamingResourceDraft(draft: StreamingResourceDraft) {
	return !draft.title.trim() && !draft.url.trim() && !draft.hashtags.trim() && !draft.body.trim() && !draft.thumbnailUrl && !draft.portfolio.length;
}

/**
 * フォームの値を検証して保存用の項目にする。
 * 問題があればダイアログ用の { error: { title?, text } } を返す。
 */
export function fromStreamingResourceDraft(draft: StreamingResourceDraft, isVideo: boolean): { entry: StreamingResource } | { error: { title?: string; text: string } } {
	const title = draft.title.trim();
	if (!title) return { error: { text: i18n.ts._profile.streamingResourceTitleRequired } };
	const url = parseStreamingResourceUrl(draft.url);
	if (!url) return { error: { text: i18n.ts._profile.streamingLinksInvalidUrl } };

	const parsedTags = draft.hashtags.trim().split(/\s+/u).filter(Boolean).map(normalizeStreamingTag);
	if (!parsedTags.every(tag => tag !== undefined)) return { error: { title: i18n.ts.hashtags, text: i18n.ts.invalidValue } };
	const tags = [...new Set(parsedTags)];

	const portfolio: StreamingPortfolioItem[] = [];
	if (!isVideo) {
		for (const item of draft.portfolio) {
			const itemTitle = item.title.trim();
			const imageValue = item.imageUrl.trim();
			const linkValue = item.url.trim();
			if (!itemTitle && !imageValue && !linkValue) continue;
			if (!itemTitle) return { error: { text: i18n.ts._profile.streamingResourceTitleRequired } };
			const imageUrl = parseStreamingImageUrl(imageValue);
			const link = parseStreamingResourceUrl(linkValue);
			if ((imageValue && !imageUrl) || (linkValue && !link)) return { error: { text: i18n.ts._profile.streamingLinksInvalidUrl } };
			portfolio.push({ title: itemTitle, ...(imageUrl ? { imageUrl: imageUrl.href } : {}), ...(link ? { url: link.href } : {}) });
		}
	}

	const body = draft.body.trim();
	const thumbnailUrl = isVideo ? undefined : parseStreamingImageUrl(draft.thumbnailUrl)?.href;
	const price = isVideo ? '' : draft.price.trim().slice(0, maxStreamingPriceLength);
	return {
		entry: {
			id: draft.id,
			title,
			url: url.href,
			...(tags.length ? { tags } : {}),
			...(body ? { body } : {}),
			...(portfolio.length ? { portfolio } : {}),
			...(thumbnailUrl ? { thumbnailUrl } : {}),
			...(price ? { price } : {}),
			...(!isVideo && draft.bumpedAt ? { bumpedAt: draft.bumpedAt } : {}),
		},
	};
}

/** 自分のプロフィールのフィールドに項目一覧を保存する。成功したら更新後のフィールドを返す */
export async function saveStreamingResources(fieldName: FieldName, entries: StreamingResource[]): Promise<Pick<Misskey.entities.MeDetailed, 'fields' | 'verifiedLinks'> | null> {
	if (!$i) return null;

	const fields = $i.fields.filter(field => field.name !== fieldName);
	if (entries.length) fields.push({ name: fieldName, value: JSON.stringify(entries) });
	if (fields.length > 16) {
		await os.alert({ type: 'error', text: i18n.ts._profile.profileFieldsLimit });
		return null;
	}

	try {
		const account = await os.apiWithDialog('i/update', { fields });
		const updates = { fields: account.fields, verifiedLinks: account.verifiedLinks };
		updateCurrentAccount(updates);
		return updates;
	} catch {
		// apiWithDialog がエラーを表示する
		return null;
	}
}

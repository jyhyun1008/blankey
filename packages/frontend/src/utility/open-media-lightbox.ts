/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { markRaw } from 'vue';
import type * as Misskey from 'misskey-js';
import type { Content } from '@/components/MkLightbox.item.vue';
import * as os from '@/os.js';
import { prefer } from '@/preferences.js';
import { getType } from '@/utility/lightbox.js';

/**
 * 複数メディアのライトボックスを開く。sourceMarker を渡すと、その data-marker を持つ要素からズームして開く。
 */
export async function openMediaLightbox(files: Misskey.entities.DriveFile[], id: string, options: { user?: Misskey.entities.UserLite | null; sourceMarker?: string } = {}) {
	if (prefer.s.imageNewTab) {
		const file = files.find(f => f.id === id);
		if (file) window.open(file.url, '_blank');
		return;
	}

	const source = options.sourceMarker ? window.document.querySelector<HTMLElement>(`[data-marker="${options.sourceMarker}"]`) : null;
	const contents = files.map<Content>(media => ({
		id: media.id,
		type: getType(media.type),
		url: media.url,
		thumbnailUrl: media.thumbnailUrl,
		width: media.properties.width,
		height: media.properties.height,
		filename: media.name,
		file: media,
		sourceElement: media.id === id && source ? markRaw(source) : null,
	}));

	const { dispose } = await os.popupAsyncWithDialog(import('@/components/MkLightbox.vue').then(x => x.default), {
		defaultIndex: Math.max(0, contents.findIndex(c => c.id === id)),
		contents,
		initiallyRevealedContentIds: [id],
		user: options.user,
	}, {
		closed: () => dispose(),
	});
}

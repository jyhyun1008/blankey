/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export const streamingChannelFieldName = 'streaming:channel';
export const streamingSupportFieldName = 'streaming:support';

const channelPlatforms = [
	{ name: 'Twitch', domains: ['twitch.tv'] },
	{ name: 'YouTube', domains: ['youtube.com', 'youtu.be'] },
	{ name: 'SOOP', domains: ['sooplive.com', 'sooplive.co.kr', 'afreecatv.com'] },
	{ name: 'CHZZK', domains: ['chzzk.naver.com'] },
	{ name: 'CI.ME', domains: ['ci.me'] },
];

const supportPlatforms = [
	{ name: 'Buy Me a Coffee', domains: ['buymeacoffee.com'] },
	{ name: 'Patreon', domains: ['patreon.com'] },
];

export function getStreamingPlatformName(url: URL, kind: 'channel' | 'support') {
	if (url.protocol !== 'https:' || url.username || url.password || url.port) return undefined;

	const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
	const platforms = kind === 'channel' ? channelPlatforms : supportPlatforms;
	return platforms.find(platform => platform.domains.some(domain => hostname === domain || hostname.endsWith('.' + domain)))?.name;
}

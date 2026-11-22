/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export const liveChatOverlayHtml = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Blankey Live Chat · OBS</title>
<style>
	body { margin: 0; min-height: 100vh; display: flex; align-items: flex-end; color: #fff; font: 400 clamp(14px, 4vw, 23px)/1.4 "Instance Web Font", system-ui, sans-serif; }
	ul { width: 100%; max-height: 100vh; overflow: hidden; list-style: none; box-sizing: border-box; margin: 0; padding: 0.5em; display: flex; flex-direction: column; justify-content: flex-end; gap: 0.35em; }
	li { padding: 0.45em 0.7em; background: #211f28dc; border-radius: 0.55em; overflow-wrap: anywhere; white-space: pre-wrap; }
	strong { color: #ffcd9e; margin-inline-end: 0.55em; }
</style>
<script defer src="/obs/live-chat/app.js"></script>
</head>
<body><ul id="chat"></ul></body>
</html>`;

export const liveChatOverlayScript = `
const token = location.hash.slice(1);
const chat = document.getElementById('chat');
let lastIds = '';

async function loadFonts() {
	try {
		const response = await fetch('/api/meta', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: '{"detail":true}',
		});
		if (!response.ok) return;
		const meta = await response.json();
		for (const [source, weight] of [[meta.webFontRegularUrl, '400'], [meta.webFontBoldUrl, '700']]) {
			if (!source) continue;
			const url = new URL(source);
			if (url.protocol !== 'https:') continue;
			document.fonts.add(new FontFace('Instance Web Font', 'url(' + CSS.escape(url.href) + ')', { weight, display: 'swap' }));
		}
	} catch {
		// Fall back to system fonts.
	}
}

async function poll() {
	try {
		const response = await fetch(location.pathname + '/messages', {
			headers: { Authorization: 'Bearer ' + token },
			cache: 'no-store',
		});
		if (response.ok) {
			const { messages, time } = await response.json();
			const visible = messages.filter(message => message.time >= time - 45000).slice(-6);
			const ids = visible.map(message => message.id).join(',');
			if (ids !== lastIds) {
				lastIds = ids;
				chat.replaceChildren(...visible.map(message => {
					const item = document.createElement('li');
					const author = document.createElement('strong');
					author.textContent = message.name || '@' + message.username;
					item.append(author, document.createTextNode(message.text));
					return item;
				}));
			}
		} else if (response.status === 403) {
			lastIds = '';
			chat.replaceChildren();
		}
	} catch {
		// Retry after a temporary connection failure.
	}
	setTimeout(poll, 3000);
}

if (/^[a-f0-9]{64}$/.test(token)) {
	void loadFonts();
	void poll();
}
`;

/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export const coffeeOverlayHtml = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Buy Me a Coffee · OBS</title>
<style>
	body {
		margin: 0;
		min-height: 100vh;
		display: grid;
		place-items: center;
		font: 400 clamp(16px, 4vw, 26px)/1.35 "Instance Web Font", "Hiragino Maru Gothic Pro", "BIZ UDGothic", Roboto, HelveticaNeue, Arial, sans-serif;
	}
	#alert { max-width: min(85vw, 30rem); color: #fff7ef; text-align: center; }
	#alert:not([hidden]) { animation: enter 250ms ease-out; }
	#alert img { display: block; width: 6em; height: 6em; margin: 0 auto -0.2em; object-fit: cover; object-position: center top; }
	.message { padding: 0.65em 1.1em 0.75em; border: 2px solid #e9ae79; border-radius: 0.8em; background: #302622; box-shadow: 0 0.25em 0.75em #21181560; overflow-wrap: anywhere; }
	#supporter { display: block; font-size: 1.25em; font-weight: 700; color: #ffce99; }
	#detail { margin-top: 0.25em; font-weight: 700; }
	#preview { font: inherit; padding: 0.5em 0.8em; }
	@keyframes enter { from { opacity: 0; transform: translateY(0.5em); } }
	@media (prefers-reduced-motion: reduce) { #alert:not([hidden]) { animation: none; } }
</style>
<script defer src="/obs/buy-me-a-coffee/app.js"></script>
</head>
<body>
<button id="preview" type="button" hidden></button>
<div id="alert" role="status" hidden>
	<img src="/obs/buy-me-a-coffee/art.png" alt="">
	<div class="message"><strong id="supporter"></strong><div id="title"></div><div id="detail"></div></div>
</div>
<audio id="sound" src="/client-assets/sounds/syuilo/n-ea-harmony.mp3" preload="auto"></audio>
</body>
</html>`;

export const coffeeOverlayScript = `
const translations = {
	en: {
		donation: 'Thank you for the coffee!', membership: 'Membership support!', recurring: 'Recurring support!',
		anonymous: 'Anonymous supporter', test: 'Test', preview: 'Play alert and sound', months: n => 'Month ' + n,
	},
	ja: {
		donation: 'コーヒーのご支援ありがとうございます！', membership: 'メンバーシップのご支援！', recurring: '定期支援ありがとうございます！',
		anonymous: '匿名の支援者', test: 'テスト', preview: '音付きで再生', months: n => n + 'か月目',
	},
	ko: {
		donation: '일시 후원 감사합니다!', membership: '멤버십 구독 감사합니다!', recurring: '정기 후원 감사합니다!',
		anonymous: '익명 후원자', test: '테스트', preview: '소리와 함께 알림 재생', months: n => n + '개월째 후원 중',
	},
};
const requestedLang = new URLSearchParams(location.search).get('lang') || navigator.language.split('-')[0];
const lang = Object.hasOwn(translations, requestedLang) ? requestedLang : 'en';
const messages = translations[lang];
document.documentElement.lang = lang;
const card = document.getElementById('alert');
const supporter = document.getElementById('supporter');
const title = document.getElementById('title');
const detail = document.getElementById('detail');
const preview = document.getElementById('preview');
const sound = document.getElementById('sound');
sound.volume = 0.55;
const token = location.hash.slice(1);
const queue = [];
const seen = new Map();
let since;
let showing = false;

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
		// Use the standard font stack when the configured font cannot be loaded.
	}
}

function eventLabel(type) {
	if (type === 'donation.created') return messages.donation;
	if (type === 'membership.started' || type === 'membership.updated') return messages.membership;
	if (type === 'recurring_donation.started' || type === 'recurring_donation.updated') return messages.recurring;
	return null;
}

function showNext() {
	if (showing || !queue.length) return;
	showing = true;
	const event = queue.shift();
	supporter.textContent = event.name || messages.anonymous;
	title.textContent = (event.test ? '[' + messages.test + '] ' : '') + eventLabel(event.type);
	const amount = event.amount !== null && event.currency
		? new Intl.NumberFormat(lang, { style: 'currency', currency: event.currency }).format(event.amount)
		: null;
	detail.textContent = [event.level, amount, event.months ? messages.months(event.months) : null].filter(Boolean).join(' · ');
	card.hidden = false;
	sound.currentTime = 0;
	void sound.play().catch(() => {});
	setTimeout(() => {
		card.hidden = true;
		setTimeout(() => {
			showing = false;
			showNext();
			if (!showing && token === 'preview') preview.hidden = false;
		}, 300);
	}, 5000);
}

async function poll() {
	try {
		const url = location.pathname + '/events' + (since === undefined ? '' : '?since=' + since);
		const response = await fetch(url, { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' });
		if (response.ok) {
			const data = await response.json();
			for (const [id, time] of seen) {
				if (time < data.time - 120000) seen.delete(id);
			}
			for (const event of data.events) {
				if (!eventLabel(event.type) || seen.has(event.id)) continue;
				seen.set(event.id, event.time);
				queue.push(event);
			}
			since = data.time - 5000;
			showNext();
		}
	} catch {
		// Keep polling after temporary network failures.
	}
	setTimeout(poll, 2500);
}

void loadFonts();
if (token === 'preview') {
	preview.textContent = messages.preview;
	preview.hidden = false;
	preview.addEventListener('click', () => {
		preview.hidden = true;
		queue.push(
			{ type: 'donation.created', name: 'Alex', amount: 15, currency: 'USD', test: true },
			{ type: 'membership.updated', name: 'Mika', amount: 8, currency: 'USD', level: 'Gold', months: 3, test: true },
			{ type: 'recurring_donation.started', name: 'Jin', amount: 5, currency: 'USD', months: 1, test: true },
		);
		showNext();
	});
} else if (/^[a-f0-9]{64}$/.test(token)) {
	void poll();
}
`;

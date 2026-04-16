import { browser } from '$app/environment';

const STORAGE_KEY = 'dw-character-sheet';

function load() {
	if (!browser) return '';
	try { return localStorage.getItem(STORAGE_KEY) ?? ''; }
	catch { return ''; }
}

function save(val) {
	if (!browser) return;
	try { localStorage.setItem(STORAGE_KEY, val); } catch {}
}

let text = $state(load());

export const characterSheet = {
	get value() { return text; },
	set value(v) { text = v; save(v); },
	get isEmpty() { return !text.trim(); },
};

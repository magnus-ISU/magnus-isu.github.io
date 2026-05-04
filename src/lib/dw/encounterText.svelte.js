import { browser } from '$app/environment';
import { driveSync } from '$lib/google/sync.svelte.js';

const STORAGE_KEY = 'dw-encounter-text';
const MAX_SIZE = 1024;

driveSync.registerKey(STORAGE_KEY);

function load() {
	if (!browser) return '';
	try {
		return driveSync.load(STORAGE_KEY) ?? '';
	} catch {
		return '';
	}
}

function save(val) {
	if (!browser) return;
	try {
		if (val.length <= MAX_SIZE) driveSync.save(STORAGE_KEY, val);
		else localStorage.removeItem(STORAGE_KEY);
	} catch {
		/* ignore */
	}
}

let text = $state(load());
let knownNames = new Set();

function mentionMonsterName(mention) {
	const t = mention.trim();
	if (!t) return '';
	return t.replace(/\s*\(.*\)\s*$/, '').toLowerCase();
}

export const encounterText = {
	get value() {
		return text;
	},
	set value(v) {
		text = v;
		save(v);
	},
	setKnownNames(names) {
		knownNames = new Set(names.map((n) => n.toLowerCase()));
	},
	appendName(name) {
		const lines = text.trimEnd().split('\n');
		const lowerName = name.toLowerCase();

		const clean =
			knownNames.size > 0
				? lines.filter((l) => {
						const n = mentionMonsterName(l);
						return !n || knownNames.has(n);
					})
				: lines;

		const idx = clean.findIndex((l) => mentionMonsterName(l) === lowerName);

		if (idx !== -1) {
			const parenMatch = clean[idx].trim().match(/^(.+?)\s*\((\d+)\)\s*$/);
			if (parenMatch) {
				const count = +parenMatch[2];
				clean[idx] = `${parenMatch[1]} (${count + 1})`;
			} else {
				const baseName = clean[idx].trim().replace(/\s*\(.*\)\s*$/, '');
				clean[idx] = `${baseName} (2)`;
			}
		} else {
			clean.push(name);
		}

		text = clean.filter((l) => l.trim()).join('\n');
		save(text);
	},
};

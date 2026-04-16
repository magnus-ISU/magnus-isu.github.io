import { browser } from '$app/environment';

const STORAGE_KEY = 'dw-encounter-text';
const MAX_SIZE = 1024;

function load() {
	if (!browser) return '';
	try { return localStorage.getItem(STORAGE_KEY) ?? ''; }
	catch { return ''; }
}

function save(val) {
	if (!browser) return;
	try {
		if (val.length <= MAX_SIZE) localStorage.setItem(STORAGE_KEY, val);
		else localStorage.removeItem(STORAGE_KEY);
	} catch {}
}

let text = $state(load());
let knownNames = new Set();

function lineMonsterName(line) {
	const t = line.trim();
	if (!t) return '';
	const m = t.match(/^(\d+)\s+(.+)/);
	return (m ? m[2] : t).toLowerCase();
}

export const encounterText = {
	get value() { return text; },
	set value(v) { text = v; save(v); },
	setKnownNames(names) {
		knownNames = new Set(names.map(n => n.toLowerCase()));
	},
	appendName(name) {
		const lines = text.trimEnd().split('\n');
		const lowerName = name.toLowerCase();

		// Strip lines that don't match any known monster
		const clean = knownNames.size > 0
			? lines.filter(l => { const n = lineMonsterName(l); return !n || knownNames.has(n); })
			: lines;

		// Find existing line with this monster name
		const idx = clean.findIndex(l => lineMonsterName(l) === lowerName);

		if (idx !== -1) {
			const m = clean[idx].trim().match(/^(\d+)\s+(.+)/);
			const count = m ? +m[1] : 1;
			clean[idx] = `${count + 1} ${name}`;
		} else {
			clean.push(name);
		}

		text = clean.filter(l => l.trim()).join('\n');
		save(text);
	},
};

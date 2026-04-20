import { browser } from '$app/environment';

const STORAGE_KEY = 'dw-encounter-text';
const MAX_SIZE = 1024;

function load() {
	if (!browser) return '';
	try {
		return localStorage.getItem(STORAGE_KEY) ?? '';
	} catch {
		return '';
	}
}

function save(val) {
	if (!browser) return;
	try {
		if (val.length <= MAX_SIZE) localStorage.setItem(STORAGE_KEY, val);
		else localStorage.removeItem(STORAGE_KEY);
	} catch {
		/* ignore */
	}
}

let text = $state(load());
let knownNames = new Set();

// Extract the monster name from a monster mention like "Bandit (3)" or "Bandit (John, Paul)"
// Returns lowercase name, or empty string if not parseable
function mentionMonsterName(mention) {
	const t = mention.trim();
	if (!t) return '';
	// Strip parenthetical suffix
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

		// Strip lines that don't match any known monster
		const clean =
			knownNames.size > 0
				? lines.filter((l) => {
						const n = mentionMonsterName(l);
						return !n || knownNames.has(n);
					})
				: lines;

		// Find existing line with this monster name
		const idx = clean.findIndex((l) => mentionMonsterName(l) === lowerName);

		if (idx !== -1) {
			const parenMatch = clean[idx].trim().match(/^(.+?)\s*\((\d+)\)\s*$/);
			if (parenMatch) {
				const count = +parenMatch[2];
				clean[idx] = `${parenMatch[1]} (${count + 1})`;
			} else {
				// No parenthetical count, or has named members — just add (2)
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

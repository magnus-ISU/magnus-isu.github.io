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

export const encounterText = {
	get value() { return text; },
	set value(v) { text = v; save(v); },
	appendName(name) {
		const trimmed = text.trimEnd();
		const lines = trimmed.split('\n');
		const lowerName = name.toLowerCase();

		// Find existing line with this monster name
		const idx = lines.findIndex(l => {
			const t = l.trim();
			const m = t.match(/^(\d+)\s+(.+)/);
			const lineName = m ? m[2] : t;
			return lineName.toLowerCase() === lowerName;
		});

		if (idx !== -1) {
			const m = lines[idx].trim().match(/^(\d+)\s+(.+)/);
			const count = m ? +m[1] : 1;
			lines[idx] = `${count + 1} ${name}`;
			text = lines.join('\n');
		} else {
			text = trimmed ? trimmed + '\n' + name : name;
		}
		save(text);
	},
};

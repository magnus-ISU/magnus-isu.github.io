import { browser } from '$app/environment';

const STORAGE_KEY = 'dw-user-monsters';

function load() {
	if (!browser) return [];
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
	} catch {
		return [];
	}
}

function save(arr) {
	if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

let monsters = $state(load());

export const userMonsters = {
	get list() {
		return monsters;
	},
	add(m) {
		monsters = [...monsters, m];
		save(monsters);
	},
	remove(name) {
		monsters = monsters.filter((m) => m.name !== name);
		save(monsters);
	},
	import(incoming) {
		const existing = new Set(monsters.map((m) => m.name.toLowerCase()));
		const toAdd = incoming.filter((m) => !existing.has(m.name.toLowerCase()));
		if (toAdd.length) {
			monsters = [...monsters, ...toAdd];
			save(monsters);
		}
	},
	hasName(name) {
		return monsters.some((m) => m.name.toLowerCase() === name.toLowerCase());
	},
};

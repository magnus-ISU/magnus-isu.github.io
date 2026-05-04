import { browser } from '$app/environment';
import { driveSync } from '$lib/google/sync.svelte.js';

const STORAGE_KEY = 'dw-user-monsters';

driveSync.registerKey(STORAGE_KEY);

function load() {
	if (!browser) return [];
	try {
		return JSON.parse(driveSync.load(STORAGE_KEY) ?? '[]');
	} catch {
		return [];
	}
}

function save(arr) {
	if (browser) driveSync.save(STORAGE_KEY, JSON.stringify(arr));
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
	refresh() {
		monsters = load();
	},
};

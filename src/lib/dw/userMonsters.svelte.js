// Monsters the user has made: one document holding a JSON array (see
// sync/kinds.js for how two devices' lists are merged).
import { formatMonsters, parseMonsters } from '$lib/sync/kinds.js';
import { docStore, docs } from './docs.svelte.js';

const doc = () => docs().byKind('monsters')[0] || null;

// Parsed once per change of the stored text, not once per change of any document.
const text = $derived(doc()?.text ?? '');
const monsters = $derived(parseMonsters(text));

function save(list) {
	const d = doc();
	const text = formatMonsters(list);
	if (d) docStore.edit(d.id, text);
	else if (list.length) docStore.create('monsters', text);
}

export const userMonsters = {
	get list() {
		return monsters;
	},
	add(m) {
		save([...monsters, m]);
	},
	remove(name) {
		save(monsters.filter((m) => m.name !== name));
	},
	import(incoming) {
		const existing = new Set(monsters.map((m) => m.name.toLowerCase()));
		const toAdd = incoming.filter((m) => !existing.has(m.name.toLowerCase()));
		if (toAdd.length) save([...monsters, ...toAdd]);
	},
	hasName(name) {
		return monsters.some((m) => m.name.toLowerCase() === name.toLowerCase());
	},
};

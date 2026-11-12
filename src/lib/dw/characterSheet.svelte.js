// The character sheets, one document each (see sync/docStore.js), and which
// one is open in this tab.
import { browser } from '$app/environment';
import { characterName } from '$lib/sync/kinds.js';
import { docStore, docs } from './docs.svelte.js';

const ACTIVE_KEY = 'dw-character-active-id';

function loadActive() {
	if (!browser) return '';
	try {
		return localStorage.getItem(ACTIVE_KEY) || '';
	} catch {
		return '';
	}
}

let activeId = $state(loadActive());

function setActive(id) {
	activeId = id;
	if (!browser) return;
	try {
		localStorage.setItem(ACTIVE_KEY, id);
	} catch {
		/* ignore */
	}
}

const sheets = () => docs().byKind('character');

// The open sheet. If it was deleted (here or on another device) the first one
// takes its place.
function active() {
	const list = sheets();
	return list.find((d) => d.id === activeId) || list[0] || null;
}

// There is always a sheet to type into.
if (browser && !docStore.byKind('character').length) docStore.create('character', '');

export const characterSheet = {
	get value() {
		return active()?.text ?? '';
	},
	set value(v) {
		const doc = active();
		if (doc) docStore.edit(doc.id, v);
		else if (v) setActive(docStore.create('character', v).id);
	},
	get isEmpty() {
		return !this.value.trim();
	},

	get activeIndex() {
		const doc = active();
		return doc ? sheets().indexOf(doc) : 0;
	},
	get slotCount() {
		return sheets().length;
	},

	/** Get the name from a slot's first line */
	slotName(i) {
		return characterName(sheets()[i]?.text ?? '');
	},

	/** The slot is one half of a sync conflict: its label, or '' */
	slotConflict(i) {
		return sheets()[i]?.conflict || '';
	},

	/** Switch to a different slot */
	switchTo(i) {
		const doc = sheets()[i];
		if (doc) setActive(doc.id);
	},

	/** Add a new empty slot and switch to it */
	addSlot() {
		setActive(docStore.create('character', '').id);
	},

	/**
	 * Delete a slot (cannot delete the last one). Returns what restoreSlot()
	 * needs to undo it.
	 */
	deleteSlot(i) {
		const list = sheets();
		const doc = list[i];
		if (!doc || list.length <= 1) return null;
		const wasActive = active() === doc;
		const neighbour = list[i + 1] || list[i - 1];
		const removed = docStore.remove(doc.id);
		if (wasActive) setActive(neighbour.id);
		return { doc: removed, index: i, wasActive };
	},

	/** Undo a deleteSlot() */
	restoreSlot(snapshot) {
		if (!snapshot) return;
		const doc = docStore.restore(snapshot.doc, snapshot.index);
		if (snapshot.wasActive) setActive(doc.id);
	},
};

// The browser's copy of every synced document (characters, user monsters).
//
// localStorage is the source of truth — it is what other tabs see and what
// survives a reload — and this module keeps an in-memory mirror of it for the
// UI. Each document is its own key, so typing in one character rewrites only
// that character.
//
// A document:
//   id        local identity; also stamped on its Drive file
//   kind      'character' | 'monsters' (see kinds.js)
//   text      the content
//   fileId    its Drive file, or null if it has never been uploaded
//   rev       the Drive revision `text` was last in sync with
//   dirty     `text` has edits Drive has not seen
//   conflict  label of a conflict copy ('' otherwise); shown in the file name
//   metaDirty the label was cleared here and Drive has not been told
//   sent      digest of an upload whose outcome is not yet known
//   verify    an upload still to be checked for having buried another device's
//
// Only the sync engine touches fileId/rev/sent; only edits and pulls touch
// text. No backwards compatibility is kept with the old single-file layout
// beyond a one-time import of the characters and monsters it held.

const INDEX_KEY = 'dw-docs-v2';
const DOC_PREFIX = 'dw-doc-v2:';
const DRIVE_KEY = 'dw-drive-v2';

function randomId() {
	const bytes = new Uint8Array(12);
	globalThis.crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// A Map-backed stand-in for localStorage (server rendering, tests).
export function memoryStorage() {
	const map = new Map();
	return {
		getItem: (k) => (map.has(k) ? map.get(k) : null),
		setItem: (k, v) => void map.set(k, String(v)),
		removeItem: (k) => void map.delete(k),
	};
}

export function createDocStore({ storage, persistDelay = 400, newId = randomId } = {}) {
	let docs = []; // in display order
	const pending = new Map(); // doc id -> timer, for text not yet written out
	const shadow = new Map(); // doc id -> the stored text our copy was last level with
	const removedHere = new Set(); // ids this tab deleted, so a merge can't revive them
	let drive = { enabled: false, account: '', tombstones: [], notices: [] };

	const store = {
		// Set by whoever wants to know: any change at all, and local edits
		// that need syncing.
		onChange: () => {},
		onLocalEdit: () => {},
		newId,
	};

	const read = (key) => {
		try {
			return storage.getItem(key);
		} catch {
			return null;
		}
	};
	const write = (key, value) => {
		try {
			storage.setItem(key, value);
		} catch {
			/* quota or disabled storage: keep working from memory */
		}
	};
	const parse = (raw) => {
		if (!raw) return null;
		try {
			return JSON.parse(raw);
		} catch {
			return null;
		}
	};

	function normalize(d) {
		return {
			id: d.id,
			kind: d.kind,
			text: typeof d.text === 'string' ? d.text : '',
			fileId: d.fileId || null,
			rev: d.rev || null,
			dirty: !!d.dirty,
			conflict: d.conflict || '',
			metaDirty: !!d.metaDirty,
			sent: d.sent || null,
			verify: d.verify || null,
		};
	}

	function readDoc(id) {
		const d = parse(read(DOC_PREFIX + id));
		return d?.id === id && d.kind ? normalize(d) : null;
	}

	function writeDoc(doc) {
		const t = pending.get(doc.id);
		if (t !== undefined) {
			clearTimeout(t);
			pending.delete(doc.id);
		}
		write(DOC_PREFIX + doc.id, JSON.stringify(doc));
		shadow.set(doc.id, doc.text);
	}

	// Another tab may have changed a document since we last read it. If it
	// only advanced the sync bookkeeping (it uploaded the text our edit
	// started from), we must take that, or we would write stale bookkeeping
	// back. If it changed the text itself (it pulled something new), our edit
	// stands on a different text: then we keep our own bookkeeping, so the
	// engine sees a document edited on top of an old revision and keeps both
	// versions, instead of ours silently replacing the one that was pulled.
	function adoptBookkeeping(doc) {
		const stored = readDoc(doc.id);
		if (stored && stored.text === shadow.get(doc.id)) {
			Object.assign(doc, stored, { text: doc.text, dirty: true });
		}
	}

	// Write out a user edit.
	function writeText(doc) {
		adoptBookkeeping(doc);
		writeDoc(doc);
	}

	// The index lists ids in order. Another tab may have added documents since
	// we last looked, so writing merges rather than overwrites.
	function writeIndex() {
		const known = new Set(docs.map((d) => d.id));
		for (const id of parse(read(INDEX_KEY))?.order || []) {
			if (known.has(id) || removedHere.has(id)) continue;
			const d = readDoc(id);
			if (d) {
				docs.push(d);
				known.add(id);
			}
		}
		write(INDEX_KEY, JSON.stringify({ order: docs.map((d) => d.id) }));
	}

	function writeDrive() {
		write(DRIVE_KEY, JSON.stringify(drive));
	}

	function readDrive() {
		const d = parse(read(DRIVE_KEY)) || {};
		drive = {
			enabled: !!d.enabled,
			account: d.account || '',
			tombstones: Array.isArray(d.tombstones) ? d.tombstones : [],
			notices: Array.isArray(d.notices) ? d.notices : [],
		};
	}

	// One-time import from the old layout: a JSON array of character sheets
	// (plus the "local mode" snapshot of it) and a JSON array of monsters.
	function importLegacy() {
		const texts = [];
		const monsters = [];
		for (const prefix of ['', 'local-backup-']) {
			const slots = parse(read(`${prefix}dw-character-slots`));
			if (Array.isArray(slots)) {
				for (const t of slots) {
					if (typeof t === 'string' && t.trim() && !texts.includes(t)) texts.push(t);
				}
			}
			const list = parse(read(`${prefix}dw-user-monsters`));
			if (Array.isArray(list)) {
				for (const m of list) {
					if (!m || typeof m.name !== 'string') continue;
					if (!monsters.some((x) => x.name.toLowerCase() === m.name.toLowerCase()))
						monsters.push(m);
				}
			}
		}
		for (const text of texts)
			docs.push(normalize({ id: newId(), kind: 'character', text, dirty: true }));
		if (monsters.length) {
			const text = JSON.stringify(monsters, null, '\t');
			docs.push(normalize({ id: newId(), kind: 'monsters', text, dirty: true }));
		}
		for (const d of docs) writeDoc(d);
		write(INDEX_KEY, JSON.stringify({ order: docs.map((d) => d.id) }));
	}

	function load() {
		readDrive();
		const index = parse(read(INDEX_KEY));
		if (!index) {
			importLegacy();
			return;
		}
		docs = (index.order || []).map(readDoc).filter(Boolean);
		for (const d of docs) shadow.set(d.id, d.text);
	}

	const find = (id) => docs.find((d) => d.id === id) || null;

	Object.assign(store, {
		all: () => docs,
		byKind: (kind) => docs.filter((d) => d.kind === kind),
		get: find,

		// Write out any edits still waiting on the debounce.
		flush() {
			for (const id of [...pending.keys()]) {
				const d = find(id);
				if (d) writeText(d);
			}
		},

		// Re-read everything other tabs may have changed. A document with edits
		// of our own still unwritten keeps its text (and stays dirty) but takes
		// the other tab's sync bookkeeping.
		refresh() {
			readDrive();
			const order = parse(read(INDEX_KEY))?.order || [];
			const next = [];
			const seen = new Set();
			for (const id of order) {
				if (removedHere.has(id)) continue;
				const stored = readDoc(id);
				if (!stored) continue;
				const mine = find(id);
				if (mine && pending.has(id)) {
					adoptBookkeeping(mine);
					next.push(mine);
				} else {
					next.push(mine ? Object.assign(mine, stored) : stored);
					shadow.set(id, stored.text);
				}
				seen.add(id);
			}
			// Documents we created that have not reached the index yet.
			let unindexed = false;
			for (const d of docs) {
				if (!seen.has(d.id) && pending.has(d.id)) {
					next.push(d);
					unindexed = true;
				}
			}
			docs = next;
			if (unindexed) writeIndex();
			store.onChange();
		},

		// The stored state of one document, including anything another tab
		// wrote a moment ago. The sync engine decides on this, never on a
		// value it read before an await.
		fresh(id) {
			const mine = find(id);
			if (mine && pending.has(id)) writeText(mine);
			const stored = readDoc(id);
			if (!stored) {
				if (mine) {
					docs = docs.filter((d) => d.id !== id);
					store.onChange();
				}
				return null;
			}
			shadow.set(id, stored.text);
			if (!mine) {
				docs.push(stored);
				store.onChange();
				return stored;
			}
			const changed = mine.text !== stored.text || mine.dirty !== stored.dirty;
			Object.assign(mine, stored);
			if (changed) store.onChange();
			return mine;
		},

		create(kind, text = '') {
			const doc = normalize({ id: newId(), kind, text, dirty: true });
			docs.push(doc);
			writeDoc(doc);
			writeIndex();
			store.onChange();
			if (text.trim()) store.onLocalEdit();
			return doc;
		},

		// A user edit. Going from clean to dirty is written at once, so every
		// tab knows not to overwrite this document with a pull; further
		// keystrokes are coalesced.
		edit(id, text) {
			const doc = find(id);
			if (!doc || doc.text === text) return;
			doc.text = text;
			if (!doc.dirty) {
				doc.dirty = true;
				writeText(doc);
			} else if (!pending.has(id)) {
				pending.set(
					id,
					setTimeout(() => {
						const d = find(id);
						if (d) writeText(d);
						else pending.delete(id);
					}, persistDelay),
				);
			}
			store.onChange();
			store.onLocalEdit();
		},

		// Sync bookkeeping (and pulled text) from the engine; written at once.
		patch(id, patch) {
			const doc = find(id);
			if (!doc) return null;
			Object.assign(doc, patch);
			writeDoc(doc);
			store.onChange();
			return doc;
		},

		// Add a document that already exists somewhere (pulled from Drive).
		insert(doc, afterId = null) {
			const d = normalize(doc);
			removedHere.delete(d.id);
			const at = afterId ? docs.findIndex((x) => x.id === afterId) : -1;
			if (at >= 0) docs.splice(at + 1, 0, d);
			else docs.push(d);
			writeDoc(d);
			writeIndex();
			store.onChange();
			return d;
		},

		// Delete a document. Its Drive file, if any, is queued for deletion
		// along with the revision we last saw, so a copy somebody else has
		// edited since is not thrown away.
		remove(id, { tombstone = true } = {}) {
			const doc = find(id);
			if (!doc) return null;
			const t = pending.get(id);
			if (t !== undefined) clearTimeout(t);
			pending.delete(id);
			docs = docs.filter((d) => d.id !== id);
			shadow.delete(id);
			removedHere.add(id);
			try {
				storage.removeItem(DOC_PREFIX + id);
			} catch {
				/* ignore */
			}
			writeIndex();
			if (tombstone && doc.fileId) {
				readDrive();
				drive.tombstones.push({ fileId: doc.fileId, rev: doc.rev });
				writeDrive();
				store.onLocalEdit();
			}
			store.onChange();
			return { ...doc };
		},

		// Undo a remove(): put the document back at `index` among its kind. If
		// its Drive file is already gone it becomes a new document.
		restore(snapshot, index) {
			const doc = normalize(snapshot);
			readDrive();
			const queued = doc.fileId && drive.tombstones.some((t) => t.fileId === doc.fileId);
			if (queued) {
				drive.tombstones = drive.tombstones.filter((t) => t.fileId !== doc.fileId);
				writeDrive();
			} else if (doc.fileId) {
				Object.assign(doc, { fileId: null, rev: null, dirty: true, sent: null, verify: null });
			}
			removedHere.delete(doc.id);
			const sameKind = docs.filter((d) => d.kind === doc.kind);
			const before = sameKind[index];
			if (before) docs.splice(docs.indexOf(before), 0, doc);
			else docs.push(doc);
			writeDoc(doc);
			writeIndex();
			store.onChange();
			store.onLocalEdit();
			return doc;
		},

		// Forget every Drive link, as when signing in to a different account:
		// each document becomes a new file there.
		unlinkAll() {
			for (const d of docs) {
				Object.assign(d, {
					fileId: null,
					rev: null,
					dirty: true,
					sent: null,
					verify: null,
					metaDirty: false,
				});
				writeDoc(d);
			}
			readDrive();
			drive.tombstones = [];
			writeDrive();
			store.onChange();
		},

		// --- Drive connection state, shared by all tabs ---
		drive: () => drive,
		setDrive(patch) {
			readDrive();
			Object.assign(drive, patch);
			writeDrive();
			store.onChange();
		},
		tombstones: () => drive.tombstones,
		addTombstone(fileId, rev = null) {
			readDrive();
			drive.tombstones.push({ fileId, rev });
			writeDrive();
		},
		clearTombstone(fileId) {
			readDrive();
			drive.tombstones = drive.tombstones.filter((t) => t.fileId !== fileId);
			writeDrive();
		},
		addNotice(notice) {
			readDrive();
			drive.notices.push({ id: newId(), at: Date.now(), ...notice });
			drive.notices = drive.notices.slice(-20);
			writeDrive();
			store.onChange();
		},
		dismissNotice(id) {
			readDrive();
			drive.notices = drive.notices.filter((n) => n.id !== id);
			writeDrive();
			store.onChange();
		},

		// Call for `storage` events: true if the key was one of ours.
		handleStorageKey(key) {
			if (key !== null && key !== INDEX_KEY && key !== DRIVE_KEY && !key.startsWith(DOC_PREFIX)) {
				return false;
			}
			store.refresh();
			return true;
		},

		// Any document Drive has not caught up with, or a queued deletion.
		hasUnsynced(kinds) {
			if (drive.tombstones.length) return true;
			return docs.some((d) => {
				if (d.fileId) return d.dirty || d.metaDirty;
				return !kinds[d.kind]?.isEmpty(d.text);
			});
		},
	});

	load();
	return store;
}

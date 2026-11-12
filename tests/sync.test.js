// The Drive sync engine against a fake Drive shared by several "devices".
// Run with `bun run test`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDocStore, memoryStorage } from '../src/lib/sync/docStore.js';
import { createSyncEngine } from '../src/lib/sync/engine.js';
import { KINDS } from '../src/lib/sync/kinds.js';
import { DriveError, FakeDrive, mulberry32 } from './fakeDrive.js';

let idSeq = 0;

function device(drive, name, storage = memoryStorage()) {
	const client = drive.client();
	const store = createDocStore({ storage, persistDelay: 1, newId: () => `${name}-${++idSeq}` });
	const engine = createSyncEngine({
		drive: client,
		store,
		kinds: KINDS,
		device: name,
		now: () => new Date(2026, 10, 11, 14, 2),
	});
	const dev = {
		name,
		client,
		store,
		storage,
		sync: () => engine.syncOnce(),
		chars: () => store.byKind('character'),
		texts: () =>
			store
				.byKind('character')
				.map((d) => d.text)
				.sort(),
		add: (text) => store.create('character', text),
		edit: (doc, text) => store.edit(doc.id, text),
		// What this device holds, keyed like FakeDrive.contents().
		linked() {
			const out = {};
			for (const d of store.all()) if (d.fileId) out[d.fileId] = d.text;
			return out;
		},
	};
	return dev;
}

// Sync every device in turn until a whole round changes nothing.
async function settle(...devices) {
	for (let round = 0; round < 12; round++) {
		let busy = false;
		for (const d of devices) {
			const r = await d.sync();
			if (r.pushed || r.pulled || r.created || r.removed || r.conflicts || r.unsynced) busy = true;
		}
		if (!busy) return;
	}
	assert.fail('devices did not settle');
}

function assertConverged(drive, ...devices) {
	const remote = drive.contents();
	for (const d of devices) {
		assert.deepEqual(d.linked(), remote, `${d.name} matches Drive`);
		assert.ok(!d.store.hasUnsynced(KINDS), `${d.name} has nothing unsynced`);
	}
}

test('a character made on one device appears on another', async () => {
	const drive = new FakeDrive();
	const a = device(drive, 'A');
	const b = device(drive, 'B');
	a.add('Brunhilda, Fighter 1\nrest');
	await settle(a, b);
	assert.deepEqual(b.texts(), ['Brunhilda, Fighter 1\nrest']);
	assert.equal([...drive.files.values()][0].name, 'Brunhilda.md');
	assertConverged(drive, a, b);
});

test('empty characters are not uploaded', async () => {
	const drive = new FakeDrive();
	const a = device(drive, 'A');
	a.add('');
	a.add('  \n');
	await settle(a);
	assert.equal(drive.files.size, 0);
});

test('two devices editing different characters never conflict', async () => {
	const drive = new FakeDrive();
	const a = device(drive, 'A');
	const b = device(drive, 'B');
	a.add('Ann, Fighter 1');
	a.add('Bob, Thief 1');
	await settle(a, b);
	for (let i = 0; i < 5; i++) {
		a.edit(
			a.chars().find((d) => d.text.startsWith('Ann')),
			`Ann, Fighter 1\nhp ${i}`,
		);
		b.edit(
			b.chars().find((d) => d.text.startsWith('Bob')),
			`Bob, Thief 1\ncoin ${i}`,
		);
		// Each syncs with the other's change already on Drive or about to be.
		await Promise.all([a.sync(), b.sync()]);
	}
	await settle(a, b);
	assert.deepEqual(a.texts(), ['Ann, Fighter 1\nhp 4', 'Bob, Thief 1\ncoin 4']);
	assert.deepEqual(b.texts(), a.texts());
	assert.equal(drive.files.size, 2);
	assert.equal(a.store.drive().notices.length + b.store.drive().notices.length, 0);
	assertConverged(drive, a, b);
});

test('both devices editing one character keeps both versions as separate files', async () => {
	const drive = new FakeDrive();
	const a = device(drive, 'A');
	const b = device(drive, 'B');
	const doc = a.add('Ann, Fighter 1');
	await settle(a, b);
	a.edit(doc, 'Ann, Fighter 1\nfrom A');
	b.edit(b.chars()[0], 'Ann, Fighter 1\nfrom B');
	await a.sync();
	await b.sync(); // B finds Drive changed under its own edits
	await settle(a, b);
	assert.deepEqual(a.texts(), ['Ann, Fighter 1\nfrom A', 'Ann, Fighter 1\nfrom B']);
	assert.deepEqual(b.texts(), a.texts());
	// The original file holds the version that got there first; B's edit is the copy.
	assert.equal(drive.text(doc.fileId), 'Ann, Fighter 1\nfrom A');
	const names = [...drive.files.values()].map((f) => f.name).sort();
	assert.deepEqual(names, ['Ann (conflict 2026-11-11 14.02 B).md', 'Ann.md']);
	// On B, the document that was being edited still holds B's text.
	assert.equal(b.chars()[0].text, 'Ann, Fighter 1\nfrom B');
	assert.equal(b.chars()[0].conflict, 'conflict 2026-11-11 14.02 B');
	assert.equal(b.store.drive().notices.length, 1);
	// A sees the copy flagged too.
	assert.ok(a.chars().some((d) => d.conflict));
	assertConverged(drive, a, b);
});

test('identical edits on both sides are not a conflict', async () => {
	const drive = new FakeDrive();
	const a = device(drive, 'A');
	const b = device(drive, 'B');
	a.add('Ann, Fighter 1');
	await settle(a, b);
	a.edit(a.chars()[0], 'Ann, Fighter 2');
	b.edit(b.chars()[0], 'Ann, Fighter 2');
	await settle(a, b);
	assert.equal(drive.files.size, 1);
	assertConverged(drive, a, b);
});

test('typing during an upload is not marked as synced', async () => {
	const drive = new FakeDrive();
	const a = device(drive, 'A');
	const doc = a.add('Ann, Fighter 1');
	await settle(a);
	a.edit(doc, 'Ann, Fighter 1\none');
	a.client.hook = (op) => {
		if (op === 'write') a.edit(doc, 'Ann, Fighter 1\none two');
	};
	const r = await a.sync();
	a.client.hook = null;
	assert.equal(drive.text(doc.fileId), 'Ann, Fighter 1\none');
	assert.equal(doc.dirty, true);
	assert.equal(r.unsynced, true);
	await settle(a);
	assert.equal(drive.text(doc.fileId), 'Ann, Fighter 1\none two');
	assertConverged(drive, a);
});

test('typing during a download is never overwritten', async () => {
	const drive = new FakeDrive();
	const a = device(drive, 'A');
	const b = device(drive, 'B');
	a.add('Ann, Fighter 1');
	await settle(a, b);
	a.edit(a.chars()[0], 'Ann, Fighter 1\nfrom A');
	await a.sync();
	const doc = b.chars()[0];
	b.client.hook = (op) => {
		if (op === 'read') b.edit(doc, 'Ann, Fighter 1\ntyped on B meanwhile');
	};
	await b.sync();
	b.client.hook = null;
	assert.equal(doc.text, 'Ann, Fighter 1\ntyped on B meanwhile');
	await settle(a, b);
	assert.deepEqual(a.texts(), ['Ann, Fighter 1\nfrom A', 'Ann, Fighter 1\ntyped on B meanwhile']);
	assertConverged(drive, a, b);
});

test('an upload whose reply is lost is recognised, not treated as a conflict', async () => {
	const drive = new FakeDrive();
	const a = device(drive, 'A');
	const doc = a.add('Ann, Fighter 1');
	await settle(a);
	a.edit(doc, 'Ann, Fighter 1\none');
	a.client.loseReply('write');
	await assert.rejects(a.sync());
	assert.equal(drive.text(doc.fileId), 'Ann, Fighter 1\none'); // it did arrive
	a.edit(doc, 'Ann, Fighter 1\none two');
	await settle(a);
	assert.equal(drive.files.size, 1);
	assert.equal(drive.text(doc.fileId), 'Ann, Fighter 1\none two');
	assert.equal(a.store.drive().notices.length, 0);
	assertConverged(drive, a);
});

test('a create whose reply is lost does not make a duplicate', async () => {
	const drive = new FakeDrive();
	const a = device(drive, 'A');
	const doc = a.add('Ann, Fighter 1');
	a.client.loseReply('create');
	await assert.rejects(a.sync());
	assert.equal(drive.files.size, 1);
	a.edit(doc, 'Ann, Fighter 1\nmore');
	await settle(a);
	assert.equal(drive.files.size, 1);
	assert.equal(a.chars().length, 1);
	assertConverged(drive, a);
});

test('a sync abandoned at any request leaves nothing broken', async () => {
	// Fail each request of a busy sync in turn; afterwards everything must
	// still converge with no edit lost.
	for (let failAt = 0; failAt < 40; failAt++) {
		const drive = new FakeDrive();
		const a = device(drive, 'A');
		const b = device(drive, 'B');
		a.add('Ann, Fighter 1');
		a.add('Bob, Thief 1');
		a.add('Cy, Bard 1');
		await settle(a, b);
		a.edit(a.chars()[0], 'Ann, Fighter 1\nA1');
		a.edit(a.chars()[1], 'Bob, Thief 1\nA2');
		a.store.remove(a.chars()[2].id);
		a.add('Dee, Wizard 1');
		b.edit(b.chars()[1], 'Bob, Thief 1\nB2');
		await b.sync();
		let n = 0;
		a.client.hook = () => {
			if (n++ === failAt) throw new TypeError('network down');
		};
		await a.sync().catch(() => {});
		a.client.hook = null;
		await settle(a, b);
		const all = a.texts();
		assert.deepEqual(b.texts(), all, `failAt ${failAt}`);
		for (const t of [
			'Ann, Fighter 1\nA1',
			'Bob, Thief 1\nA2',
			'Bob, Thief 1\nB2',
			'Dee, Wizard 1',
		]) {
			assert.ok(all.includes(t), `failAt ${failAt}: kept "${t}"`);
		}
		assert.ok(!all.some((t) => t.startsWith('Cy')), `failAt ${failAt}: deletion went through`);
		assertConverged(drive, a, b);
	}
});

test('deleting a character deletes it everywhere', async () => {
	const drive = new FakeDrive();
	const a = device(drive, 'A');
	const b = device(drive, 'B');
	a.add('Ann, Fighter 1');
	a.add('Bob, Thief 1');
	await settle(a, b);
	a.store.remove(a.chars()[0].id);
	await settle(a, b);
	assert.deepEqual(b.texts(), ['Bob, Thief 1']);
	assert.equal(Object.keys(drive.contents()).length, 1);
	assertConverged(drive, a, b);
});

test('a character deleted elsewhere but edited here is kept', async () => {
	const drive = new FakeDrive();
	const a = device(drive, 'A');
	const b = device(drive, 'B');
	a.add('Ann, Fighter 1');
	await settle(a, b);
	b.edit(b.chars()[0], 'Ann, Fighter 1\nunsynced work');
	a.store.remove(a.chars()[0].id);
	await a.sync();
	await settle(b, a);
	assert.deepEqual(a.texts(), ['Ann, Fighter 1\nunsynced work']);
	assert.equal(b.store.drive().notices.length, 1);
	assertConverged(drive, a, b);
});

test('a deletion does not destroy edits it has not seen', async () => {
	const drive = new FakeDrive();
	const a = device(drive, 'A');
	const b = device(drive, 'B');
	a.add('Ann, Fighter 1');
	await settle(a, b);
	b.edit(b.chars()[0], 'Ann, Fighter 2');
	await b.sync();
	a.store.remove(a.chars()[0].id); // A still thinks it is level 1
	await settle(a, b);
	assert.deepEqual(a.texts(), ['Ann, Fighter 2']);
	assertConverged(drive, a, b);
});

test('undoing a delete before it syncs keeps the same file', async () => {
	const drive = new FakeDrive();
	const a = device(drive, 'A');
	a.add('Ann, Fighter 1');
	a.add('Bob, Thief 1');
	await settle(a);
	const removed = a.store.remove(a.chars()[0].id);
	a.store.restore(removed, 0);
	await settle(a);
	assert.equal(drive.files.size, 2);
	assert.deepEqual(
		a.chars().map((d) => d.text),
		['Ann, Fighter 1', 'Bob, Thief 1'],
	);
	assertConverged(drive, a);
	// After the deletion has synced, undo brings it back as a new file.
	const again = a.store.remove(a.chars()[0].id);
	await settle(a);
	a.store.restore(again, 0);
	await settle(a);
	assert.deepEqual(a.texts(), ['Ann, Fighter 1', 'Bob, Thief 1']);
	assertConverged(drive, a);
});

test('a file that cannot be found never costs the local copy', async () => {
	const drive = new FakeDrive();
	const a = device(drive, 'A');
	a.add('Ann, Fighter 1');
	a.add('Bob, Thief 1');
	await settle(a);
	// Permanently deleted, access revoked, a different account…
	drive.files.clear();
	await settle(a);
	assert.deepEqual(a.texts(), ['Ann, Fighter 1', 'Bob, Thief 1']);
	assert.equal(drive.files.size, 2);
	assertConverged(drive, a);
});

test('uploads racing each other: the buried version is rescued', async () => {
	const drive = new FakeDrive();
	const a = device(drive, 'A');
	const b = device(drive, 'B');
	const doc = a.add('Ann, Fighter 1');
	await settle(a, b);
	a.edit(doc, 'Ann, Fighter 1\nfrom A');
	b.edit(b.chars()[0], 'Ann, Fighter 1\nfrom B');
	// B's whole upload lands after A has checked the file but before A writes.
	let raced = false;
	a.client.hook = async (op) => {
		if (op === 'write' && !raced) {
			raced = true;
			await b.sync();
		}
	};
	await a.sync();
	a.client.hook = null;
	assert.equal(drive.text(doc.fileId), 'Ann, Fighter 1\nfrom A');
	await settle(a, b);
	assert.deepEqual(a.texts(), ['Ann, Fighter 1\nfrom A', 'Ann, Fighter 1\nfrom B']);
	assert.deepEqual(b.texts(), a.texts());
	assert.equal(a.store.drive().notices.length, 1);
	assertConverged(drive, a, b);
});

test('a stale file listing never rolls a character back', async () => {
	const drive = new FakeDrive();
	const a = device(drive, 'A');
	const b = device(drive, 'B');
	const doc = a.add('Ann, Fighter 1');
	await settle(a, b);
	drive.freezeListing();
	a.edit(doc, 'Ann, Fighter 2');
	await a.sync();
	a.edit(doc, 'Ann, Fighter 3');
	await a.sync();
	await a.sync();
	assert.equal(doc.text, 'Ann, Fighter 3');
	assert.equal(drive.text(doc.fileId), 'Ann, Fighter 3');
	// B edits on top of a listing that still shows the old revision.
	b.edit(b.chars()[0], 'Ann, Fighter 1\nB');
	await b.sync();
	drive.thawListing();
	await settle(a, b);
	assert.deepEqual(a.texts(), ['Ann, Fighter 1\nB', 'Ann, Fighter 3']);
	assertConverged(drive, a, b);
	// New files are not visible in a stale listing either; they must not be
	// taken for deleted.
	drive.freezeListing();
	a.add('Bob, Thief 1');
	await a.sync();
	await a.sync();
	assert.equal(a.chars().length, 3);
	drive.thawListing();
	await settle(a, b);
	assertConverged(drive, a, b);
});

test('first sync on a second device links identical local copies', async () => {
	const drive = new FakeDrive();
	const a = device(drive, 'A');
	const b = device(drive, 'B');
	a.add('Ann, Fighter 1');
	a.add('Bob, Thief 1');
	b.add('Ann, Fighter 1');
	b.add('Only on B, Bard 1');
	await settle(a, b);
	assert.equal(drive.files.size, 3);
	assert.deepEqual(a.texts(), ['Ann, Fighter 1', 'Bob, Thief 1', 'Only on B, Bard 1']);
	assertConverged(drive, a, b);
});

test('renaming a character renames its file', async () => {
	const drive = new FakeDrive();
	const a = device(drive, 'A');
	const doc = a.add('The Fighter, Fighter 1');
	await settle(a);
	a.edit(doc, 'Brunhilda / the Bold, Fighter 1');
	await settle(a);
	assert.equal(drive.files.get(doc.fileId).name, 'Brunhilda the Bold.md');
});

test('marking a conflict resolved clears the label on every device', async () => {
	const drive = new FakeDrive();
	const a = device(drive, 'A');
	const b = device(drive, 'B');
	a.add('Ann, Fighter 1');
	await settle(a, b);
	a.edit(a.chars()[0], 'Ann, Fighter 1\nA');
	b.edit(b.chars()[0], 'Ann, Fighter 1\nB');
	await settle(a, b);
	const copy = a.chars().find((d) => d.conflict);
	a.store.patch(copy.id, { conflict: '', metaDirty: true });
	await settle(a, b);
	assert.ok(!b.chars().some((d) => d.conflict));
	assert.deepEqual(
		[...drive.files.values()].map((f) => f.name),
		['Ann.md', 'Ann.md'],
	);
	assertConverged(drive, a, b);
});

test('trouble with one file does not stop the others syncing', async () => {
	const drive = new FakeDrive();
	const a = device(drive, 'A');
	const ann = a.add('Ann, Fighter 1');
	const bob = a.add('Bob, Thief 1');
	await settle(a);
	a.edit(ann, 'Ann, Fighter 2');
	a.edit(bob, 'Bob, Thief 2');
	a.client.hook = (op, args) => {
		if (op === 'write' && args[0] === ann.fileId) throw new DriveError(403);
	};
	await assert.rejects(a.sync(), /403/); // reported…
	assert.equal(drive.text(bob.fileId), 'Bob, Thief 2'); // …but Bob got through
	assert.equal(ann.dirty, true);
	a.client.reliable();
	await settle(a);
	assertConverged(drive, a);
});

test('an upload check that cannot be made does not block syncing for good', async () => {
	const drive = new FakeDrive();
	const a = device(drive, 'A');
	const ann = a.add('Ann, Fighter 1');
	await settle(a);
	// Drive refuses to list revisions for this file: nothing to be done.
	a.edit(ann, 'Ann, Fighter 2');
	a.client.hook = (op) => {
		if (op === 'revisions') throw new DriveError(403);
	};
	await a.sync();
	assert.equal(ann.verify, null);
	assert.equal(drive.text(ann.fileId), 'Ann, Fighter 2');
	// The connection drops at that point every time: retried, then dropped.
	a.edit(ann, 'Ann, Fighter 3');
	a.client.hook = (op) => {
		if (op === 'revisions') throw new TypeError('network down');
	};
	let failed = 0;
	for (let i = 0; i < 8 && (i === 0 || ann.verify !== null); i++) {
		await a.sync().catch(() => failed++);
	}
	assert.equal(failed, 4);
	assert.equal(ann.verify, null);
	a.client.reliable();
	await settle(a);
	assertConverged(drive, a);
});

// --- user monsters: one file, merged by name ---

const monsters = (...list) => JSON.stringify(list, null, '\t');
const monsterNames = (dev) =>
	JSON.parse(dev.store.byKind('monsters')[0]?.text || '[]')
		.map((m) => m.name)
		.sort();

test('user monsters sync as a single merged file', async () => {
	const drive = new FakeDrive();
	const a = device(drive, 'A');
	const b = device(drive, 'B');
	a.store.create('monsters', monsters({ name: 'Goblin', hp: 3 }));
	b.store.create('monsters', monsters({ name: 'Orc', hp: 6 }));
	// Both create their file in the same instant.
	await Promise.all([a.sync(), b.sync()]);
	await settle(a, b);
	assert.equal(Object.keys(drive.contents()).length, 1);
	assert.deepEqual(monsterNames(a), ['Goblin', 'Orc']);
	assert.deepEqual(monsterNames(b), ['Goblin', 'Orc']);

	const docA = a.store.byKind('monsters')[0];
	const docB = b.store.byKind('monsters')[0];
	a.store.edit(
		docA.id,
		monsters({ name: 'Goblin', hp: 4 }, { name: 'Orc', hp: 6 }, { name: 'Imp', hp: 1 }),
	);
	b.store.edit(docB.id, monsters({ name: 'Goblin', hp: 9 }, { name: 'Orc', hp: 6 }));
	await settle(a, b);
	assert.deepEqual(monsterNames(a), ['Goblin', 'Goblin (conflict)', 'Imp', 'Orc']);
	assert.deepEqual(monsterNames(b), monsterNames(a));
	assert.equal(Object.keys(drive.contents()).length, 1);
	assertConverged(drive, a, b);
});

// --- several tabs of one browser share one storage ---

test('two tabs: an edit in one tab is synced by the other, and nothing typed is lost', async () => {
	const drive = new FakeDrive();
	const storage = memoryStorage();
	const tab1 = device(drive, 'T1', storage);
	const doc1 = tab1.add('Ann, Fighter 1');
	await settle(tab1);
	const tab2 = device(drive, 'T2', storage);
	assert.equal(tab2.chars().length, 1);

	tab1.edit(doc1, 'Ann, Fighter 1\none'); // clean -> dirty: written at once
	tab1.edit(doc1, 'Ann, Fighter 1\none two'); // still waiting on the debounce
	await tab2.sync(); // tab 2 sees it is dirty and uploads what is stored
	assert.equal(drive.text(doc1.fileId), 'Ann, Fighter 1\none');
	tab1.store.refresh(); // tab 1 hears about it
	assert.equal(doc1.text, 'Ann, Fighter 1\none two');
	assert.equal(doc1.dirty, true);
	await settle(tab1, tab2);
	assert.equal(drive.text(doc1.fileId), 'Ann, Fighter 1\none two');
	tab2.store.refresh();
	assert.equal(tab2.chars()[0].text, 'Ann, Fighter 1\none two');
	assert.equal(drive.files.size, 1);
});

test('two tabs: a pull never overwrites what another tab is typing', async () => {
	const drive = new FakeDrive();
	const other = device(drive, 'B');
	const storage = memoryStorage();
	const tab1 = device(drive, 'T1', storage);
	const doc1 = tab1.add('Ann, Fighter 1');
	await settle(tab1, other);
	const tab2 = device(drive, 'T2', storage);
	other.edit(other.chars()[0], 'Ann, Fighter 1\nfrom B');
	await other.sync();
	tab1.edit(doc1, 'Ann, Fighter 1\ntab one'); // the tab that is NOT syncing
	await tab2.sync();
	tab1.store.refresh();
	assert.equal(doc1.text, 'Ann, Fighter 1\ntab one');
	await settle(tab1, tab2, other);
	assert.deepEqual(other.texts(), ['Ann, Fighter 1\nfrom B', 'Ann, Fighter 1\ntab one']);
});

test('two tabs: typing in a tab that has not yet heard of a pull keeps both versions', async () => {
	const drive = new FakeDrive();
	const other = device(drive, 'B');
	const storage = memoryStorage();
	const tab1 = device(drive, 'T1', storage);
	const doc1 = tab1.add('Ann, Fighter 1');
	await settle(tab1, other);
	const tab2 = device(drive, 'T2', storage);
	other.edit(other.chars()[0], 'Ann, Fighter 1\nfrom B');
	await other.sync();
	await tab2.sync(); // pulled into the shared storage; tab 1 has not refreshed
	tab1.edit(doc1, 'Ann, Fighter 1\ntab one'); // typed on top of the old text
	await settle(tab1, tab2, other);
	assert.deepEqual(other.texts(), ['Ann, Fighter 1\nfrom B', 'Ann, Fighter 1\ntab one']);
});

test('two tabs: bookkeeping written by the syncing tab is not undone by the typing tab', async () => {
	const drive = new FakeDrive();
	const storage = memoryStorage();
	const tab1 = device(drive, 'T1', storage);
	const tab2 = device(drive, 'T2', storage);
	const doc1 = tab1.add('Ann, Fighter 1'); // not uploaded yet
	tab1.edit(doc1, 'Ann, Fighter 1\none'); // waiting on the debounce
	await tab2.sync(); // tab 2 creates the file from what is stored
	tab1.edit(doc1, 'Ann, Fighter 1\none two');
	tab1.store.flush(); // before tab 1 has heard about the file
	await settle(tab1, tab2);
	assert.equal(drive.files.size, 1);
	assert.equal(drive.text(doc1.fileId), 'Ann, Fighter 1\none two');
});

test('old single-file data is imported once', () => {
	const storage = memoryStorage();
	storage.setItem('dw-character-slots', JSON.stringify(['Ann, Fighter 1', '', 'Bob, Thief 1']));
	storage.setItem(
		'local-backup-dw-character-slots',
		JSON.stringify(['Bob, Thief 1', 'Cy, Bard 1']),
	);
	storage.setItem('dw-user-monsters', JSON.stringify([{ name: 'Goblin' }]));
	const store = createDocStore({ storage });
	assert.deepEqual(
		store.byKind('character').map((d) => d.text),
		['Ann, Fighter 1', 'Bob, Thief 1', 'Cy, Bard 1'],
	);
	assert.equal(store.byKind('monsters').length, 1);
	// Not again on the next load, even if everything was deleted since.
	for (const d of [...store.all()]) store.remove(d.id);
	assert.equal(createDocStore({ storage }).all().length, 0);
});

// --- randomised interleavings ---

// Devices append uniquely numbered lines to characters and sync at random,
// with their requests interleaved and occasionally failing. Afterwards every
// device must hold exactly what Drive holds, and every line ever typed must
// still be in some document: nothing is ever silently dropped.
async function fuzz(seed, { deletes }) {
	const rand = mulberry32(seed);
	const pickOf = (arr) => arr[Math.floor(rand() * arr.length)];
	const drive = new FakeDrive();
	const devices = ['A', 'B', 'C'].map((n) => device(drive, `${n}${seed}`));
	const typed = [];
	let line = 0;

	function act(dev) {
		const chars = dev.chars();
		const roll = rand();
		if (!chars.length || roll < 0.12) {
			const token = `<${++line}>`;
			typed.push(token);
			dev.add(`Hero ${line}, Fighter 1\n${token}`);
		} else if (deletes && roll < 0.2) {
			dev.store.remove(pickOf(chars).id);
		} else {
			const doc = pickOf(chars);
			const token = `<${++line}>`;
			typed.push(token);
			dev.edit(doc, `${doc.text}\n${token}`);
		}
	}

	for (const dev of devices) {
		dev.client.hook = async () => {
			// Let other devices' requests run in between, type mid-request,
			// and sometimes drop the connection.
			for (let i = Math.floor(rand() * 4); i > 0; i--) await Promise.resolve();
			if (rand() < 0.15) act(dev);
			if (rand() < 0.04) throw new TypeError('network down');
		};
	}

	for (let step = 0; step < 60; step++) {
		for (const dev of devices) if (rand() < 0.6) act(dev);
		if (rand() < 0.1) pickOf(devices).client.loseReply(pickOf(['write', 'create']));
		const syncing = devices.filter(() => rand() < 0.7);
		await Promise.all(syncing.map((d) => d.sync().catch(() => {})));
	}

	for (const dev of devices) dev.client.reliable();
	await settle(...devices);
	assertConverged(drive, ...devices);
	if (!deletes) {
		const everything = Object.values(drive.contents()).join('\n');
		for (const token of typed) assert.ok(everything.includes(token), `seed ${seed}: lost ${token}`);
	}
}

// FUZZ_SEEDS=5000 runs a longer soak.
const SEEDS = +(process.env.FUZZ_SEEDS || 150);

test('random edits and syncs across three devices converge without losing a line', async () => {
	for (let seed = 1; seed <= SEEDS; seed++) await fuzz(seed, { deletes: false });
});

test('random edits, deletions and syncs across three devices converge', async () => {
	for (let seed = 1; seed <= SEEDS; seed++) await fuzz(100000 + seed, { deletes: true });
});

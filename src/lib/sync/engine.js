// Reconciles the browser's documents (docStore.js) with their Drive files.
//
// Every document is one file and is synced on its own, so two computers
// editing different characters never touch the same file. For each file we
// remember the Drive revision our text was last in sync with (`rev`) and
// whether we have edited since (`dirty`):
//
//   Drive unchanged, we edited     -> upload
//   Drive changed,  we did not     -> download
//   both changed                   -> keep both: Drive's version stays in the
//                                     file, ours goes to a new "conflict" file
//   file trashed,   we did not     -> delete here
//   file trashed,   we edited      -> upload again as a new file
//   file missing or out of reach   -> upload again as a new file
//
// Only a file that is visibly in Drive's trash deletes anything here. A file
// we simply cannot find (permanently deleted, access revoked, different
// account) never costs the local copy.
//
// Two rules keep this from ever losing an edit:
//   1. Local text is only replaced when it has no unsynced edits, checked
//      against the stored state at that instant, never a value read before an
//      await.
//   2. An upload only marks the document clean if the text is still what was
//      sent.
//
// Drive has no conditional write, so an upload can still race another
// device's. After each upload the revision list is checked, and a revision
// that slipped in between is rescued into its own conflict file.
//
// syncOnce() can fail or be abandoned at any await; whatever state it leaves
// is picked up correctly by the next run.
//
// `drive` (see google/drive.js; tests use a fake):
//   list()                      -> [{ id, name, rev, kind, docId, conflict, createdTime }]
//                                  every file of ours not in the trash; may lag
//   stat(fileId)                -> same shape plus `trashed`, or null if there
//                                  is no such file; always current
//   read(fileId, rev)           -> { text, rev }
//   create({ name, text, mime, kind, docId, conflict }) -> { id, rev }
//   write(fileId, text, mime)   -> { rev }
//   setMeta(fileId, { name, conflict })
//   trash(fileId)
//   revisions(fileId)           -> [rev], oldest first
//   readRevision(fileId, rev)   -> text

import { fileName } from './kinds.js';

// cyrb53: enough to recognise our own upload coming back.
function digest(str) {
	let h1 = 0xdeadbeef;
	let h2 = 0x41c6ce57;
	for (let i = 0; i < str.length; i++) {
		const ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	return `${str.length}:${(4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)}`;
}

// An error that is about the connection or the account rather than one file:
// no point carrying on with the other documents.
function affectsEverything(err) {
	if (!err || typeof err.status !== 'number') return true; // the request itself failed
	if (err.status === 401 || err.status === 429 || err.status >= 500) return true;
	return err.status === 403 && /rateLimit|quota/i.test(err.reason || '');
}

export function createSyncEngine({ drive, store, kinds, device = '', now = () => new Date() }) {
	const pad = (n) => String(n).padStart(2, '0');

	function conflictLabel() {
		const d = now();
		const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}.${pad(d.getMinutes())}`;
		return `conflict ${stamp}${device ? ` ${device}` : ''}`.slice(0, 80);
	}

	const title = (doc) => kinds[doc.kind].title(doc.text);

	// Both sides changed. The file keeps Drive's version, which shows up as a
	// document of its own; ours becomes a conflict copy, uploaded as a new file
	// by the create pass. The document being edited keeps its identity (and
	// its tab, and whatever is being typed into it).
	function fork(id, file, remote) {
		const d = store.fresh(id);
		if (!d) return;
		const label = conflictLabel();
		// Unlink first: if we die between the two writes, the file is simply
		// pulled again as an unknown one.
		store.patch(id, {
			fileId: null,
			rev: null,
			dirty: true,
			sent: null,
			verify: null,
			conflict: label,
		});
		store.insert(
			{
				id: store.newId(),
				kind: d.kind,
				text: remote.text,
				fileId: file.id,
				rev: remote.rev,
				conflict: file.conflict || '',
			},
			id,
		);
		store.addNotice({
			type: 'conflict',
			docId: id,
			message: `“${title(d)}” was changed on another device while you were editing it here. Both versions were kept: yours is the one marked “${label}”.`,
		});
	}

	// After an upload: did somebody else's revision land between the one we
	// built on and ours? If so we have just buried it; dig it out into a
	// conflict copy. What to check is recorded on the document (`verify`)
	// together with the upload itself, so a check that could not be made is
	// made by a later run instead of being forgotten.
	async function verifyUpload(id, file, stats) {
		const d = store.fresh(id);
		if (!d?.verify || d.fileId !== file.id) return;
		const { base, rev, tries = 0 } = d.verify;
		let lost = null;
		try {
			const revs = await drive.revisions(file.id);
			const mine = revs.indexOf(rev);
			const from = revs.indexOf(base);
			if (mine > 0 && from >= 0 && mine - from > 1) {
				lost = await drive.readRevision(file.id, revs[mine - 1]);
				if (lost === (await drive.readRevision(file.id, rev))) lost = null;
			}
		} catch (err) {
			// Try again next time — but a check that can never be made (the
			// revisions are not readable) must not hold up syncing for good.
			const giveUp = !affectsEverything(err) || tries >= 4;
			if (store.fresh(id)) {
				store.patch(id, { verify: giveUp ? null : { base, rev, tries: tries + 1 } });
			}
			if (giveUp) return;
			throw err;
		}
		const cur = store.fresh(id);
		if (!cur) return;
		if (lost !== null) {
			const label = conflictLabel();
			store.insert(
				{ id: store.newId(), kind: cur.kind, text: lost, dirty: true, conflict: label },
				id,
			);
			store.addNotice({
				type: 'conflict',
				docId: id,
				message: `“${title(cur)}” was saved from two devices at the same moment. The other device's version was kept as “${label}”.`,
			});
			stats.conflicts++;
		}
		store.patch(id, { verify: null });
	}

	// Which revision after `base`, if any, holds the text with this digest?
	async function findOurUpload(fileId, base, sent) {
		const revs = await drive.revisions(fileId);
		const from = revs.indexOf(base);
		const candidates = (from >= 0 ? revs.slice(from + 1) : revs).slice(-20);
		for (const rev of candidates) {
			if (digest(await drive.readRevision(fileId, rev)) === sent) return rev;
		}
		return null;
	}

	async function push(id, file, stats) {
		let d = store.fresh(id);
		if (!d || d.fileId !== file.id) return;
		const text = d.text;
		// If the reply never arrives we can still recognise this upload later.
		store.patch(id, { sent: digest(text) });
		const res = await drive.write(file.id, text, kinds[d.kind].mime);
		d = store.fresh(id);
		if (d && d.fileId === file.id) {
			store.patch(id, {
				rev: res.rev,
				dirty: d.text !== text,
				sent: null,
				verify: { base: file.rev, rev: res.rev },
			});
		}
		stats.pushed++;
		file.rev = res.rev;
	}

	// The file's name follows the document's first line, and its conflict
	// label can be cleared from either side.
	async function syncMeta(id, file) {
		let d = store.fresh(id);
		if (!d || d.fileId !== file.id) return;
		if (!d.metaDirty && (file.conflict || '') !== d.conflict) {
			d = store.patch(id, { conflict: file.conflict || '' });
		}
		const name = fileName(d, kinds);
		if (d.metaDirty || name !== file.name) {
			await drive.setMeta(file.id, { name, conflict: d.conflict });
			if (store.fresh(id)) store.patch(id, { metaDirty: false });
		}
	}

	async function syncLinked(id, listed, stats) {
		let d = store.fresh(id);
		if (!d || d.fileId !== listed.id) return;
		const kind = kinds[d.kind];
		if (listed.rev === d.rev && !d.dirty && !d.verify) {
			await syncMeta(id, listed);
			return;
		}
		// About to change something. A listing can lag behind Drive, so act
		// on the file's current state, asked for directly.
		let file = await drive.stat(listed.id);
		if (!file || file.trashed) {
			remoteGone(id, file, stats);
			return;
		}
		// An earlier upload may still be waiting for its check.
		await verifyUpload(id, file, stats);
		d = store.fresh(id);
		if (!d || d.fileId !== file.id) return;
		if (file.rev !== d.rev) {
			const remote = await drive.read(file.id, file.rev);
			d = store.fresh(id);
			if (!d || d.fileId !== file.id) return;
			if (d.sent && remote.rev !== d.rev) {
				// An upload of ours got no reply. If it did arrive, that
				// revision — not the one before it — is what our text is
				// based on, and it still needs the check it never had.
				const landed =
					d.sent === digest(remote.text) ? remote.rev : await findOurUpload(file.id, d.rev, d.sent);
				d = store.fresh(id);
				if (!d || d.fileId !== file.id) return;
				store.patch(
					id,
					landed
						? {
								rev: landed,
								dirty: digest(d.text) !== d.sent,
								sent: null,
								verify: { base: d.rev, rev: landed },
							}
						: { sent: null },
				);
				await verifyUpload(id, file, stats);
				d = store.fresh(id);
				if (!d || d.fileId !== file.id) return;
			}
			if (remote.rev === d.rev) {
				// Nothing newer than what we have (a stale listing, or the
				// change was our own upload).
			} else if (!d.dirty || d.text === remote.text) {
				store.patch(id, { text: remote.text, rev: remote.rev, dirty: false, sent: null });
				stats.pulled++;
			} else if (kind.merge) {
				const merged = kind.merge(d.text, remote.text);
				store.patch(id, {
					text: merged,
					rev: remote.rev,
					dirty: merged !== remote.text,
					sent: null,
				});
				stats.pulled++;
			} else {
				fork(id, file, remote);
				stats.conflicts++;
				return;
			}
			file = { ...file, rev: remote.rev };
		}
		await verifyUpload(id, file, stats);
		d = store.fresh(id);
		if (d?.dirty) {
			await push(id, file, stats);
			await verifyUpload(id, file, stats);
		}
		await syncMeta(id, file);
	}

	// A document whose file is gone. `file` is what stat() said: in the trash
	// (deleted on another device), or null (nowhere to be found).
	function remoteGone(id, file, stats) {
		const d = store.fresh(id);
		if (!d) return;
		const kind = kinds[d.kind];
		if (file?.trashed && !d.dirty && !kind.singleton) {
			store.remove(id, { tombstone: false });
			stats.removed++;
			return;
		}
		// Keep it and upload it again as a new file.
		store.patch(id, { fileId: null, rev: null, dirty: true, sent: null, verify: null });
		if (file?.trashed && !kind.singleton) {
			store.addNotice({
				type: 'restored',
				docId: id,
				message: `“${title(d)}” was deleted on another device, but had changes here that were never synced. It was kept and uploaded again.`,
			});
		}
	}

	// At most one file may exist for a singleton kind. Two devices creating it
	// at the same moment leave two; everyone agrees on the oldest and folds
	// the others into it.
	async function settleSingleton(kindName, remote, byId) {
		const kind = kinds[kindName];
		const files = remote
			.filter((f) => f.kind === kindName && byId.has(f.id))
			.sort((a, b) =>
				a.createdTime < b.createdTime
					? -1
					: a.createdTime > b.createdTime
						? 1
						: a.id < b.id
							? -1
							: 1,
			);
		if (!files.length) return;
		const [keep, ...extras] = files;
		const locals = store.all().filter((d) => d.kind === kindName);
		let local = locals.find((d) => d.fileId === keep.id) || locals[0];

		if (!local) {
			const r = await drive.read(keep.id, keep.rev);
			local = store.insert({
				id: store.newId(),
				kind: kindName,
				text: r.text,
				fileId: keep.id,
				rev: r.rev,
			});
		} else if (local.fileId !== keep.id) {
			const r = await drive.read(keep.id, keep.rev);
			const d = store.fresh(local.id);
			if (!d) return;
			const merged = kind.merge(d.text, r.text);
			store.patch(d.id, {
				fileId: keep.id,
				rev: r.rev,
				text: merged,
				dirty: merged !== r.text,
				sent: null,
			});
		}
		// Fold in other local documents of this kind (two tabs each made one).
		for (const other of locals) {
			if (other.id === local.id) continue;
			const d = store.fresh(local.id);
			const o = store.fresh(other.id);
			if (!d || !o) continue;
			const merged = kind.merge(o.text, d.text);
			if (merged !== d.text) store.patch(d.id, { text: merged, dirty: true });
			store.remove(o.id, { tombstone: false });
		}
		for (const extra of extras) {
			const r = await drive.read(extra.id, extra.rev);
			const d = store.fresh(local.id);
			if (!d) return;
			const merged = kind.merge(r.text, d.text);
			if (merged !== d.text) store.patch(d.id, { text: merged, dirty: true });
			await drive.trash(extra.id);
			byId.delete(extra.id);
		}
	}

	// A file with no document here: made on another device — or by us, in a
	// request whose reply never arrived.
	async function pullUnknown(file, stats) {
		const r = await drive.read(file.id, file.rev);
		if (store.all().some((d) => d.fileId === file.id)) return;
		const label = file.conflict || '';
		const unlinked = store
			.all()
			.filter((d) => !d.fileId && d.kind === file.kind && d.conflict === label);
		// Is this one of ours? Either an upload whose reply never arrived (the
		// file still holds exactly what we sent, though we may have typed more
		// since), or — first sync on a second device — a local copy of exactly
		// this text. A file of ours that somebody else has since changed is
		// not adopted: both versions are kept.
		const sentIt = (d) => d.id === file.docId && d.sent === digest(r.text);
		const match = unlinked.find(sentIt) || unlinked.find((d) => d.text === r.text);
		const d = match && store.fresh(match.id);
		if (d && !d.fileId && (d.text === r.text || sentIt(d))) {
			store.patch(d.id, { fileId: file.id, rev: r.rev, dirty: d.text !== r.text, sent: null });
			return;
		}
		store.insert({
			id: file.docId && !store.get(file.docId) ? file.docId : store.newId(),
			kind: file.kind,
			text: r.text,
			fileId: file.id,
			rev: r.rev,
			conflict: label,
		});
		stats.pulled++;
	}

	// A document with no file yet.
	async function createFile(id, stats) {
		let d = store.fresh(id);
		if (!d || d.fileId) return;
		const kind = kinds[d.kind];
		if (kind.isEmpty(d.text)) return;
		const text = d.text;
		// If the reply never arrives we can still recognise the file.
		store.patch(id, { sent: digest(text) });
		const res = await drive.create({
			name: fileName(d, kinds),
			text,
			mime: kind.mime,
			kind: d.kind,
			docId: d.id,
			conflict: d.conflict,
		});
		d = store.fresh(id);
		if (!d || d.fileId) {
			// Deleted, or linked by another tab, while we were uploading.
			store.addTombstone(res.id, res.rev);
			return;
		}
		store.patch(id, { fileId: res.id, rev: res.rev, dirty: d.text !== text, sent: null });
		stats.created++;
	}

	async function syncOnce() {
		const stats = { pushed: 0, pulled: 0, created: 0, removed: 0, conflicts: 0 };
		// Trouble with one file must not stop the others syncing: it is noted,
		// the rest carry on, and it is reported at the end.
		const failures = [];
		const each = async (fn) => {
			try {
				await fn();
			} catch (err) {
				if (affectsEverything(err)) throw err;
				failures.push(err);
			}
		};

		store.flush();
		store.refresh();
		const remote = await drive.list();
		const byId = new Map(remote.map((f) => [f.id, f]));

		// 1. Deletions made here. A file somebody has changed since we last saw
		//    it is left alone, and comes back as a document below.
		for (const t of [...store.tombstones()]) {
			await each(async () => {
				const file = await drive.stat(t.fileId);
				if (file && !file.trashed && (!t.rev || file.rev === t.rev)) {
					await drive.trash(t.fileId);
					byId.delete(t.fileId);
				}
				store.clearTombstone(t.fileId);
			});
		}

		for (const [name, kind] of Object.entries(kinds)) {
			if (kind.singleton) await each(() => settleSingleton(name, remote, byId));
		}

		// 2. Documents that have a file.
		const claimed = new Set();
		for (const { id } of [...store.all()]) {
			await each(async () => {
				const d = store.fresh(id);
				if (!d?.fileId) return;
				claimed.add(d.fileId);
				// A listing can lag behind a file created seconds ago; ask
				// about the file directly before believing it is gone.
				const file = byId.get(d.fileId) || (await drive.stat(d.fileId));
				if (!file || file.trashed) remoteGone(id, file, stats);
				else await syncLinked(id, file, stats);
			});
		}

		// 3. Files we have no document for.
		for (const file of remote) {
			if (claimed.has(file.id) || !byId.has(file.id)) continue;
			const kind = kinds[file.kind];
			if (!kind || kind.singleton) continue;
			await each(() => pullUnknown(file, stats));
		}

		// 4. Documents that have no file yet.
		for (const { id } of [...store.all()]) {
			await each(() => createFile(id, stats));
		}

		if (failures.length) throw failures[0];
		return { ...stats, unsynced: store.hasUnsynced(kinds) };
	}

	return { syncOnce };
}

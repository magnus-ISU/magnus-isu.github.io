// An in-memory Google Drive, with enough of its behaviour to exercise the sync
// engine: revisions, trash, listings that can lag, and requests that fail or
// lose their reply. Several "devices" share one FakeDrive; each gets its own
// client so a test can interfere with one device's requests only.

export class DriveError extends Error {
	constructor(status, message = `Drive API ${status}`) {
		super(message);
		this.status = status;
	}
}

export function mulberry32(seed) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export class FakeDrive {
	constructor() {
		this.files = new Map();
		this.seq = 0;
		this.clock = 0;
		this.staleListing = null; // when set, list() answers from this snapshot
	}

	snapshot(f) {
		return {
			id: f.id,
			name: f.name,
			rev: f.revisions[f.revisions.length - 1].rev,
			kind: f.kind,
			docId: f.docId,
			conflict: f.conflict,
			createdTime: f.createdTime,
			trashed: f.trashed,
		};
	}

	listing() {
		return [...this.files.values()].filter((f) => !f.trashed).map((f) => this.snapshot(f));
	}

	// Freeze what list() returns, as if Drive's index had stopped updating.
	freezeListing() {
		this.staleListing = this.listing();
	}

	thawListing() {
		this.staleListing = null;
	}

	text(fileId) {
		const f = this.files.get(fileId);
		return f.revisions[f.revisions.length - 1].text;
	}

	// Live files as { name: text }, for comparing against a device.
	contents() {
		const out = {};
		for (const f of this.files.values()) {
			if (!f.trashed) out[f.id] = this.text(f.id);
		}
		return out;
	}

	// A client for one device.
	//   hook(op, args)  awaited before each request; may throw, or edit things
	//   loseReply(op)   the next `op` takes effect but its reply never arrives
	client() {
		const drive = this;
		const lose = new Set();
		const c = {
			hook: null,
			calls: [],
			loseReply: (op) => void lose.add(op),
			// Back to a working connection.
			reliable() {
				lose.clear();
				c.hook = null;
			},
		};
		const need = (id) => {
			const f = drive.files.get(id);
			if (!f) throw new DriveError(404);
			return f;
		};
		const ops = {
			list() {
				return (drive.staleListing || drive.listing()).map((f) => ({ ...f }));
			},
			stat(fileId) {
				const f = drive.files.get(fileId);
				return f ? drive.snapshot(f) : null;
			},
			read(fileId, rev) {
				const f = need(fileId);
				const r = f.revisions.find((x) => x.rev === rev) || f.revisions[f.revisions.length - 1];
				return { text: r.text, rev: r.rev };
			},
			create({ name, text, kind, docId, conflict }) {
				const id = `f${++drive.seq}`;
				const rev = `r${++drive.seq}`;
				drive.files.set(id, {
					id,
					name,
					kind,
					docId,
					conflict: conflict || '',
					createdTime: String(++drive.clock).padStart(8, '0'),
					trashed: false,
					revisions: [{ rev, text }],
				});
				return { id, rev };
			},
			write(fileId, text) {
				const f = need(fileId);
				const rev = `r${++drive.seq}`;
				f.revisions.push({ rev, text });
				return { rev };
			},
			setMeta(fileId, { name, conflict }) {
				const f = need(fileId);
				if (name !== undefined) f.name = name;
				if (conflict !== undefined) f.conflict = conflict;
			},
			trash(fileId) {
				const f = drive.files.get(fileId);
				if (f) f.trashed = true;
			},
			revisions(fileId) {
				return need(fileId).revisions.map((r) => r.rev);
			},
			readRevision(fileId, rev) {
				const r = need(fileId).revisions.find((x) => x.rev === rev);
				if (!r) throw new DriveError(404);
				return r.text;
			},
		};
		for (const [op, fn] of Object.entries(ops)) {
			c[op] = async (...args) => {
				c.calls.push(op);
				if (c.hook) await c.hook(op, args);
				const result = fn(...args);
				if (lose.delete(op)) throw new TypeError('network: reply lost');
				return result;
			};
		}
		return c;
	}
}

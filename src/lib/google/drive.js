// Google Drive, as the sync engine wants to see it (the interface is described
// at the top of sync/engine.js).
//
// Every file this app creates is tagged with appProperties, which only this
// app can see, and is found again by that tag — not by name or folder, so
// duplicates of either can never send two devices to different files. The
// folder is only there to keep the user's Drive tidy.

const API = 'https://www.googleapis.com';
const APP = 'dungeon-world';
const FOLDER_NAME = 'Dungeon World';
const FILE_FIELDS =
	'id,name,headRevisionId,md5Checksum,modifiedTime,createdTime,trashed,appProperties';

export class DriveError extends Error {
	constructor(status, body = '') {
		let reason = '';
		try {
			reason = JSON.parse(body).error?.errors?.[0]?.reason || '';
		} catch {
			/* not JSON */
		}
		super(`Drive API ${status}${reason ? ` (${reason})` : ''}`);
		this.status = status;
		this.reason = reason;
	}
}

// A file's revision token. Drive gives uploaded files a head revision id; the
// fallback only exists so that a file without one still compares correctly.
function revOf(f) {
	return f.headRevisionId || `${f.md5Checksum || ''}@${f.modifiedTime || ''}`;
}

function describe(f) {
	const p = f.appProperties || {};
	return {
		id: f.id,
		name: f.name,
		rev: revOf(f),
		kind: p.dwKind || '',
		docId: p.dwDoc || '',
		conflict: p.dwConflict || '',
		createdTime: f.createdTime || '',
		trashed: !!f.trashed,
	};
}

// getToken() returns a currently valid access token, or null.
export function createDrive(getToken) {
	let folderPromise = null;

	async function request(url, opts = {}) {
		const token = getToken();
		if (!token) throw new DriveError(401);
		const res = await fetch(url, {
			...opts,
			headers: { Authorization: `Bearer ${token}`, ...opts.headers },
		});
		if (!res.ok) throw new DriveError(res.status, await res.text().catch(() => ''));
		return res;
	}

	const json = async (url, opts) => (await request(url, opts)).json();

	const patchMeta = (fileId, body, fields = 'id') =>
		json(`${API}/drive/v3/files/${fileId}?fields=${fields}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});

	async function listAll(q, extra = '') {
		const files = [];
		let pageToken = '';
		do {
			const url =
				`${API}/drive/v3/files?q=${encodeURIComponent(q)}&spaces=drive&pageSize=1000` +
				`&fields=${encodeURIComponent(`nextPageToken,files(${FILE_FIELDS})`)}${extra}` +
				(pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '');
			const data = await json(url);
			files.push(...(data.files || []));
			pageToken = data.nextPageToken || '';
		} while (pageToken);
		return files;
	}

	const tagged = `appProperties has { key='dwApp' and value='${APP}' } and trashed=false`;

	// The oldest folder of ours, so that two devices which each created one
	// still agree. Looked up once per page load.
	function folder() {
		folderPromise ||= (async () => {
			const found = await listAll(
				`${tagged} and mimeType='application/vnd.google-apps.folder'`,
				'&orderBy=createdTime',
			);
			if (found.length) return found[0].id;
			const made = await json(`${API}/drive/v3/files?fields=id`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: FOLDER_NAME,
					mimeType: 'application/vnd.google-apps.folder',
					appProperties: { dwApp: APP, dwKind: 'folder' },
				}),
			});
			return made.id;
		})().catch((err) => {
			folderPromise = null;
			throw err;
		});
		return folderPromise;
	}

	async function stat(fileId) {
		try {
			return describe(await json(`${API}/drive/v3/files/${fileId}?fields=${FILE_FIELDS}`));
		} catch (err) {
			if (err.status === 404) return null;
			throw err;
		}
	}

	const media = async (url) => (await request(url)).text();

	return {
		async list() {
			const files = await listAll(`${tagged} and mimeType!='application/vnd.google-apps.folder'`);
			return files.map(describe);
		},

		stat,

		// The text of exactly revision `rev`, so text and revision can never
		// be mismatched by a write landing between two requests.
		async read(fileId, rev) {
			if (rev && !rev.includes('@')) {
				try {
					return {
						text: await media(`${API}/drive/v3/files/${fileId}/revisions/${rev}?alt=media`),
						rev,
					};
				} catch (err) {
					if (err.status === 401) throw err;
					// Fall through to reading the head.
				}
			}
			// No usable revision id: read the head, and make sure it did not
			// change while we were reading.
			for (let attempt = 0; ; attempt++) {
				const before = await stat(fileId);
				if (!before) throw new DriveError(404);
				const text = await media(`${API}/drive/v3/files/${fileId}?alt=media`);
				const after = await stat(fileId);
				if (after && after.rev === before.rev) return { text, rev: before.rev };
				if (attempt >= 3) throw new DriveError(409);
			}
		},

		async create({ name, text, mime, kind, docId, conflict }) {
			const metadata = {
				name,
				mimeType: mime,
				parents: [await folder()],
				appProperties: { dwApp: APP, dwKind: kind, dwDoc: docId, dwConflict: conflict || '' },
			};
			const boundary = `dw-${Math.random().toString(36).slice(2)}`;
			const body =
				`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
				`${JSON.stringify(metadata)}\r\n` +
				`--${boundary}\r\nContent-Type: ${mime}; charset=UTF-8\r\n\r\n` +
				`${text}\r\n--${boundary}--\r\n`;
			let f;
			try {
				f = await json(`${API}/upload/drive/v3/files?uploadType=multipart&fields=${FILE_FIELDS}`, {
					method: 'POST',
					headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
					body,
				});
			} catch (err) {
				// The folder was deleted since we looked: find or make another
				// on the next attempt.
				if (err.status === 404) folderPromise = null;
				throw err;
			}
			return { id: f.id, rev: revOf(f) };
		},

		async write(fileId, text, mime) {
			const f = await json(
				`${API}/upload/drive/v3/files/${fileId}?uploadType=media&fields=${FILE_FIELDS}`,
				{
					method: 'PATCH',
					headers: { 'Content-Type': `${mime}; charset=UTF-8` },
					body: text,
				},
			);
			return { rev: revOf(f) };
		},

		async setMeta(fileId, { name, conflict }) {
			await patchMeta(fileId, { name, appProperties: { dwConflict: conflict || '' } });
		},

		// To the trash, not gone: Drive keeps it for 30 days, and "in the
		// trash" is how other devices learn the document was deleted.
		async trash(fileId) {
			try {
				await patchMeta(fileId, { trashed: true });
			} catch (err) {
				if (err.status !== 404) throw err;
			}
		},

		async revisions(fileId) {
			const all = [];
			let pageToken = '';
			do {
				const data = await json(
					`${API}/drive/v3/files/${fileId}/revisions?pageSize=1000` +
						`&fields=${encodeURIComponent('nextPageToken,revisions(id,modifiedTime)')}` +
						(pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''),
				);
				all.push(...(data.revisions || []));
				pageToken = data.nextPageToken || '';
			} while (pageToken);
			// Oldest first (the order Drive lists them in; sorting is stable).
			all.sort((a, b) => (a.modifiedTime || '').localeCompare(b.modifiedTime || ''));
			return all.map((r) => r.id);
		},

		readRevision: (fileId, rev) =>
			media(`${API}/drive/v3/files/${fileId}/revisions/${rev}?alt=media`),
	};
}

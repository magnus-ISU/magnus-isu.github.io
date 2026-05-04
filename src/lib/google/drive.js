const API = 'https://www.googleapis.com';

function headers(token) {
	return { Authorization: `Bearer ${token}` };
}

async function jsonFetch(url, token, opts = {}) {
	const res = await fetch(url, { ...opts, headers: { ...headers(token), ...opts.headers } });
	if (!res.ok) {
		const body = await res.text().catch(() => '');
		const err = new Error(`Drive API ${res.status}: ${body}`);
		err.status = res.status;
		throw err;
	}
	return res.json();
}

export async function findOrCreateFolder(token, name) {
	const q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
	const data = await jsonFetch(
		`${API}/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,
		token,
	);
	if (data.files.length > 0) return data.files[0].id;

	return (
		await jsonFetch(`${API}/drive/v3/files?fields=id`, token, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder' }),
		})
	).id;
}

export async function findFile(token, name, folderId) {
	const q = `name='${name}' and '${folderId}' in parents and trashed=false`;
	const data = await jsonFetch(
		`${API}/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,modifiedTime)`,
		token,
	);
	return data.files[0] || null;
}

export async function createFile(token, name, folderId, content) {
	const metadata = { name, parents: [folderId], mimeType: 'application/json' };
	const boundary = '---drive-boundary---';
	const body =
		`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
		JSON.stringify(metadata) +
		`\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n` +
		JSON.stringify(content) +
		`\r\n--${boundary}--\r\n`;

	return (
		await jsonFetch(`${API}/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime`, token, {
			method: 'POST',
			headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
			body,
		})
	);
}

export async function readFile(token, fileId) {
	const res = await fetch(`${API}/drive/v3/files/${fileId}?alt=media`, { headers: headers(token) });
	if (!res.ok) {
		const body = await res.text().catch(() => '');
		const err = new Error(`Drive API ${res.status}: ${body}`);
		err.status = res.status;
		throw err;
	}
	return res.json();
}

export async function updateFile(token, fileId, content) {
	const res = await fetch(`${API}/upload/drive/v3/files/${fileId}?uploadType=media&fields=modifiedTime`, {
		method: 'PATCH',
		headers: { ...headers(token), 'Content-Type': 'application/json' },
		body: JSON.stringify(content),
	});
	if (!res.ok) {
		const body = await res.text().catch(() => '');
		const err = new Error(`Drive API ${res.status}: ${body}`);
		err.status = res.status;
		throw err;
	}
	return res.json();
}

export async function getFileModifiedTime(token, fileId) {
	const data = await jsonFetch(
		`${API}/drive/v3/files/${fileId}?fields=modifiedTime`,
		token,
	);
	return data.modifiedTime;
}

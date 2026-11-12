// The kinds of document that are kept in the browser and synced to Drive, one
// Drive file per document.
//
//   title(text)    base name of the Drive file
//   ext, mime      how the file is stored
//   isEmpty(text)  documents not worth creating a file for
//   singleton      at most one document of this kind exists
//   merge(a, b)    if set, both-sides-changed is resolved by merging instead of
//                  keeping two files

function characterName(text) {
	const line0 = (text.split('\n')[0] || '').trim();
	const comma = line0.indexOf(',');
	return (comma >= 0 ? line0.slice(0, comma) : line0).trim();
}

function safeFileName(name, fallback) {
	// eslint-disable-next-line no-control-regex
	const clean = name
		.replace(/[\x00-\x1f/\\]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 80);
	return clean || fallback;
}

function parseMonsters(text) {
	try {
		const arr = JSON.parse(text || '[]');
		return Array.isArray(arr) ? arr.filter((m) => m && typeof m.name === 'string') : [];
	} catch {
		return [];
	}
}

export function formatMonsters(list) {
	return JSON.stringify(list, null, '\t');
}

// Union by name. A monster both sides have but disagree on is kept twice, the
// local one renamed, so neither edit is lost.
function mergeMonsters(localText, remoteText) {
	const out = parseMonsters(remoteText);
	const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
	const find = (name) => out.find((m) => m.name.toLowerCase() === name.toLowerCase());
	for (const m of parseMonsters(localText)) {
		const theirs = find(m.name);
		if (!theirs) {
			out.push(m);
		} else if (!same(theirs, m)) {
			const renamed = { ...m, name: `${m.name} (conflict)` };
			if (!find(renamed.name)) out.push(renamed);
		}
	}
	return formatMonsters(out);
}

export const KINDS = {
	character: {
		title: (text) => safeFileName(characterName(text), 'Untitled'),
		ext: '.md',
		mime: 'text/markdown',
		isEmpty: (text) => !text.trim(),
		singleton: false,
		merge: null,
	},
	monsters: {
		title: () => 'User Monsters',
		ext: '.json',
		mime: 'application/json',
		isEmpty: (text) => parseMonsters(text).length === 0,
		singleton: true,
		merge: mergeMonsters,
	},
};

export { characterName, parseMonsters };

// Name of a document's Drive file. A conflict copy says so in its name.
export function fileName(doc, kinds = KINDS) {
	const kind = kinds[doc.kind];
	const label = doc.conflict ? ` (${doc.conflict})` : '';
	return `${kind.title(doc.text)}${label}${kind.ext}`;
}

// Compute a human-readable "first difference" between two sync payloads
// (objects mapping storage key → string value), so the conflict modal can show
// the user what actually diverged before they pick a side.
//
// Returns { summary, local, server } or null when the payloads are identical.

const KEY_LABELS = {
	'dw-character-slots': 'Characters',
	'dw-user-monsters': 'User monsters',
	'dw-encounter-text': 'Encounter',
};

const MAX_VALUE_LEN = 300;

function clip(s) {
	if (s == null) return s;
	return s.length > MAX_VALUE_LEN ? `${s.slice(0, MAX_VALUE_LEN)}…` : s;
}

// Same rule the character tabs use: name is the first line up to the comma.
function slotName(text) {
	const line0 = (text ?? '').split('\n')[0]?.trim() || '';
	const comma = line0.indexOf(',');
	return (comma >= 0 ? line0.slice(0, comma) : line0).trim() || 'Untitled';
}

function firstLineDiff(aText, bText) {
	const a = (aText ?? '').split('\n');
	const b = (bText ?? '').split('\n');
	const n = Math.max(a.length, b.length);
	for (let i = 0; i < n; i++) {
		if (a[i] !== b[i]) {
			return {
				line: i + 1,
				local: a[i] == null ? '(line missing)' : clip(a[i]),
				server: b[i] == null ? '(line missing)' : clip(b[i]),
			};
		}
	}
	return null;
}

// The character-slots key holds a JSON array of character sheets. Report a
// differing character list first; otherwise drill into the first character
// whose text differs and report its first differing line.
function characterSlotsDiff(localRaw, serverRaw) {
	let localSlots;
	let serverSlots;
	try {
		localSlots = JSON.parse(localRaw);
		serverSlots = JSON.parse(serverRaw);
	} catch {
		return null;
	}
	if (!Array.isArray(localSlots) || !Array.isArray(serverSlots)) return null;
	const localNames = localSlots.map(slotName);
	const serverNames = serverSlots.map(slotName);
	if (localNames.join('\x00') !== serverNames.join('\x00')) {
		return {
			summary: 'The character lists differ',
			local: localNames.join(', '),
			server: serverNames.join(', '),
		};
	}
	for (let i = 0; i < localSlots.length; i++) {
		if (localSlots[i] === serverSlots[i]) continue;
		const ld = firstLineDiff(localSlots[i], serverSlots[i]);
		if (ld) {
			return {
				summary: `“${localNames[i]}”, line ${ld.line} differs`,
				local: ld.local,
				server: ld.server,
			};
		}
	}
	return null;
}

export function firstDifference(localData, serverData) {
	const keys = [...new Set([...Object.keys(localData), ...Object.keys(serverData)])];
	for (const key of keys) {
		const local = localData[key];
		const server = serverData[key];
		if (local === server) continue;
		const label = KEY_LABELS[key] || key;
		if (local == null) {
			return {
				summary: `${label}: only exists on Drive`,
				local: '(missing)',
				server: clip(server),
			};
		}
		if (server == null) {
			return { summary: `${label}: only exists locally`, local: clip(local), server: '(missing)' };
		}
		if (key === 'dw-character-slots') {
			const diff = characterSlotsDiff(local, server);
			if (diff) return diff;
		}
		const ld = firstLineDiff(local, server);
		if (ld) {
			return { summary: `${label}: line ${ld.line} differs`, local: ld.local, server: ld.server };
		}
		// Values differ but no line does (shouldn't happen) — show both clipped.
		return { summary: `${label} differs`, local: clip(local), server: clip(server) };
	}
	return null;
}

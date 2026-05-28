import { parseMonsterText } from './monsterText.js';

// Parse parenthetical after a monster name:
// (4) → count=4 unnamed, (Boss,) → 1 named "Boss", (2,) → 1 named "2"
// (John, Paul) → 2 named
// (11 Vizzini,) → 1 named "Vizzini" with hp=11
// (2 HP,) → 1 unnamed with hp=2
// (2 #1, 2 #2, 2 #3) → 3 unnamed with hp values
export function parseParen(str) {
	const m = str.match(/^\((.+)\)$/);
	if (!m) return { count: 1, names: [], hps: [] };
	const inner = m[1].trim();
	// Trailing comma with single item → singular named monster
	if (inner.endsWith(',')) {
		const singleName = inner.slice(0, -1).trim();
		if (singleName) {
			const hpMatch = singleName.match(/^(-?\d+)hp\s+(.+)$/);
			if (hpMatch) return { count: 1, names: [hpMatch[2]], hps: [+hpMatch[1]] };
			return { count: 1, names: [singleName], hps: [] };
		}
	}
	// Pure number → count of unnamed
	if (/^\d+$/.test(inner)) return { count: +inner, names: [], hps: [] };
	// Comma-separated entries (possibly with HP prefix)
	const entries = inner
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	const names = [];
	const hps = [];
	let hasHp = false;
	for (const entry of entries) {
		const hpMatch = entry.match(/^(-?\d+)hp\s+(.+)$/);
		if (hpMatch) {
			hps.push(+hpMatch[1]);
			names.push(hpMatch[2]);
			hasHp = true;
		} else {
			hps.push(null);
			names.push(entry);
		}
	}
	return { count: names.length, names, hps: hasHp ? hps : [] };
}

function parseInlineMonster(raw) {
	return { ...parseMonsterText(raw), count: 1, memberNames: [], custom: true };
}

// Greedy name matching — turns encounter text into a list of monster instances.
// `knownMonsters` is an array of monster definition objects ({ name, ... }).
export function parseEncounter(text, knownMonsters) {
	if (!text.trim()) return { matched: [], unmatched: '' };
	const maxWords = Math.max(...knownMonsters.map((m) => m.name.split(/\s+/).length), 1);
	const nameMap = new Map(knownMonsters.map((m) => [m.name.toLowerCase(), m]));
	const results = [];
	const missed = [];
	const lines = text.split('\n');
	let i = 0;
	while (i < lines.length) {
		const trimmed = lines[i].trim();
		if (!trimmed) {
			i++;
			continue;
		}

		// Inline monster block
		if (trimmed === '{') {
			i++;
			const block = [];
			while (i < lines.length && !lines[i].trim().startsWith('}')) {
				block.push(lines[i]);
				i++;
			}
			let closingParen = null;
			if (i < lines.length) {
				const closeMatch = lines[i].trim().match(/^\}\s*(\(.*\))?\s*$/);
				if (closeMatch?.[1]) closingParen = closeMatch[1];
				i++; // skip }
			}
			const m = parseInlineMonster(block.join('\n'));
			if (closingParen) {
				const { count, names, hps } = parseParen(closingParen);
				m.count = count;
				m.memberNames = names;
				if (hps.length) m.memberHps = hps;
			}
			if (m.name !== 'Unnamed') results.push(m);
			continue;
		}

		// Split on commas that are NOT inside parentheses
		const mentions = [];
		let depth = 0,
			current = '';
		for (const ch of trimmed) {
			if (ch === '(') depth++;
			else if (ch === ')') depth = Math.max(0, depth - 1);
			if (ch === ',' && depth === 0) {
				mentions.push(current.trim());
				current = '';
			} else {
				current += ch;
			}
		}
		if (current.trim()) mentions.push(current.trim());

		for (const mention of mentions) {
			// Extract optional parenthetical at end
			const parenMatch = mention.match(/^(.+?)\s*(\([^)]*\))\s*$/);
			const basePart = parenMatch ? parenMatch[1].trim() : mention;
			const parenPart = parenMatch ? parenMatch[2] : null;

			// Try greedy match on basePart
			let words = basePart.split(/\s+/).filter(Boolean);
			const mentionUnmatched = [];

			while (words.length > 0) {
				let found = false;
				for (let len = Math.min(words.length, maxWords); len > 0; len--) {
					const candidate = words.slice(0, len).join(' ').toLowerCase();
					if (nameMap.has(candidate)) {
						const { count, names, hps } = parenPart
							? parseParen(parenPart)
							: { count: 1, names: [], hps: [] };
						results.push({
							...nameMap.get(candidate),
							count,
							memberNames: names,
							...(hps.length ? { memberHps: hps } : {}),
						});
						words = words.slice(len);
						found = true;
						break;
					}
				}
				if (!found) {
					mentionUnmatched.push(words[0]);
					words = words.slice(1);
				}
			}
			if (mentionUnmatched.length) missed.push(mentionUnmatched.join(' '));
		}
		i++;
	}
	return { matched: results, unmatched: missed.join(' ') };
}

// Build a parenthetical string from labels and optional HP values.
export function buildParen(labels, count, hps) {
	const hasHps = hps?.some((h) => h != null);
	if (hasHps) {
		const parts = labels.map((l, i) => (hps[i] != null ? `${hps[i]}hp ${l}` : l));
		if (count === 1) return `(${parts[0]},)`;
		return `(${parts.join(', ')})`;
	}
	if (count === 1 && labels.length === 1 && labels[0] && labels[0] !== '#1' && labels[0] !== 'HP') {
		return `(${labels[0]},)`;
	}
	if (count > 1) {
		const allDefault = labels.every((l, i) => l === `#${i + 1}`);
		if (allDefault) return `(${count})`;
		return `(${labels.join(', ')})`;
	}
	return '';
}

// Rewrite the parenthetical of a named monster mention within `text`, returning
// the new text. Matches a line whose name (minus any trailing paren) equals
// `monsterName`. Inline {...} blocks are not affected.
export function updateMonsterParen(text, monsterName, newLabels, count, hps) {
	const lines = text.split('\n');
	const lowerName = monsterName.toLowerCase();
	for (let i = 0; i < lines.length; i++) {
		const stripped = lines[i]
			.trim()
			.replace(/\s*\(.*\)\s*$/, '')
			.toLowerCase();
		if (stripped === lowerName) {
			const baseName = lines[i].trim().replace(/\s*\(.*\)\s*$/, '');
			const paren = buildParen(newLabels, count, hps);
			lines[i] = paren ? `${baseName} ${paren}` : baseName;
			return lines.join('\n');
		}
	}
	return text;
}

// Extract monster definitions from inline {...} blocks within a text.
export function parseDefinitions(text) {
	const defs = [];
	const lines = text.split('\n');
	let i = 0;
	while (i < lines.length) {
		if (lines[i].trim() === '{') {
			i++;
			const block = [];
			while (i < lines.length && !lines[i].trim().startsWith('}')) {
				block.push(lines[i]);
				i++;
			}
			if (i < lines.length) i++; // skip }
			const m = parseMonsterText(block.join('\n'));
			if (m.name && m.name !== 'Unnamed') defs.push(m);
		} else {
			i++;
		}
	}
	return defs;
}

// Extract the contents of every ```battle fenced block from a markdown body,
// in document order.
export function extractBattleBlocks(body) {
	const blocks = [];
	const lines = body.split('\n');
	let i = 0;
	while (i < lines.length) {
		if (/^```battle\s*$/i.test(lines[i].trim())) {
			i++;
			const content = [];
			while (i < lines.length && !/^```/.test(lines[i].trim())) {
				content.push(lines[i]);
				i++;
			}
			if (i < lines.length) i++; // skip closing fence
			blocks.push({ text: content.join('\n') });
		} else {
			i++;
		}
	}
	return blocks;
}

// Replace the inner content of the Nth ```battle block in `source` with
// `newText`, returning the new source. No-op if the index is out of range.
export function replaceBattleBlock(source, index, newText) {
	const lines = source.split('\n');
	let blockIdx = -1;
	for (let i = 0; i < lines.length; i++) {
		if (/^```battle\s*$/i.test(lines[i].trim())) {
			blockIdx++;
			if (blockIdx === index) {
				let j = i + 1;
				while (j < lines.length && !/^```/.test(lines[j].trim())) j++;
				const newLines = newText.split('\n');
				lines.splice(i + 1, j - (i + 1), ...newLines);
				return lines.join('\n');
			}
		}
	}
	return source;
}

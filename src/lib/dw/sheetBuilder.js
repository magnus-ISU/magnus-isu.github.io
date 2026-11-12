// Turns a class's markdown (and, for casters, its spell list) into the text of
// a new character sheet.

import { formatHeading, headingBreaks, parseHeading } from './headings.js';

const DEFAULT_STATS = 'STR 2, DEX 1, CON 1, INT 0, WIS 0, CHA -1';

const isBlank = (l) => !l.trim();
// "*A playbook by …*", "*By …*"
const CREDIT_RE = /^\*(?:A playbook )?by\b.*\*$/i;

function trimEnd(lines) {
	const out = lines.slice();
	while (out.length && isBlank(out[out.length - 1])) out.pop();
	return out;
}

// Remove and return a document's closing credit line, if it has one. Left at
// the end it would be the tail of the last move or spell, and travel with it
// when that is picked.
function takeCredit(lines) {
	let i = lines.length - 1;
	while (i >= 0 && isBlank(lines[i])) i--;
	if (i < 0 || !CREDIT_RE.test(lines[i].trim())) return null;
	const credit = lines[i].trim();
	lines.length = i;
	while (lines.length && isBlank(lines[lines.length - 1])) lines.pop();
	return credit;
}

// Join the hard-wrapped lines of each paragraph in sections that break on
// every newline (Gear, Bonds…). SRD text is wrapped at 80 columns, which would
// otherwise turn every wrap into a line break on the sheet.
function unwrapBreakSections(lines) {
	const out = [];
	let unwrapLevel = 0; // level of the auto-break heading we are under, or 0
	let joinable = false; // the previous output line is paragraph text
	for (const line of lines) {
		const h = parseHeading(line);
		if (h) {
			if (unwrapLevel && h.level <= unwrapLevel) unwrapLevel = 0;
			if (headingBreaks(h)) unwrapLevel = h.level;
			out.push(line);
			joinable = false;
			continue;
		}
		const plain = line.trim() && !/^\s*(?:[-*>|]|\d+\.\s|```)/.test(line);
		if (unwrapLevel && plain && joinable) {
			out[out.length - 1] = `${out[out.length - 1].trimEnd()} ${line.trim()}`;
		} else {
			out.push(line);
		}
		// A list item's wrapped continuation joins it too.
		joinable = !!line.trim() && !/^\s*(?:[>|]|```)/.test(line);
	}
	return out;
}

const h2At = (lines, i) => {
	const h = lines[i]?.startsWith('## ') ? parseHeading(lines[i]) : null;
	return h?.level === 2 ? h : null;
};

// Index of the first line at or after `from` that starts a new h1/h2 section.
function nextSection(lines, from) {
	for (let i = from; i < lines.length; i++) {
		if (/^#{1,2}\s/.test(lines[i])) return i;
	}
	return lines.length;
}

// Insert `block` at `at`, with exactly one blank line on either side of it.
function insertBlock(lines, at, block) {
	const before = trimEnd(lines.slice(0, at));
	const after = lines.slice(at);
	while (after.length && isBlank(after[0])) after.shift();
	return [
		...before,
		...(before.length ? [''] : []),
		...trimEnd(block),
		...(after.length ? [''] : []),
		...after,
	];
}

// A spell list page is a series of h2 groups ("Cantrips", "Level 1", …) of h3
// spells. On the sheet the first group — the spells every caster of the class
// has — becomes "## Spells", and all the others become one collapsed
// "## Spell Options" from which a spell is picked into "## Spells". Since the
// groups are flattened, each spell's heading says which one it came from,
// unless it already does.
//
// `heading` renames "Spells" ("Miracles", "Bindings"). With `emptyNote` the
// class knows no spells to begin with: its section holds just that note, and
// the first group is offered with the rest. `collapsed` starts that section
// collapsed.
function spellSections({ raw, heading = 'Spells', emptyNote = '', collapsed = false }) {
	const lines = raw.split('\n');
	const credit = takeCredit(lines);
	const groups = [];
	let group = null;
	let spell = null;
	for (const line of lines) {
		const h = parseHeading(line);
		if (h?.level === 1) {
			group = spell = null;
		} else if (h?.level === 2) {
			group = { name: h.text, intro: [], spells: [] };
			groups.push(group);
			spell = null;
		} else if (h?.level === 3 && group) {
			const tagged = /<span\b/i.test(line) || /\b(?:cantrip|rote|level\s+\d+)\b/i.test(h.text);
			const tag = /\d/.test(group.name) ? group.name : group.name.replace(/s$/, '');
			spell = [
				tagged ? line.trimEnd() : `${line.trimEnd()} <span style="float:right">${tag}</span>`,
			];
			group.spells.push(spell);
		} else if (spell) {
			spell.push(line);
		} else if (group) {
			group.intro.push(line);
		}
	}
	if (!groups.length) return null;
	const known = emptyNote ? { intro: [emptyNote], spells: [] } : groups[0];
	const rest = emptyNote ? groups : groups.slice(1);
	const blocks = (spells) => spells.flatMap((s) => [...trimEnd(s), '']);
	const intro = trimEnd(known.intro).filter(
		(l, i, a) => !(isBlank(l) && (i === 0 || isBlank(a[i - 1]))),
	);
	return {
		spells: [
			formatHeading({ level: 2, text: heading, collapsed }),
			...intro,
			'',
			...blocks(known.spells),
		],
		options: [
			formatHeading({
				level: 2,
				text: 'Spell Options',
				choice: { count: Infinity, dest: heading },
				collapsed: true,
			}),
			...(credit ? [credit] : []),
			'',
			...blocks(rest.flatMap((g) => g.spells)),
		],
	};
}

// Reorder/adjust a class's markdown for use on the character sheet:
// - the "# The Class" title becomes a collapsed h2: the description is there to
//   read once, not to scroll past every session
// - the closing credit moves up under the description
// - "## Gear" moves to the top, right after the description
// - "Advanced Moves" / "Mastery Moves" start collapsed
// - casters get "## Spells" after "## Stats" and a collapsed "## Spell Options"
//   at the end
function transformClassForSheet(raw, { hardWrapped = false, spells: spellList = null } = {}) {
	let lines = raw.split('\n');
	if (hardWrapped) lines = unwrapBreakSections(lines);
	const credit = takeCredit(lines);

	const gearStart = lines.findIndex((_, i) => /^gear\b/i.test(h2At(lines, i)?.text ?? ''));
	let gear = [];
	if (gearStart !== -1)
		gear = lines.splice(gearStart, nextSection(lines, gearStart + 1) - gearStart);
	// The description runs up to the first h2.
	let top = lines.findIndex((l) => /^##\s/.test(l));
	if (top === -1) top = lines.length;
	const moved = [...(credit ? [credit, ''] : []), ...gear];
	if (moved.length) lines = insertBlock(lines, top, moved);

	for (let i = 0; i < lines.length; i++) {
		const h = h2At(lines, i);
		if (h && /^(?:Advanced|Mastery)\s+Moves$/i.test(h.text)) {
			lines[i] = formatHeading({ ...h, collapsed: true });
		}
	}

	const spells = spellList?.raw ? spellSections(spellList) : null;
	if (spells) {
		let at = lines.findIndex((_, i) => /^stats$/i.test(h2At(lines, i)?.text ?? ''));
		if (at !== -1) at = nextSection(lines, at + 1);
		else at = lines.findIndex((_, i) => /^advanced\s+moves$/i.test(h2At(lines, i)?.text ?? ''));
		if (at === -1) at = lines.length;
		lines = insertBlock(lines, at, spells.spells);
		lines = insertBlock(lines, lines.length, spells.options);
	}

	const title = lines.findIndex((l) => /^#\s/.test(l));
	if (title !== -1) {
		lines[title] = formatHeading({ ...parseHeading(lines[title]), level: 2, collapsed: true });
	}

	return lines.join('\n');
}

// opts.hardWrapped: the source wraps paragraphs at a fixed width (the SRD).
// opts.spells: the class's spell list, if it has one:
//   { raw, heading, emptyNote, collapsed }
//   (see spellSections).
// opts.extraDamage: a second damage formula for the header ("2d4").
// opts.stats: the class's suggested stat line ("STR 2, DEX 1, …").
export function buildCharacterSheet(raw, artUrl, opts = {}) {
	// Extract class name from "# The Fighter" → "Fighter"
	const nameMatch = raw.match(/^#\s+(?:The\s+)?(.+)/m);
	const className = nameMatch ? nameMatch[1].trim() : 'Unknown';

	// Extract HP from "HP: X+Constitution" or "Your maximum HP is X+Constitution."
	const hpMatch = raw.match(/HP:\s*(\d+)\s*\+/i) || raw.match(/maximum HP is (\d+)\+/i);
	const baseHp = (hpMatch ? +hpMatch[1] : 0) + 9;

	// Extract Damage from "Damage: dX" or "Your base damage is dX."
	const dmgMatch = raw.match(/Damage:\s*(d\d+)/i) || raw.match(/base damage is (d\d+)/i);
	const damage = [dmgMatch ? dmgMatch[1] : 'd6', opts.extraDamage].filter(Boolean).join(';');

	// Extract Load from "Load: X+STR" or "Your load is X+Str"
	const loadMatch = raw.match(/Load:\s*(\d+)\s*\+/i) || raw.match(/load is (\d+)\+/i);
	const baseLoad = loadMatch ? +loadMatch[1] : 0;

	const stats = opts.stats || DEFAULT_STATS;
	const con = +(stats.match(/CON\s*([+-]?\d+)/i)?.[1] ?? 0);
	const initialMaxHp = baseHp + 3 * con;

	const header = [
		`The ${className}, ${className} 1`,
		`EXP 0, Base HP ${baseHp}, Armor 0, Damage ${damage}, Base Load ${baseLoad}, HP ${initialMaxHp}`,
		stats,
		artUrl || '',
	].join('\n');

	return `${header}\n${transformClassForSheet(raw, opts)}`;
}

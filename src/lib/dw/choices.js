// "Choose one of these" markup.
//
//   [Hand | Close | Reach](?)      inline: the options are in the brackets
//   Choose two: (?2)               on a line: the lines / list items that
//                                  follow, up to a blank line, are the options
//   ## Background (?)              on a heading: its sub-headings are the
//                                  options, or its lines if it has none
//   You start with: (?*)           every option is yours: each click takes one
//   ## Advanced Moves (?>Starting Moves)
//                                  a picked option moves to that section
//
// Picking keeps the option and deletes the markup and the options not taken.
// A picked list item loses its bullet: it is no longer one of a list. Moved to
// another section it keeps it, to be one of the list of what was taken:
//
//   ## Techniques (?>Student of the Blade)
//   - **Burning**  Your attack lights anything flammable.
//
// See headings.js for the marker itself. This module finds the groups in a
// document (the renderer uses that to mark what is clickable) and rewrites the
// text when an option is picked.

import {
	CHOICE_MARKER_SRC,
	formatChoiceMarker,
	formatHeading,
	makeChoice,
	parseHeading,
	splitChoiceMarker,
} from './headings.js';

const INLINE_RE = new RegExp(
	String.raw`(?<!\\)\[((?:[^\[\]\\]|\\.|\[[^\[\]]*\])*)\]${CHOICE_MARKER_SRC}`,
	'g',
);

// Split on unescaped, top-level "|" (brackets like "[1 Weight]" may nest once).
function splitOptions(s) {
	const out = [];
	let cur = '';
	let depth = 0;
	for (let i = 0; i < s.length; i++) {
		const ch = s[i];
		if (ch === '\\' && i + 1 < s.length) {
			cur += ch + s[++i];
		} else if (ch === '|' && depth === 0) {
			out.push(cur);
			cur = '';
		} else {
			if (ch === '[') depth++;
			else if (ch === ']') depth--;
			cur += ch;
		}
	}
	out.push(cur);
	return out.map((o) => o.trim()).filter(Boolean);
}

// Inline choices in one line of source, in order.
export function findInlineChoices(line) {
	if (!line.includes('](?')) return [];
	const found = [];
	for (const m of line.matchAll(INLINE_RE)) {
		const options = splitOptions(m[1]);
		if (options.length < 2) continue;
		found.push({
			start: m.index,
			end: m.index + m[0].length,
			options,
			choice: makeChoice(m[2], m[3]),
		});
	}
	return found;
}

const isBlank = (l) => !l.trim();

// Classify lines the way renderMarkdown consumes them, so that a marker inside
// a code fence, map block, blockquote or table is never treated as markup.
function classify(lines) {
	const kind = new Array(lines.length);
	const heads = new Array(lines.length);
	let inCode = false;
	let inMap = false;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const t = line.trim();
		if (inCode) {
			kind[i] = 'skip';
			if (/^```/.test(t)) inCode = false;
		} else if (inMap) {
			kind[i] = 'skip';
			if (/^---\s*$/.test(t)) inMap = false;
		} else if (/^```/.test(t)) {
			kind[i] = 'skip';
			inCode = true;
		} else if (/^---\s+Map:\s+(.+?)\s*$/.test(line)) {
			kind[i] = 'skip';
			inMap = true;
		} else if ((heads[i] = parseHeading(line))) {
			kind[i] = 'heading';
		} else if (!t) {
			kind[i] = 'blank';
		} else if (
			/^---+$/.test(t) ||
			line.startsWith('>') ||
			t.startsWith('|') ||
			/^\s*<\/?(?:ul|ol|li|div|table|tr|td|th)[\s>]/i.test(line)
		) {
			kind[i] = 'skip';
		} else {
			kind[i] = 'text';
		}
	}
	return { kind, heads };
}

function sectionEnd(kind, heads, i) {
	for (let j = i + 1; j < kind.length; j++) {
		if (kind[j] === 'heading' && heads[j].level <= heads[i].level) return j;
	}
	return kind.length;
}

// Find every choice group in `lines`.
//
// Returns { groups, roles }:
//   groups: Map of id -> group. A prompt group's id is its prompt line number;
//           an inline group's id is "<line>:<n>" (n-th inline choice on it).
//   roles:  Map of line number -> { prompt?: group, option?: { group, index } }
//           for the lines the renderer has to treat specially.
export function parseChoices(lines) {
	const { kind, heads } = classify(lines);
	const groups = new Map();
	const roles = new Map();
	const role = (i) => {
		let r = roles.get(i);
		if (!r) roles.set(i, (r = {}));
		return r;
	};
	const promptOf = (i) =>
		kind[i] === 'text' ? splitChoiceMarker(lines[i].trimEnd()).choice : null;

	function addGroup(g) {
		if (!g.options.length) return;
		groups.set(g.id, g);
		role(g.prompt).prompt = g;
		g.options.forEach((o, index) => {
			const r = role(o.start);
			if (!r.option) r.option = { group: g, index };
		});
	}

	for (let i = 0; i < lines.length; i++) {
		if (kind[i] === 'heading' && heads[i].choice) {
			const h = heads[i];
			const end = sectionEnd(kind, heads, i);
			const children = [];
			for (let j = i + 1; j < end; j++) {
				if (kind[j] === 'heading' && heads[j].level === h.level + 1) children.push(j);
			}
			// Sub-headings as options need a level-2+ parent: an h1's h2s are
			// rendered as separate chunks and can't see their parent's marker.
			const blocks = h.level >= 2 && children.length > 0;
			const options = blocks
				? children.map((s, k) => ({ start: s, end: children[k + 1] ?? end }))
				: [];
			// Without sub-headings the options are the heading's own lines, up
			// to the next heading of any level.
			let bodyEnd = end;
			if (!blocks) {
				for (let j = i + 1; j < end; j++) {
					if (kind[j] === 'heading') {
						bodyEnd = j;
						break;
					}
					if (kind[j] === 'text') options.push({ start: j, end: j + 1 });
				}
			}
			addGroup({
				id: String(i),
				kind: blocks ? 'blocks' : 'lines',
				heading: true,
				prompt: i,
				end: bodyEnd,
				choice: h.choice,
				options,
			});
		} else if (kind[i] === 'text') {
			const choice = promptOf(i);
			if (!choice) continue;
			const options = [];
			let j = i + 1;
			while (j < lines.length && kind[j] === 'text' && !promptOf(j)) {
				options.push({ start: j, end: j + 1 });
				j++;
			}
			addGroup({
				id: String(i),
				kind: 'lines',
				heading: false,
				prompt: i,
				end: j,
				choice,
				options,
			});
		}
	}

	for (let i = 0; i < lines.length; i++) {
		if (kind[i] !== 'text' && kind[i] !== 'heading') continue;
		findInlineChoices(lines[i]).forEach((c, n) => {
			groups.set(`${i}:${n}`, { id: `${i}:${n}`, kind: 'inline', line: i, n, ...c });
		});
	}

	return { groups, roles, kind, heads };
}

function trimBlank(arr) {
	const out = arr.slice();
	while (out.length && isBlank(out[out.length - 1])) out.pop();
	while (out.length && isBlank(out[0])) out.shift();
	return out;
}

// Collapse runs of blank lines to one.
function squeeze(arr) {
	return arr.filter((l, i) => !(isBlank(l) && i > 0 && isBlank(arr[i - 1])));
}

// Append `block` to the end of `head` (lines ending just before a heading or
// the end of the document), keeping one blank line around heading blocks.
function appendBlock(head, block) {
	const out = head.slice();
	while (out.length && isBlank(out[out.length - 1])) out.pop();
	if (out.length && parseHeading(block[0])) out.push('');
	out.push(...block, '');
	return out;
}

// Move `block` to the end of the section headed `dest`. If there is no such
// section, one is created just before the h2 section containing line `near`.
function insertIntoSection(lines, dest, block, near) {
	const { kind, heads } = classify(lines);
	const want = dest.toLowerCase();
	let d = -1;
	for (let i = 0; i < lines.length; i++) {
		if (kind[i] === 'heading' && i !== near && heads[i].text.toLowerCase() === want) {
			d = i;
			break;
		}
	}
	if (d === -1) {
		let at = Math.min(near, lines.length);
		for (let i = at; i >= 0; i--) {
			if (kind[i] === 'heading' && heads[i].level <= 2) {
				at = i;
				break;
			}
		}
		const made = [`## ${dest}`];
		if (parseHeading(block[0])) made.push('');
		return [...lines.slice(0, at), ...made, ...block, '', ...lines.slice(at)];
	}
	const end = sectionEnd(kind, heads, d);
	const tail = lines.slice(end);
	const out = appendBlock(lines.slice(0, end), block);
	if (!tail.length) out.pop();
	return [...out, ...tail];
}

function nearestHeading(parsed, line) {
	for (let i = line; i >= 0; i--) {
		if (parsed.kind[i] === 'heading') return i;
	}
	return -1;
}

function applyInline(lines, g, opt, parsed, header) {
	const chosen = g.options[opt];
	if (chosen === undefined) return null;
	const { count, dest } = g.choice;
	const line = lines[g.line];

	// Picking from a "Names" section names the character: the name also goes
	// into the header line, and since a character has one name, the section's
	// other lists of suggestions (one per race, say) are dropped.
	const hIdx = nearestHeading(parsed, g.line);
	const naming = header?.setName && hIdx >= 0 && /^names?$/i.test(parsed.heads[hIdx].text);

	const rest = g.options.filter((_, k) => k !== opt);
	const remaining = count - 1;
	const more = remaining > 0 && rest.length > 0;
	const restMarkup = more
		? `[${rest.join(' | ')}]${formatChoiceMarker({ count: remaining, dest })}`
		: '';
	const replacement = dest ? restMarkup : more ? `${chosen}, ${restMarkup}` : chosen;
	const out = lines.slice();
	out[g.line] = line.slice(0, g.start) + replacement + line.slice(g.end);
	if (naming) {
		header.setName(chosen);
		const end = sectionEnd(parsed.kind, parsed.heads, hIdx);
		const others = (l, i) => i > hIdx && i < end && i !== g.line && parsed.groups.has(`${i}:0`);
		return out.filter((l, i) => !others(l, i));
	}
	return dest ? insertIntoSection(out, dest, [chosen], g.line) : out;
}

function applyGroup(lines, g, opt, parsed) {
	const o = g.options[opt];
	if (!o) return null;
	const { count, dest } = g.choice;
	const remaining = count - 1;
	// `done`: this pick uses up the choice, so the options not taken go away.
	const done = !(remaining > 0) || g.options.length <= 1;
	// A list item that has been picked is no longer one of a list, unless the
	// picks gather in another section.
	const unbullet = (l) =>
		g.kind === 'lines' && !dest ? l.replace(/^\s*(?:[-*]|\d+\.)\s+/, '') : l;
	const chosen = trimBlank(lines.slice(o.start, o.end)).map(unbullet);
	const spanEnd = g.heading ? g.end : g.options[g.options.length - 1].end;
	const before = lines.slice(0, g.prompt);
	const after = lines.slice(spanEnd);

	const optionLines = new Set();
	for (const x of g.options) for (let j = x.start; j < x.end; j++) optionLines.add(j);
	const inChosen = (j) => j >= o.start && j < o.end;

	const h = g.heading ? parsed.heads[g.prompt] : null;
	const nextChoice = { count: remaining, dest };
	let promptLine = null;
	if (h) {
		promptLine = formatHeading({ ...h, choice: done ? null : nextChoice });
	} else if (!done) {
		const { text } = splitChoiceMarker(lines[g.prompt].trimEnd());
		promptLine = `${text ? `${text} ` : ''}${formatChoiceMarker(nextChoice)}`;
	}

	// What is left of the group once the chosen option is lifted out.
	const leftover = [];
	for (let j = g.prompt + 1; j < spanEnd; j++) {
		if (inChosen(j)) continue;
		if (done && optionLines.has(j)) continue;
		leftover.push(lines[j]);
	}
	const withPrompt = (body) => (promptLine === null ? body : [promptLine, ...body]);
	const seam = (span) => {
		const s = squeeze(span);
		// Keep a blank line between a block and the heading that now follows it.
		if (s.length && !isBlank(s[s.length - 1]) && after.length && parseHeading(after[0])) {
			if (g.kind === 'blocks') s.push('');
		}
		return s;
	};

	if (dest) {
		const out = [...before, ...seam(withPrompt(leftover)), ...after];
		return insertIntoSection(out, dest, chosen, g.prompt);
	}

	if (!h) {
		// Line prompt: a pick moves above the prompt, out of the group.
		return [...before, ...chosen, ...seam(withPrompt(leftover)), ...after];
	}

	// Heading prompt, choosing several: picks collect in a twin section with
	// the same heading and no marker, placed just before this one. The last
	// pick removes what is left of the marked section.
	let twin = -1;
	for (let i = g.prompt - 1; i >= 0; i--) {
		if (parsed.kind[i] !== 'heading') continue;
		const p = parsed.heads[i];
		if (p.level > h.level) continue;
		if (p.level === h.level && p.text === h.text && !p.choice) twin = i;
		break;
	}

	if (done) {
		if (twin >= 0) return [...appendBlock(before, chosen), ...after];
		// Single pick: the chosen option stays where it is.
		const body = [];
		for (let j = g.prompt + 1; j < spanEnd; j++) {
			if (optionLines.has(j) && !inChosen(j)) continue;
			body.push(inChosen(j) ? unbullet(lines[j]) : lines[j]);
		}
		if (g.kind === 'blocks') {
			while (body.length && isBlank(body[body.length - 1])) body.pop();
			if (after.length) body.push('');
		}
		return [...before, promptLine, ...squeeze(body), ...after];
	}

	if (twin >= 0) {
		return [...appendBlock(before, chosen), ...seam(withPrompt(leftover)), ...after];
	}
	// First pick: start the twin, taking any intro text (the lines before the
	// first option) along with it.
	const introLen = g.kind === 'blocks' ? g.options[0].start - g.prompt - 1 : 0;
	const intro = trimBlank(leftover.slice(0, introLen));
	const twinHead = formatHeading({ ...h, choice: null, collapsed: false });
	const twinSection = appendBlock([twinHead, ...intro], chosen);
	const gap = g.kind === 'blocks' ? [''] : [];
	return [
		...before,
		...twinSection,
		promptLine,
		...gap,
		...seam(leftover.slice(introLen)),
		...after,
	];
}

// Pick option `optIndex` of group `id` in a document body (an array of lines).
// `header.setName(name)` is called when a character name is picked. Returns the
// new lines, or null if the group or option no longer exists.
export function pickChoice(lines, id, optIndex, header) {
	const parsed = parseChoices(lines);
	const g = parsed.groups.get(String(id));
	if (!g) return null;
	return g.kind === 'inline'
		? applyInline(lines, g, optIndex, parsed, header)
		: applyGroup(lines, g, optIndex, parsed);
}

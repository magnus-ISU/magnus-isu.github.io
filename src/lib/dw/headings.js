// Heading lines carry a few trailing markers. In canonical order:
//
//   ## Text (?2>Dest)  ::
//
//   (?…)   choice marker — the items below are options (see choices.js)
//   "  "   two or more trailing spaces — break mode: every newline in the
//          section renders as a line break
//   ::     collapsed (h2 only)
//   ###    glowing (h3 only)
//
// Everything that reads or rewrites a heading line goes through parseHeading /
// formatHeading, so toggling one marker can never drop another.

// --- Choice marker: (?)  (?2)  (?*)  (?>Dest)  (?2>Dest) ---
// A count means "choose that many"; "*" means "as many as you like", which
// with no destination amounts to taking every option one click at a time.
// ">Dest" means "a picked item moves to the end of the section called Dest".
// With a destination and no count the choice is open-ended too. An open-ended
// choice never deletes an option; its marker goes when the last one is taken.
export const CHOICE_MARKER_SRC = String.raw`\(\?(\d+|\*)?(?:\s*>\s*([^()]*?))?\s*\)`;
const CHOICE_SUFFIX_RE = new RegExp(String.raw`(?:^|\s)${CHOICE_MARKER_SRC}$`);

export function makeChoice(countStr, dest) {
	dest = dest?.trim() || null;
	const open = countStr === '*' || (!countStr && dest);
	const count = open ? Infinity : countStr ? Math.max(1, +countStr) : 1;
	return { count, dest };
}

// Split a trailing choice marker off a line or heading text. The marker must
// stand alone (start of text or after whitespace), so "\(?)" and the inline
// form "[a | b](?)" are left untouched.
export function splitChoiceMarker(text) {
	const m = text.match(CHOICE_SUFFIX_RE);
	if (!m) return { text, choice: null };
	return { text: text.slice(0, m.index).trimEnd(), choice: makeChoice(m[1], m[2]) };
}

export function formatChoiceMarker({ count, dest }) {
	const finite = Number.isFinite(count);
	if (dest) return `(?${finite ? count : ''}>${dest})`;
	if (!finite) return '(?*)';
	return `(?${count > 1 ? count : ''})`;
}

// Sections that break on every newline without needing the trailing spaces.
const AUTO_BREAK_RE = /^(?:gear|items|inventory|bonds)$/i;

export function parseHeading(line) {
	const m = line.match(/^(#{1,6})\s+(.*)$/);
	if (!m) return null;
	const level = m[1].length;
	let rest = m[2];
	// Spaces after the last marker count too ("## Gear ::  ").
	let breaks = / {2,}$/.test(rest);
	let collapsed = false;
	let glow = false;
	if (level === 2 && /::\s*$/.test(rest)) {
		collapsed = true;
		rest = rest.replace(/::\s*$/, '');
	} else if (level === 3 && /\s###\s*$/.test(rest)) {
		glow = true;
		rest = rest.replace(/###\s*$/, '');
	}
	if (/ {2,}$/.test(rest)) breaks = true;
	const { text, choice } = splitChoiceMarker(rest.trim());
	return { level, text, choice, breaks, collapsed, glow };
}

export function formatHeading(h) {
	let out = `${'#'.repeat(h.level)} ${h.text}`;
	if (h.choice) out += ` ${formatChoiceMarker(h.choice)}`;
	if (h.breaks) out += '  ';
	const pad = h.breaks ? '' : ' ';
	if (h.collapsed && h.level === 2) out += `${pad}::`;
	else if (h.glow && h.level === 3) out += `${pad}###`;
	return out;
}

// Whether the section under this heading renders every newline as a break.
export function headingBreaks(h, autoBreak = true) {
	return h.breaks || (autoBreak && AUTO_BREAK_RE.test(h.text));
}

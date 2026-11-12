import { findInlineChoices, parseChoices } from './choices.js';
import { headingBreaks, parseHeading, splitChoiceMarker } from './headings.js';
import { counterRe, isSpent, weighedItem } from './items.js';
import { collapseTooltips } from './tooltips.js';

export { collapseTooltips };

// --- Counter icons: [3 uses], [3 charges], [3 ammo], [5 rations] ---
// Each draws one icon per unit; `spent` is whether that unit is gone.
const TICK = 'M22 54 Q34 76 46 80 Q58 50 84 22';
const tick = (stroke) =>
	`<path transform="translate(10 -10)" d="${TICK}" fill="none" stroke="${stroke}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`;

const USE_BOX =
	'<path d="M14 16 Q50 11 86 18 Q92 50 86 86 Q50 91 14 84 Q9 50 14 16 Z" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>';
const CHARGE_RING =
	'<circle cx="50" cy="50" r="33" fill="none" stroke="currentColor" stroke-width="9"/>';
const CHARGE_CORE = '<circle cx="50" cy="50" r="17" fill="currentColor"/>';
const APPLE =
	// stem
	'<path d="M50 18 L52 4" stroke="#3a2008" stroke-width="6" stroke-linecap="round"/>' +
	// leaf
	'<path d="M52 12 C64 0 82 6 80 22 C70 22 56 18 52 14 Z" fill="#5da030" stroke="#2a5018" stroke-width="2" stroke-linejoin="round"/>' +
	// body — two-lobed top, round bottom
	'<path d="M50 30 C42 18 22 16 14 32 C6 50 10 78 28 90 C38 96 46 90 50 88 C54 90 62 96 72 90 C90 78 94 50 86 32 C78 16 58 18 50 30 Z" fill="#e02818" stroke="#5a0808" stroke-width="3" stroke-linejoin="round"/>' +
	// shine
	'<ellipse cx="32" cy="46" rx="6" ry="14" fill="#ff9080" opacity="0.6" transform="rotate(-20 32 46)"/>';
// A quiver slung at an angle; a spent one is drawn dark.
const QUIVER =
	// strap
	'<path d="M33 20 Q-2 52 37 90" fill="none" stroke="#4a2a0a" stroke-width="5" stroke-linecap="round"/>' +
	// tube and its bands
	'<path d="M30 17 H70 L63 88 Q50 100 37 88 Z" fill="#c98836" stroke="#4a2a0a" stroke-width="5" stroke-linejoin="round"/>' +
	'<path d="M34.5 62 H65.5 M36 76 H64" stroke="#4a2a0a" stroke-width="4" opacity=".55"/>' +
	// mouth and rim
	'<ellipse cx="50" cy="17" rx="23" ry="9" fill="#5a3410" stroke="#4a2a0a" stroke-width="5"/>' +
	'<path d="M28 24 Q50 38 72 24" fill="none" stroke="#f0c070" stroke-width="5" stroke-linecap="round"/>';

const COUNTER_ICONS = {
	uses: { size: 20, draw: (spent) => USE_BOX + (spent ? tick('currentColor') : '') },
	charges: { size: 20, draw: (spent) => CHARGE_RING + (spent ? CHARGE_CORE : '') },
	ammo: {
		size: 24,
		draw: (spent) => `<g transform="rotate(28 50 52)"${spent ? ' opacity=".4"' : ''}>${QUIVER}</g>`,
	},
	rations: { size: 24, draw: (spent) => APPLE + (spent ? tick('#fff') : '') },
};

function weightIcon(value, spent) {
	return `<svg class="weight-icon${spent ? ' weight-spent' : ''}" width="24" height="24" style="display:inline-block;vertical-align:middle;color:#444;transform:translateY(-2px)${spent ? ';opacity:.35' : ''}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0,-20)"><path d="M256 46c-45.074 0-82 36.926-82 82 0 25.812 12.123 48.936 30.938 64H128L32 480h448l-96-288h-76.938C325.877 176.936 338 153.812 338 128c0-45.074-36.926-82-82-82zm0 36c25.618 0 46 20.382 46 46s-20.382 46-46 46-46-20.382-46-46 20.382-46 46-46z" fill="currentColor"/></g><text x="256" y="400" text-anchor="middle" font-size="240" font-weight="bold" fill="#fff" font-family="sans-serif">${value}</text></svg>`;
}

// Options that are taken or moved one by one (shown with a "+") rather than
// chosen between (shown with a circle).
function isOpenChoice(choice) {
	return !!choice.dest || !Number.isFinite(choice.count);
}

function chooseLabel(choice) {
	if (!Number.isFinite(choice.count)) return '';
	return `choose ${choice.count === 1 ? 'one' : choice.count}`;
}

// Simple markdown → HTML (CommonMark-ish) with two-column layout for h2 sections with 2+ h3s
// opts.battle: when true, ```battle fences become indexed placeholder divs that the
// character sheet mounts interactive components into. opts.battleCounter is a shared
// { n } object so indices stay sequential across recursive renders.
//
// opts.autoBreak (default true): sections called Gear / Items / Inventory /
// Bonds break on every newline. Turn it off for hard-wrapped sources.
//
// opts.choiceScope: when set, choice options (see choices.js) are rendered
// clickable and tagged data-cs=<scope> data-cg=<group id> data-co=<option>, the
// group id being relative to the lines of `src`. Without it the options are
// shown but inert.
export function renderMarkdown(src, opts = {}) {
	if (!src.trim()) return '';

	const battle = !!opts.battle;
	const battleCounter = opts.battleCounter || { n: 0 };
	const autoBreak = opts.autoBreak !== false;
	const choiceScope = opts.choiceScope || '';
	const childOpts = { battle, battleCounter, autoBreak };

	src = collapseTooltips(src);

	const lines = src.split('\n');
	const choiceRoles = parseChoices(lines).roles;
	const optAttrs = (id, index) => ` data-cs="${choiceScope}" data-cg="${id}" data-co="${index}"`;

	// Pre-scan: count h3s under each h2 (by line index)
	const h2H3Counts = new Map();
	let scanH2 = -1;
	for (let i = 0; i < lines.length; i++) {
		const hm = lines[i].match(/^(#{1,4})\s/);
		if (hm) {
			if (hm[1].length === 2) {
				scanH2 = i;
				h2H3Counts.set(i, 0);
			} else if (hm[1].length === 3 && scanH2 >= 0)
				h2H3Counts.set(scanH2, h2H3Counts.get(scanH2) + 1);
		}
	}

	let html = '';
	let coinId = 0;
	const counterIdx = {};
	let inList = false;
	let listTag = '';
	let paraLines = [];
	let inMoveBlock = false;
	let inH2Section = false;
	let pendingColumns = false; // true when h2 wants columns but hasn't hit the first h3 yet
	let inColumns = false;
	let _h2Collapsed = false;
	let inBlockquote = false;
	let bqLines = [];
	// "Break mode": a heading ending in 2+ spaces makes every following normal
	// line break, until a heading of equal or greater strength (<= level).
	// Initial values can be passed in when rendering a chunk of a larger
	// document (see splitMarkdownChunks).
	let breakMode = !!opts.breakMode;
	let breakModeLevel = opts.breakModeLevel || 0;

	function closeMoveBlock() {
		if (inMoveBlock) {
			html += '</div>';
			inMoveBlock = false;
		}
	}

	function closeColumns() {
		if (inColumns) {
			html += '</div>';
			inColumns = false;
		}
	}

	function closeH2Section() {
		closeMoveBlock();
		closeColumns();
		if (inH2Section) {
			html += '</div></div>'; // close h2-section, then h2-group
			inH2Section = false;
		}
		pendingColumns = false;
		_h2Collapsed = false;
	}

	// Replacer for one kind of counter: an icon per unit, the spent ones first.
	function counterIcons(kind) {
		const { size, draw } = COUNTER_ICONS[kind];
		return (_, curStr, maxStr) => {
			const max = maxStr ? +maxStr : +curStr;
			const spent = max - Math.min(+curStr, max);
			const groupIdx = (counterIdx[kind] = (counterIdx[kind] ?? -1) + 1);
			let out = '<span class="consumable-group">';
			for (let i = 0; i < max; i++) {
				out += `<svg class="${kind}-icon" data-${kind}-idx="${groupIdx}" data-state="${i < spent ? 'used' : 'remaining'}" width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${draw(i < spent)}</svg>`;
			}
			return `${out}</span>`;
		};
	}

	function flushBlockquote() {
		if (bqLines.length === 0) return;
		html += `<blockquote>${renderMarkdown(bqLines.join('\n'), childOpts)}</blockquote>`;
		bqLines = [];
		inBlockquote = false;
	}

	function listItem(text, idx) {
		const role = choiceRoles.get(idx);
		if (role?.prompt) {
			const label = chooseLabel(role.prompt.choice);
			const shown = splitChoiceMarker(text.trimEnd()).text;
			return `<li><span class="choice-prompt">${inline(shown, idx) || label}</span></li>`;
		}
		if (role?.option && choiceScope) {
			const move = isOpenChoice(role.option.group.choice) ? ' choice-move' : '';
			return `<li class="choice-opt${move}"${optAttrs(role.option.group.id, role.option.index)}>${inline(text, idx)}</li>`;
		}
		return `<li>${inline(text, idx)}</li>`;
	}

	function closePendingList() {
		if (inList) {
			html += `</${listTag}>`;
			inList = false;
		}
	}

	function flushPara() {
		if (paraLines.length === 0) return;
		// A choice prompt and each of its options sit on their own line whatever
		// the break mode.
		const roleOf = (p) => (p ? choiceRoles.get(p.idx) : undefined);
		const ownLine = (r) => !!(r && (r.prompt || r.option));
		const content = paraLines
			.map((p, i) => {
				const isLast = i === paraLines.length - 1;
				const role = roleOf(p);
				const isPrompt = !!role?.prompt;
				const option = !isPrompt && role?.option;
				let l = p.line;
				const hasBreak =
					!isLast &&
					(breakMode || / {2,}$/.test(l) || ownLine(role) || ownLine(roleOf(paraLines[i + 1])));
				const hasBackslash = !isLast && !hasBreak && /\\$/.test(l);
				if (isPrompt) l = splitChoiceMarker(l.trimEnd()).text;
				const stripped = hasBackslash ? l.slice(0, -1) : l.replace(/ {2,}$/, '');
				let rendered = inline(stripped, p.idx);

				if (isPrompt) {
					const label = chooseLabel(role.prompt.choice);
					const text = rendered || (label ? `${label[0].toUpperCase()}${label.slice(1)}:` : '');
					rendered = `<span class="choice-prompt">${text}</span>`;
				} else if (option && choiceScope) {
					// Not yet the character's own, so no click-to-copy: a click picks it.
					const move = isOpenChoice(option.group.choice) ? ' choice-move' : '';
					rendered = `<span class="choice-opt choice-line${move}"${optAttrs(option.group.id, option.index)}>${rendered}</span>`;
					return hasBreak ? `${rendered}<br>` : rendered;
				}

				const hasConsumable = /\[\d+(?:\/\d+)?\s+(?:uses?|rations?)\]/i.test(l);
				const hasChoice = l.includes('](?') && findInlineChoices(l).length > 0;
				if (!isPrompt && !hasChoice && (/^\[/.test(l.trim()) || hasConsumable)) {
					const afterCoin = l
						.trim()
						.replace(/^\[\d+\s*Coin\]\s*/i, '')
						.replace(/ {2,}$/, '');
					if (afterCoin) {
						const esc = afterCoin
							.replace(/&/g, '&amp;')
							.replace(/</g, '&lt;')
							.replace(/>/g, '&gt;')
							.replace(/"/g, '&quot;');
						const srcEsc = l
							.replace(/&/g, '&amp;')
							.replace(/</g, '&lt;')
							.replace(/>/g, '&gt;')
							.replace(/"/g, '&quot;');
						rendered = `<span class="copy-line" data-copy="${esc}" data-src="${srcEsc}" onclick="if(this.classList.contains('fading-line'))return;if(event.target.closest('.consumable-group'))return;navigator.clipboard.writeText(this.dataset.copy);this.classList.add('copied');clearTimeout(this._t);this._t=setTimeout(()=>this.classList.remove('copied'),1200)">${rendered}</span>`;
					}
				}

				return hasBreak || hasBackslash ? `${rendered}<br>` : rendered;
			})
			.join('\n');
		html += `<p>${content}</p>`;
		paraLines = [];
	}

	// lineIdx: the source line `t` comes from, so inline choices can be
	// addressed; -1 renders them inert.
	function inline(t, lineIdx = -1) {
		// Inline choices come out first and go back in last, so their rendered
		// HTML passes through the replacements below untouched.
		const choiceHtml = [];
		if (t.includes('](?')) {
			const found = findInlineChoices(t);
			for (let k = found.length - 1; k >= 0; k--) {
				const c = found[k];
				const live = choiceScope && lineIdx >= 0;
				const move = isOpenChoice(c.choice) ? ' choice-move' : '';
				const parts = c.options.map((o, oi) =>
					live
						? `<span class="choice-opt${move}"${optAttrs(`${lineIdx}:${k}`, oi)}>${inline(o)}</span>`
						: inline(o),
				);
				const n = Number.isFinite(c.choice.count) && c.choice.count > 1 ? c.choice.count : 0;
				choiceHtml[k] =
					`<span class="choice-inline"${n ? ` data-choose="choose ${n}"` : ''}>` +
					`${parts.join('<span class="choice-sep"> / </span>')}</span>`;
				t = `${t.slice(0, c.start)}\x00CH${k}\x00${t.slice(c.end)}`;
			}
		}

		const escapes = [];
		t = t.replace(/\\([\\`*_[\]{}()#+\-.!|~])/g, (_, ch) => {
			escapes.push(ch);
			return `\x00ESC${escapes.length - 1}\x00`;
		});

		// Preserve inline HTML tags through escaping
		const htmlTags = [];
		t = t.replace(/<(\/?)(span|div|br|em|strong|sub|sup)(\s[^>]*)?\s*\/?>/gi, (match) => {
			htmlTags.push(match);
			return `\x00HTML${htmlTags.length - 1}\x00`;
		});

		t = t
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/__(.+?)__/g, '<strong>$1</strong>')
			.replace(/\*(.+?)\*/g, '<em>$1</em>')
			.replace(/_(.+?)_/g, '<em>$1</em>')
			.replace(/`(.+?)`/g, '<code>$1</code>')
			.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => {
				function makeTip(raw) {
					// eslint-disable-next-line no-control-regex
					return raw.replace(/\x01/g, '&#10;').replace(/"/g, '&quot;');
				}
				// [text](## "GitHub-flavored tooltip")
				const ghMatch = href.match(/^##?\s+"(.+)"$/s);
				if (ghMatch)
					return `<span class="lore-tip" data-tip="${makeTip(ghMatch[1])}">${text}</span>`;
				// [text]("Quoted tooltip")
				const quotedMatch = href.match(/^"(.+)"$/s);
				if (quotedMatch)
					return `<span class="lore-tip" data-tip="${makeTip(quotedMatch[1])}">${text}</span>`;
				// [text](tooltip with spaces) — contains a space, not a URL
				if ((/\s/.test(href) || /\x01/.test(href)) && !/^https?:\/\//.test(href)) {
					return `<span class="lore-tip" data-tip="${makeTip(href)}">${text}</span>`;
				}
				return `<a href="${href}">${text}</a>`;
			})
			.replace(/\[([^\]]+) Coin\]/gi, (_, val) => {
				const fs = Math.min(50, Math.floor(130 / val.length));
				const gid = `cg${coinId++}`;
				return `<svg class="coin-icon" width="24" height="24" style="display:inline-block;vertical-align:middle;transform:translateY(-1px)" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="48" fill="url(#${gid})" stroke="#a07020" stroke-width="3"/><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f0d060"/><stop offset="100%" stop-color="#c9952a"/></linearGradient></defs><text x="50" y="54" text-anchor="middle" dominant-baseline="central" font-size="${fs}" font-weight="bold" fill="#3d2200" font-family="sans-serif">${val}</text></svg>`;
			})
			.replace(
				/\[(\+?\d+) Armor\]/gi,
				'<svg class="armor-icon" width="22" height="22" style="display:inline-block;vertical-align:middle;transform:translateY(-2px)" viewBox="0 0 512 559" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0,47)"><path d="M256 16L48 96v160c0 138.5 89 229.3 208 240 119-10.7 208-101.5 208-240V96L256 16z" fill="#3a6faa" stroke="#2a4f7a" stroke-width="16"/><path d="M256 48L80 116v140c0 120 78 199 176 210 98-11 176-90 176-210V116L256 48z" fill="#5a8fd4"/></g><text x="256" y="305" text-anchor="middle" dominant-baseline="central" font-size="240" font-weight="bold" fill="#fff" font-family="sans-serif">$1</text></svg>',
			)
			// The counters are still text here, so a weight can see whether the
			// item it belongs to has run out.
			.replace(/\[([^\]]+) Weight\]/gi, (m, value, at, whole) =>
				weightIcon(value, isSpent(weighedItem(whole, at + m.length))),
			)
			.replace(counterRe('uses'), counterIcons('uses'))
			.replace(counterRe('charges'), counterIcons('charges'))
			.replace(counterRe('ammo'), counterIcons('ammo'))
			.replace(counterRe('rations'), counterIcons('rations'));

		// eslint-disable-next-line no-control-regex
		t = t.replace(/\x00HTML(\d+)\x00/g, (_, i) => htmlTags[+i]);
		// eslint-disable-next-line no-control-regex
		t = t.replace(/\x00ESC(\d+)\x00/g, (_, i) =>
			escapes[+i].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
		);
		// eslint-disable-next-line no-control-regex
		if (choiceHtml.length) t = t.replace(/\x00CH(\d+)\x00/g, (_, i) => choiceHtml[+i]);

		return t;
	}

	for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
		const line = lines[lineIdx];

		const mapStart = line.match(/^---\s+Map:\s+(.+?)\s*$/);
		if (mapStart) {
			flushPara();
			flushBlockquote();
			closePendingList();
			closeMoveBlock();
			closeColumns();
			const mapName = mapStart[1];
			const blockLines = [];
			lineIdx++;
			while (lineIdx < lines.length && !/^---\s*$/.test(lines[lineIdx].trim())) {
				blockLines.push(lines[lineIdx]);
				lineIdx++;
			}
			html += renderDungeonBlock(mapName, blockLines, (s) => renderMarkdown(s, childOpts));
			continue;
		}

		const hd = parseHeading(line);
		if (hd) {
			flushPara();
			flushBlockquote();
			closePendingList();
			const level = hd.level;
			if (breakMode && level <= breakModeLevel) breakMode = false;
			if (headingBreaks(hd, autoBreak)) {
				breakMode = true;
				breakModeLevel = level;
			}
			// A heading can prompt a choice ("## Background (?)") and be an
			// option of its parent's choice at the same time.
			const role = choiceRoles.get(lineIdx);
			const classes = [];
			let attrs = '';
			if (role?.prompt) {
				classes.push('choice-prompt');
				const label = chooseLabel(role.prompt.choice);
				if (label) attrs += ` data-choose="${label}"`;
			}
			if (role?.option && choiceScope) {
				classes.push('choice-opt');
				if (isOpenChoice(role.option.group.choice)) classes.push('choice-move');
				attrs += optAttrs(role.option.group.id, role.option.index);
			}
			const headingHtml = (extraClasses = [], extraAttrs = '') => {
				const cls = [...extraClasses, ...classes];
				const clsAttr = cls.length ? ` class="${cls.join(' ')}"` : '';
				return `<h${level}${clsAttr}${extraAttrs}${attrs}>${inline(hd.text, lineIdx)}</h${level}>`;
			};
			if (level <= 2) {
				closeH2Section();
				const collapsed = hd.collapsed;
				if (level === 2) {
					html += '<div class="h2-group">';
				}
				html += headingHtml(collapsed ? ['collapsed-heading', 'collapsed-inline'] : []);
				if (level === 2) {
					_h2Collapsed = collapsed;
					const cols = (h2H3Counts.get(lineIdx) || 0) >= 2;
					const cls = ['h2-section', collapsed && 'collapsed', collapsed && 'hide']
						.filter(Boolean)
						.join(' ');
					html += `<div class="${cls}">`;
					inH2Section = true;
					if (cols) pendingColumns = true;
				}
			} else if (level === 3) {
				closeMoveBlock();
				if (pendingColumns) {
					html += '<div class="h2-columns">';
					inColumns = true;
					pendingColumns = false;
				}
				html += '<div class="move-block">';
				inMoveBlock = true;
				html += headingHtml([], hd.glow ? ' data-glow' : '');
			} else {
				html += headingHtml();
			}
			continue;
		}

		if (/^```/.test(line.trim())) {
			flushPara();
			closePendingList();
			const info = line.trim().slice(3).trim().toLowerCase();
			const codeLines = [];
			lineIdx++;
			while (lineIdx < lines.length && !/^```/.test(lines[lineIdx].trim())) {
				codeLines.push(lines[lineIdx]);
				lineIdx++;
			}
			if (info === 'battle' && battle) {
				html += `<div class="battle-block" data-battle-index="${battleCounter.n++}"></div>`;
				continue;
			}
			const raw = codeLines.join('\n');
			const escaped = raw
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;');
			html += `<pre class="code-block" onclick="navigator.clipboard.writeText(this.dataset.copy);this.classList.add('copied');clearTimeout(this._t);this._t=setTimeout(()=>this.classList.remove('copied'),1200)" data-copy="${escaped}">${escaped}</pre>`;
			continue;
		}

		if (/^---+$/.test(line.trim())) {
			flushPara();
			closePendingList();
			html += '<hr>';
			continue;
		}

		// Markdown pipe tables
		if (
			/^\|(.+)\|/.test(line.trim()) &&
			lineIdx + 1 < lines.length &&
			/^\|[\s:-]+\|/.test(lines[lineIdx + 1].trim())
		) {
			flushPara();
			closePendingList();
			const parseCells = (row) =>
				row
					.trim()
					.replace(/^\|/, '')
					.replace(/\|$/, '')
					.split('|')
					.map((c) => c.trim());
			const headers = parseCells(line);
			const sepCells = parseCells(lines[lineIdx + 1]);
			const aligns = sepCells.map((c) => {
				const l = c.startsWith(':'),
					r = c.endsWith(':');
				return l && r ? 'center' : r ? 'right' : null;
			});
			lineIdx += 2; // skip header + separator
			html += '<table><thead><tr>';
			for (let ci = 0; ci < headers.length; ci++) {
				const a = aligns[ci] ? ` style="text-align:${aligns[ci]}"` : '';
				html += `<th${a}>${inline(headers[ci])}</th>`;
			}
			html += '</tr></thead><tbody>';
			while (lineIdx < lines.length && /^\|(.+)\|/.test(lines[lineIdx].trim())) {
				const cells = parseCells(lines[lineIdx]);
				html += '<tr>';
				for (let ci = 0; ci < headers.length; ci++) {
					const a = aligns[ci] ? ` style="text-align:${aligns[ci]}"` : '';
					html += `<td${a}>${inline(cells[ci] || '')}</td>`;
				}
				html += '</tr>';
				lineIdx++;
			}
			html += '</tbody></table>';
			lineIdx--; // outer loop will increment
			continue;
		}

		if (line.startsWith('> ') || (inBlockquote && line === '>')) {
			flushPara();
			closePendingList();
			bqLines.push(line === '>' ? '' : line.slice(2));
			inBlockquote = true;
			continue;
		}
		if (inBlockquote) {
			flushBlockquote();
		}

		const ul = line.match(/^[-*]\s+(.*)/);
		if (ul) {
			flushPara();
			if (!inList || listTag !== 'ul') {
				closePendingList();
				html += '<ul>';
				inList = true;
				listTag = 'ul';
			}
			html += listItem(ul[1], lineIdx);
			continue;
		}

		const ol = line.match(/^\d+\.\s+(.*)/);
		if (ol) {
			flushPara();
			if (!inList || listTag !== 'ol') {
				closePendingList();
				html += '<ol>';
				inList = true;
				listTag = 'ol';
			}
			html += listItem(ol[1], lineIdx);
			continue;
		}

		if (!line.trim()) {
			flushPara();
			closePendingList();
			continue;
		}

		if (/^\s*<\/?(?:ul|ol|li|div|table|tr|td|th)[\s>]/i.test(line)) {
			flushPara();
			closePendingList();
			html += line;
			continue;
		}

		closePendingList();
		paraLines.push({ line, idx: lineIdx });
	}
	flushPara();
	flushBlockquote();
	closePendingList();
	closeH2Section();
	return html;
}

// Split a document into independently renderable chunks so an edit only
// re-renders (and only rebuilds the DOM of) the chunk it touched. Safe split
// points are top-level h1/h2 headings — renderMarkdown closes every open
// structure (paragraph, list, blockquote, columns, h2 section) at those — and
// standalone `--- Map:` blocks outside any h2 section. Lines inside ``` fences
// and map blocks are never split on, even if they look like headings.
//
// Each chunk records the break-mode state it starts in (a heading ending in
// 2+ spaces turns it on for following content), since that's the only renderer
// state that can legitimately cross an h1/h2 boundary (from an h1).
export function splitMarkdownChunks(src, opts = {}) {
	const autoBreak = opts.autoBreak !== false;
	// Same pre-pass as renderMarkdown so multiline tooltips never straddle a
	// chunk boundary. renderMarkdown's own pre-pass then no-ops on each chunk.
	src = collapseTooltips(src);

	const lines = src.split('\n');
	const chunks = [];
	let cur = [];
	let breakMode = false;
	let breakModeLevel = 0;
	let curBreakMode = false;
	let curBreakModeLevel = 0;
	let inCode = false;
	let inMap = false;
	let mapStandalone = false;
	let inSection = false; // inside an open h2 section

	function push() {
		if (cur.length) {
			chunks.push({
				text: cur.join('\n'),
				breakMode: curBreakMode,
				breakModeLevel: curBreakModeLevel,
			});
			cur = [];
		}
		curBreakMode = breakMode;
		curBreakModeLevel = breakModeLevel;
	}

	for (const line of lines) {
		if (inCode) {
			cur.push(line);
			if (/^```/.test(line.trim())) inCode = false;
			continue;
		}
		if (inMap) {
			cur.push(line);
			if (/^---\s*$/.test(line.trim())) {
				inMap = false;
				if (mapStandalone) push();
			}
			continue;
		}
		if (/^```/.test(line.trim())) {
			inCode = true;
			cur.push(line);
			continue;
		}
		if (/^---\s+Map:\s+(.+?)\s*$/.test(line)) {
			mapStandalone = !inSection;
			if (mapStandalone) push();
			inMap = true;
			cur.push(line);
			continue;
		}
		const hd = parseHeading(line);
		if (hd) {
			const level = hd.level;
			if (level <= 2) {
				push();
				inSection = level === 2;
			}
			if (breakMode && level <= breakModeLevel) breakMode = false;
			if (headingBreaks(hd, autoBreak)) {
				breakMode = true;
				breakModeLevel = level;
			}
		}
		cur.push(line);
	}
	push();
	return chunks;
}

function renderDungeonBlock(mapName, blockLines, render) {
	let firstHeading = -1;
	for (let i = 0; i < blockLines.length; i++) {
		if (/^#\s/.test(blockLines[i])) {
			firstHeading = i;
			break;
		}
	}
	const mapLines = firstHeading === -1 ? blockLines.slice() : blockLines.slice(0, firstHeading);
	while (mapLines.length && !mapLines[0].trim()) mapLines.shift();
	while (mapLines.length && !mapLines[mapLines.length - 1].trim()) mapLines.pop();

	const groups = [];
	if (firstHeading >= 0) {
		let curName = null,
			curLines = [];
		for (let i = firstHeading; i < blockLines.length; i++) {
			const line = blockLines[i];
			const m = line.match(/^#\s+(.+?)\s*$/);
			if (m) {
				if (curName !== null) groups.push({ name: curName, lines: curLines });
				curName = m[1];
				curLines = [];
			} else {
				curLines.push(line);
			}
		}
		if (curName !== null) groups.push({ name: curName, lines: curLines });
	}

	const firstRoom = groups[0]?.name || '';

	const escHtml = (s) =>
		s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	const escAttr = (s) => escHtml(s);
	const nameRe = /[A-Za-z][A-Za-z0-9']*(?: [A-Za-z][A-Za-z0-9']*)*/g;

	const mapOnclick =
		"var b=this.closest('.dungeon-block'),cx=event.clientX,cy=event.clientY,best=null,bestD=Infinity;" +
		"this.querySelectorAll('.dungeon-room').forEach(function(e){" +
		'var c=e.getBoundingClientRect(),dx=Math.max(c.left-cx,0,cx-c.right),dy=Math.max(c.top-cy,0,cy-c.bottom),d=dx*dx+dy*dy;' +
		'if(d&lt;bestD){bestD=d;best=e;}});' +
		'if(!best||bestD&gt;6400)return;' +
		'var r=best.dataset.room;' +
		"b.querySelectorAll('.dungeon-room').forEach(function(e){e.classList.toggle('selected',e.dataset.room===r)});" +
		"b.querySelectorAll('.dungeon-group').forEach(function(e){e.classList.toggle('selected',e.dataset.room===r)});";

	let mapHtml = '';
	for (const line of mapLines) {
		let last = 0;
		nameRe.lastIndex = 0;
		let m;
		while ((m = nameRe.exec(line)) !== null) {
			mapHtml += escHtml(line.slice(last, m.index));
			const sel = m[0] === firstRoom ? ' selected' : '';
			mapHtml += `<span class="dungeon-room${sel}" data-room="${escAttr(m[0])}">${escHtml(m[0])}</span>`;
			last = m.index + m[0].length;
		}
		mapHtml += escHtml(line.slice(last));
		mapHtml += '\n';
	}

	let groupsHtml = '';
	for (const g of groups) {
		const sel = g.name === firstRoom ? ' selected' : '';
		const inner = render(`# ${g.name}\n${g.lines.join('\n')}`);
		groupsHtml += `<div class="dungeon-group${sel}" data-room="${escAttr(g.name)}">${inner}</div>`;
	}

	return `<div class="dungeon-block" data-map="${escAttr(mapName)}"><pre class="dungeon-map" onclick="${mapOnclick}">${mapHtml}</pre><div class="dungeon-groups">${groupsHtml}</div></div>`;
}

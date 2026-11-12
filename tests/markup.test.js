// Heading markers, break mode and choice markup. Run with `bun run test`.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseChoices, pickChoice } from '../src/lib/dw/choices.js';
import { formatHeading, parseHeading } from '../src/lib/dw/headings.js';
import {
	collapseTooltips,
	renderMarkdown,
	splitMarkdownChunks,
} from '../src/lib/dw/renderMarkdown.js';

const CLASS_DIR = new URL('../src/lib/dw/homebrew/classes/', import.meta.url);
const classFiles = readdirSync(CLASS_DIR).filter((f) => f.endsWith('.md'));
const readClass = (f) => readFileSync(new URL(f, CLASS_DIR), 'utf8');

const pick = (text, id, opt, header) => {
	const out = pickChoice(text.split('\n'), id, opt, header);
	return out === null ? null : out.join('\n');
};

// --- headings ---

test('heading markers round-trip', () => {
	for (const line of [
		'## Gear',
		'## Notes  ',
		'## Notes ::',
		'## Notes  ::',
		'## Background (?)',
		'## Picks (?2)  ::',
		'## All of these (?*)',
		'## Advanced Moves (?>Starting Moves) ::',
		'## Take one (?1>Moves)',
		'### Hack ###',
		'### Bonds  ###',
		'# Title',
	]) {
		assert.equal(formatHeading(parseHeading(line)), line);
	}
});

test('collapsing and expanding keeps break mode and the choice marker', () => {
	const h = parseHeading('## Notes (?)  ');
	const collapsed = formatHeading({ ...h, collapsed: true });
	assert.equal(collapsed, '## Notes (?)  ::');
	const back = parseHeading(collapsed);
	assert.equal(back.breaks, true);
	assert.deepEqual(back.choice, { count: 1, dest: null });
	assert.equal(formatHeading({ ...back, collapsed: false }), '## Notes (?)  ');
});

test('heading text excludes every marker', () => {
	assert.equal(parseHeading('## Advanced Moves (?>Starting Moves)  ::').text, 'Advanced Moves');
	assert.equal(parseHeading('### Armored ###').text, 'Armored');
	assert.equal(parseHeading('### Armored ###').glow, true);
	// Not markers: an escaped one, and :: or ### on other levels.
	assert.equal(parseHeading('## What \\(?)').text, 'What \\(?)');
	assert.equal(parseHeading('### A ::').text, 'A ::');
});

// --- break mode ---

const breaksIn = (html) => (html.match(/<br>/g) || []).length;

test('two spaces after a heading break every line, collapsed or not', () => {
	assert.equal(breaksIn(renderMarkdown('## Notes  \na\nb\nc')), 2);
	assert.equal(breaksIn(renderMarkdown('## Notes  ::\na\nb\nc')), 2);
	assert.equal(breaksIn(renderMarkdown('## Notes\na\nb\nc')), 0);
});

test('gear, items and bonds break by default', () => {
	assert.equal(breaksIn(renderMarkdown('## Gear\na\nb\nc')), 2);
	assert.equal(breaksIn(renderMarkdown('## Gear ::\na\nb\nc')), 2);
	assert.equal(breaksIn(renderMarkdown('## Items\na\nb')), 1);
	assert.equal(breaksIn(renderMarkdown('## Stats\nx\ny\n### Bonds\na\nb\nc')), 2);
	// …until a heading of the same or higher level…
	assert.equal(breaksIn(renderMarkdown('## Gear\na\nb\n## Other\nc\nd')), 1);
	// …and not for hard-wrapped sources.
	assert.equal(breaksIn(renderMarkdown('## Gear\na\nb\nc', { autoBreak: false })), 0);
});

test('chunks carry the break mode they start in', () => {
	const chunks = splitMarkdownChunks('# Doc  \nx\n## Gear\na\n## Plain\nb');
	assert.deepEqual(
		chunks.map((c) => c.breakMode),
		[false, true, true],
	);
});

test('class files no longer need trailing spaces in gear and bonds', () => {
	for (const f of classFiles) {
		let section = null;
		for (const line of readClass(f).split('\n')) {
			const h = parseHeading(line);
			if (h) section = /^(gear|bonds)$/i.test(h.text) ? h.text : h.level <= 2 ? null : section;
			else if (section) assert.ok(!/ {2}$/.test(line), `${f}: "${line}"`);
		}
	}
});

// --- choices ---

test('inline choice keeps the picked option', () => {
	assert.equal(pick('Range: [Hand | Close | Reach](?)', '0:0', 1), 'Range: Close');
	assert.equal(pick('[a | b](?) and [c | d](?)', '0:1', 0), '[a | b](?) and c');
});

test('inline choice of several counts down', () => {
	const one = pick('[a | b | c](?2)', '0:0', 1);
	assert.equal(one, 'b, [a | c](?)');
	assert.equal(pick(one, '0:0', 1), 'b, c');
});

test('inline options may hold bracketed items and escaped pipes', () => {
	const { groups } = parseChoices(['[[1 Weight] Sword | [2 Weight] Axe | a \\| b](?)']);
	assert.deepEqual(groups.get('0:0').options, ['[1 Weight] Sword', '[2 Weight] Axe', 'a \\| b']);
});

test('line prompt: options are the lines up to a blank line', () => {
	const src = 'Keep\nChoose one: (?)\n[1 Weight] Axe\n[2 Weight] Sword\n\nAfter';
	assert.equal(pick(src, '1', 1), 'Keep\n[2 Weight] Sword\n\nAfter');
});

test('line prompt for several moves picks above it and counts down', () => {
	const src = 'Choose two: (?2)\na\nb\nc';
	const one = pick(src, '0', 2);
	assert.equal(one, 'c\nChoose two: (?)\na\nb');
	assert.equal(pick(one, '1', 0), 'c\na');
});

test('a picked list item loses its bullet', () => {
	const src = 'Text\nChoose its power: (?)\n- one\n- two\n- three\n\nMore';
	assert.equal(pick(src, '1', 1), 'Text\ntwo\n\nMore');
	assert.equal(pick('Pick: (?)\n1. one\n2. two', '0', 1), 'two');
	assert.equal(pick('### Power (?)\n* one\n* two', '0', 0), '### Power\none');
});

test('take-all prompt: each click takes one, the last removes the prompt', () => {
	const src = 'You start with: (?*)\n[1 Weight] Rations\n[0 Weight] Dagger\nChoose one: (?)\na\nb';
	const one = pick(src, '0', 1);
	assert.equal(
		one,
		'[0 Weight] Dagger\nYou start with: (?*)\n[1 Weight] Rations\nChoose one: (?)\na\nb',
	);
	assert.equal(pick(one, '1', 0), '[0 Weight] Dagger\n[1 Weight] Rations\nChoose one: (?)\na\nb');
	// Shown as things to take, with no "choose N" label.
	const html = renderMarkdown(src, { choiceScope: 's' });
	assert.match(html, /<span class="choice-prompt">You start with:<\/span>/);
	assert.match(
		html,
		/class="choice-opt choice-line choice-move" data-cs="s" data-cg="0" data-co="0"/,
	);
});

test('heading prompt: sub-headings are the options', () => {
	const src = '## Background (?)\nintro\n\n### Human\nh\n\n### Elf\ne\n\n## Next\nn';
	assert.equal(pick(src, '0', 1), '## Background\nintro\n\n### Elf\ne\n\n## Next\nn');
	assert.equal(pick(src, '0', 0), '## Background\nintro\n\n### Human\nh\n\n## Next\nn');
});

test('heading prompt without sub-headings: its lines are the options', () => {
	const src = '### Alignment (?)\nGood: a\nEvil: b\n\n### Bonds\nx';
	assert.equal(pick(src, '0', 1), '### Alignment\nEvil: b\n\n### Bonds\nx');
});

test('heading prompt for several collects picks in a twin section', () => {
	const src = '## Moves (?2)\n\n### A\na\n\n### B\nb\n\n### C\nc\n\n## Next';
	const one = pick(src, '0', 1);
	assert.equal(one, '## Moves\n\n### B\nb\n\n## Moves (?)\n\n### A\na\n\n### C\nc\n\n## Next');
	const id = String(one.split('\n').indexOf('## Moves (?)'));
	assert.equal(pick(one, id, 1), '## Moves\n\n### B\nb\n\n### C\nc\n\n## Next');
});

test('a marked section joins an unmarked one of the same name before it', () => {
	const src =
		'## Starting Moves\n\n### Always\nx\n\n## Starting Moves (?)\n\n### A\na\n\n### B\nb\n';
	assert.equal(pick(src, '5', 1), '## Starting Moves\n\n### Always\nx\n\n### B\nb\n');
});

test('destination: the pick moves, the rest stay', () => {
	const src =
		'## Starting Moves\n\n### Bash\nx\n\n## Gear\nrope\n\n## Advanced Moves (?>Starting Moves) ::\n\n### Merciless\nm\n\n### Iron Hide\ni\n';
	const one = pick(src, '8', 0);
	assert.equal(
		one,
		'## Starting Moves\n\n### Bash\nx\n\n### Merciless\nm\n\n## Gear\nrope\n\n## Advanced Moves (?>Starting Moves) ::\n\n### Iron Hide\ni\n',
	);
	// Taking the last one retires the marker.
	const id = String(one.split('\n').findIndex((l) => l.startsWith('## Advanced')));
	assert.match(pick(one, id, 0), /## Advanced Moves ::\n$/);
});

test('destination that does not exist is created before the source section', () => {
	const src = '## Advanced Moves (?>Moves)\n\n### A\na\n\n### B\nb';
	assert.equal(
		pick(src, '0', 0),
		'## Moves\n\n### A\na\n\n## Advanced Moves (?>Moves)\n\n### B\nb',
	);
});

test('picking a name keeps it, sets it in the header and drops the other suggestions', () => {
	const src = '### Look\nx\n### Names\n*Elf*: [A | B](?)\n*Human*: [C | D](?)\n\n### Alignment';
	let name = null;
	const header = { setName: (n) => (name = n) };
	assert.equal(pick(src, '4:0', 1, header), '### Look\nx\n### Names\n*Human*: D\n\n### Alignment');
	assert.equal(name, 'D');
	// Other lines of the section are left alone.
	const titled = '### Names\n[A | B](?)\n\n*Titles*: the Bold\n\n### Next';
	assert.equal(pick(titled, '1:0', 0, header), '### Names\nA\n\n*Titles*: the Bold\n\n### Next');
	// Without a character header it is an ordinary choice.
	assert.equal(
		pick(src, '4:0', 1),
		'### Look\nx\n### Names\n*Elf*: [A | B](?)\n*Human*: D\n\n### Alignment',
	);
});

test('markers inside code, quotes and escapes are plain text', () => {
	const src = '```\nChoose: (?)\na\n```\n> Choose: (?)\n> a\nNot one \\(?)\nb\n\\[a | b](?)';
	assert.equal(parseChoices(src.split('\n')).groups.size, 0);
	assert.match(renderMarkdown('Not one \\(?)\nb'), /Not one \(\?\)/);
});

test('a prompt with no options is left alone', () => {
	assert.equal(parseChoices(['Why (?)', '', 'x']).groups.size, 0);
	assert.match(renderMarkdown('Why (?)'), /Why \(\?\)/);
});

test('rendering: prompts and options, clickable only with a scope', () => {
	const src = '## Background (?)\n### Human\nh\n### Elf\ne\n## Gear\nChoose two: (?2)\na\nb\nc';
	const live = renderMarkdown(src, { choiceScope: 's1' });
	assert.match(live, /<h2 class="choice-prompt" data-choose="choose one">Background<\/h2>/);
	assert.match(live, /<h3 class="choice-opt" data-cs="s1" data-cg="0" data-co="1">Elf<\/h3>/);
	assert.match(live, /<span class="choice-prompt">Choose two:<\/span>/);
	assert.match(live, /data-cg="6" data-co="2">c<\/span>/);
	const inert = renderMarkdown(src);
	assert.doesNotMatch(inert, /data-cs/);
	assert.doesNotMatch(inert, /\(\?/);
	assert.match(inert, /Choose two:/);
});

test('an option line is not click-to-copy until it is picked', () => {
	const src = '## Gear\nChoose one: (?)\n[1 Weight] Axe\n[2 Weight] Sword';
	assert.doesNotMatch(renderMarkdown(src, { choiceScope: 's' }), /copy-line/);
	assert.match(renderMarkdown(pick(src, '1', 0), { choiceScope: 's' }), /copy-line/);
});

// Every option the sheet renders must resolve to a pick, through the same
// chunk -> body line mapping the character sheet page uses.
function renderedOptions(body) {
	const found = [];
	let start = 0;
	splitMarkdownChunks(body).forEach((c, i) => {
		const html = renderMarkdown(c.text, {
			breakMode: c.breakMode,
			breakModeLevel: c.breakModeLevel,
			choiceScope: `c${i}`,
		});
		for (const m of html.matchAll(/data-cs="c\d+" data-cg="(\d+)(:\d+)?" data-co="(\d+)"/g)) {
			found.push({ id: `${+m[1] + start}${m[2] || ''}`, opt: +m[3] });
		}
		start += c.text.split('\n').length;
	});
	return found;
}

test('every option rendered for every class can be picked', () => {
	for (const f of classFiles) {
		const body = collapseTooltips(readClass(f));
		const lines = body.split('\n');
		const options = renderedOptions(body);
		const { groups } = parseChoices(lines);
		let expected = 0;
		for (const g of groups.values()) expected += g.options.length;
		assert.equal(options.length, expected, `${f}: rendered options vs parsed options`);
		for (const o of options) {
			assert.ok(pickChoice(lines, o.id, o.opt, { setName() {} }), `${f}: ${o.id}/${o.opt}`);
		}
	}
});

test('a fighter can be built by clicking alone', () => {
	let lines = collapseTooltips(readClass('Fighter.md')).split('\n');
	let name = null;
	const header = { setName: (n) => (name = n) };
	// Always take the first option on offer until only the open-ended
	// advanced/mastery lists are left.
	for (let guard = 0; guard < 100; guard++) {
		const next = renderedOptions(lines.join('\n')).find((o) => {
			const g = parseChoices(lines).groups.get(o.id);
			return Number.isFinite(g.choice.count) || !g.choice.dest;
		});
		if (!next) break;
		lines = pickChoice(lines, next.id, next.opt, header);
	}
	const text = lines.join('\n');
	assert.equal(name, 'Ozruk');
	assert.deepEqual(text.match(/\(\?[^)]*\)/g), ['(?>Starting Moves)', '(?>Starting Moves)']);
	assert.match(text, /^Range: Hand {2}$/m);
	assert.match(text, /^Range: Hand {2}\nmessy\n\nIt keeps you alive: /m);
	assert.match(text, /^## Background\n\n### Human\n/m);
	assert.doesNotMatch(text, /### Elf/);
	assert.match(text, /^\[1 Weight\] \[1 Armor\] Chainmail and /m);
	assert.doesNotMatch(text, /Scale Armor/);
	assert.match(text, /^\[22 Coin\]\n\[2 Weight\] 2 Healing Potions \[2 uses\]\n\n## Stats/m);
	assert.doesNotMatch(text, /^Choose .*:/m);
	assert.match(text, /^### Names\n\*Dwarf\*: Ozruk *\n\n### Alignment$/m);
	assert.doesNotMatch(text, /You start with/);
	assert.match(
		text,
		/^## Gear\n\[0 Weight\] Your Signature Weapon\n\[1 Weight\] Dungeon Rations \[5 rations\]\n\[1 Weight\] \[1 Armor\] Chainmail/m,
	);
});

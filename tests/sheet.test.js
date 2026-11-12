// Building a character sheet from a class (and its spell list).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseChoices, pickChoice } from '../src/lib/dw/choices.js';
import { parseHeading } from '../src/lib/dw/headings.js';
import { buildCharacterSheet } from '../src/lib/dw/sheetBuilder.js';

const read = (path) => readFileSync(new URL(`../src/lib/dw/${path}`, import.meta.url), 'utf8');
const sheet = (cls, spells, { spells: spellOpts, ...opts } = {}) =>
	buildCharacterSheet(read(cls), '/art.jpg', {
		spells: spells ? { raw: read(spells), ...spellOpts } : null,
		...opts,
	});

// The h2 sections of a sheet, in order, as { name: lines }.
function sections(text) {
	const out = new Map();
	let cur = null;
	for (const line of text.split('\n').slice(4)) {
		const h = parseHeading(line);
		if (h?.level === 2) out.set(h.text, (cur = [line]));
		else cur?.push(line);
	}
	return out;
}

const spellNames = (lines) =>
	lines
		.filter((l) => l.startsWith('### '))
		.map((l) => parseHeading(l).text.replace(/\s*<span.*$/, ''));

test('the class title is a collapsible h2 and the credit sits under the description', () => {
	const text = sheet('homebrew/classes/Fighter.md');
	const lines = text.split('\n');
	assert.equal(lines[0], 'The Fighter, Fighter 1');
	assert.equal(lines[4], '## The Fighter ::');
	assert.ok(!lines.some((l) => /^#\s/.test(l)), 'no h1 left');
	const s = sections(text);
	assert.deepEqual(
		[...s.keys()],
		[
			'The Fighter',
			'Gear',
			'Starting Moves',
			'Background',
			'Stats',
			'Advanced Moves',
			'Mastery Moves',
		],
	);
	const credit =
		'*A playbook by Sage LaTorra, Adam Koebel, Jeremy Strandberg, and Magnus Anderson*';
	assert.equal(
		s
			.get('The Fighter')
			.filter((l) => l.trim())
			.at(-1),
		credit,
	);
	// …so it no longer travels with the last mastery move when that is picked.
	assert.ok(!s.get('Mastery Moves').includes(credit));
	assert.equal(text.split(credit).length, 2);
});

test('a class without spells gets no spell sections', () => {
	const s = sections(sheet('homebrew/classes/Fighter.md'));
	assert.ok(!s.has('Spells') && !s.has('Spell Options'));
});

test('the wizard starts with cantrips, the other spells as options, and a 2d4 damage button', () => {
	const text = sheet('homebrew/classes/Living_Magus.md', 'homebrew/spells/Wizard_Spells.md', {
		extraDamage: '2d4',
	});
	assert.match(text.split('\n')[1], /Damage d4;2d4,/);
	const s = sections(text);
	assert.deepEqual(
		[...s.keys()],
		[
			'The Wizard',
			'Gear',
			'Starting Moves',
			'Background',
			'Stats',
			'Spells',
			'Advanced Moves',
			'Mastery Moves',
			'Spell Options',
		],
	);
	assert.deepEqual(spellNames(s.get('Spells')), [
		'Unseen Servant',
		'Prestidigitation',
		'Light',
		'Magic Missiles',
	]);
	assert.equal(s.get('Spell Options')[0], '## Spell Options (?>Spells) ::');
	assert.equal(s.get('Spell Options')[1], '*By Magnus Anderson*');
	const options = spellNames(s.get('Spell Options'));
	assert.ok(options.includes('Fireball') && options.includes('Alarm'));
	assert.ok(!options.includes('Light'));
	// Every spell on the spell page is in one section or the other.
	const all = read('homebrew/spells/Wizard_Spells.md')
		.split('\n')
		.filter((l) => l.startsWith('### '));
	assert.equal(options.length + 4, all.length);
});

test('picking a spell option moves it into Spells', () => {
	const text = sheet('homebrew/classes/Living_Magus.md', 'homebrew/spells/Wizard_Spells.md');
	const body = text.split('\n').slice(4);
	const { groups } = parseChoices(body);
	const group = [...groups.values()].find((g) => g.choice.dest === 'Spells');
	const fireball = group.options.findIndex((o) => body[o.start].startsWith('### Fireball'));
	const after = pickChoice(body, group.id, fireball);
	const s = sections(['', '', '', '', ...after].join('\n'));
	assert.equal(spellNames(s.get('Spells')).at(-1), 'Fireball');
	assert.ok(!spellNames(s.get('Spell Options')).includes('Fireball'));
	assert.equal(s.get('Spell Options')[0], '## Spell Options (?>Spells) ::');
	assert.equal(s.get('Spell Options')[1], '*By Magnus Anderson*');
});

test('the cleric has Miracles: rotes to start with, tagged with where they came from', () => {
	const text = sheet('homebrew/classes/Cleric.md', 'homebrew/spells/Cleric_Miracles.md', {
		spells: { heading: 'Miracles' },
	});
	const cleric = sections(text);
	assert.ok(!cleric.has('Spells'));
	assert.deepEqual(spellNames(cleric.get('Miracles')), ['Light', 'Sanctify', 'Guidance']);
	assert.ok(cleric.get('Miracles').includes('### Light <span style="float:right">Rote</span>'));
	const options = cleric.get('Spell Options');
	assert.equal(options[0], '## Spell Options (?>Miracles) ::');
	assert.ok(options.includes('### Bless <span style="float:right">Level 1</span>'));
	assert.ok(options.includes('### Heal <span style="float:right">Level 7</span>'));
});

test('the druid has Bindings: none to start with, whispers among the options', () => {
	const note = 'Take the advanced move **God Amidst The Wastes** to cast Bindings.';
	const text = sheet('homebrew/classes/Druidess.md', 'homebrew/spells/Druid_Bindings.md', {
		spells: { heading: 'Bindings', emptyNote: note },
	});
	const druid = sections(text);
	assert.deepEqual(
		druid.get('Bindings').filter((l) => l.trim()),
		['## Bindings', note],
	);
	const options = druid.get('Spell Options');
	assert.equal(options[0], '## Spell Options (?>Bindings) ::');
	assert.deepEqual(spellNames(options).slice(0, 4), [
		'Calming Aura',
		'Magnetize',
		'Wildwords',
		'Cure Light Wounds',
	]);
	assert.ok(options.includes('### Wildwords <span style="float:right">Whisper</span>'));
	// The move it points at exists.
	assert.ok(druid.get('Advanced Moves').includes('### God Amidst The Wastes'));

	// Picking one puts it under the note.
	const body = text.split('\n').slice(4);
	const group = [...parseChoices(body).groups.values()].find((g) => g.choice.dest === 'Bindings');
	const after = sections(['', '', '', '', ...pickChoice(body, group.id, 1)].join('\n'));
	assert.deepEqual(
		after
			.get('Bindings')
			.filter((l) => l.trim())
			.slice(0, 3),
		['## Bindings', note, '### Magnetize <span style="float:right">Whisper</span>'],
	);
});

test('an SRD caster works too', () => {
	const text = sheet('srd/Wizard.md', 'srd/Wizard_Spells.md', { hardWrapped: true });
	const s = sections(text);
	assert.equal(text.split('\n')[4], '## The Wizard ::');
	assert.ok(spellNames(s.get('Spells')).includes('Light Cantrip'));
	assert.ok(s.get('Spell Options').some((l) => l.startsWith('### Magic Missile Level 1')));
	assert.equal([...s.keys()].at(-1), 'Spell Options');
});

test('a class starts with its own stats, and HP to match its Constitution', () => {
	const wizard = sheet('homebrew/classes/Living_Magus.md', null, {
		stats: 'STR -1, DEX 1, CON 0, INT 2, WIS 1, CHA 0',
	}).split('\n');
	assert.equal(wizard[2], 'STR -1, DEX 1, CON 0, INT 2, WIS 1, CHA 0');
	assert.match(wizard[1], /Base HP 13, .* HP 13$/); // 4 + 9, and no Constitution bonus
	const druid = sheet('homebrew/classes/Druidess.md', null, {
		stats: 'STR 1, DEX 0, CON 2, INT -1, WIS 1, CHA 0',
	}).split('\n');
	assert.match(druid[1], /Base HP 15, .* HP 21$/);
	// Without any, the generic spread.
	assert.equal(
		sheet('homebrew/classes/Fighter.md').split('\n')[2],
		'STR 2, DEX 1, CON 1, INT 0, WIS 0, CHA -1',
	);
});

test('every class in the sidebar has a stat spread of +2, +1, +1, 0, 0, -1', () => {
	// navigation.js cannot be imported outside the bundler; read its text.
	const nav = read('navigation.js');
	const classes = nav.slice(nav.indexOf("category: 'Classes'"), nav.indexOf("category: 'Spells'"));
	const entries = classes.match(/file: '[^']+',\n\s*stats: '[^']+'/g) || [];
	assert.equal(entries.length, (classes.match(/file: '/g) || []).length);
	assert.ok(entries.length >= 17);
	for (const e of entries) {
		const stats = e.match(/stats: '([^']+)'/)[1];
		assert.deepEqual(stats.match(/[A-Z]{3}/g), ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'], e);
		const values = stats
			.match(/-?\d+/g)
			.map(Number)
			.sort((a, b) => a - b);
		assert.deepEqual(values, [-1, 0, 0, 1, 1, 2], e);
	}
});

test("the wizard's spellbook weighs nothing", () => {
	assert.match(sheet('homebrew/classes/Living_Magus.md'), /^\[0 Weight\] Your Spellbook$/m);
});

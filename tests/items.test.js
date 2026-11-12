// Weights, counters (uses / charges / ammo / rations) and what they add up to.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { pickChoice } from '../src/lib/dw/choices.js';
import { carriedLoad, counterRe, isSpent } from '../src/lib/dw/items.js';
import { renderMarkdown } from '../src/lib/dw/renderMarkdown.js';

const load = (...lines) => carriedLoad(lines.join('\n'));
const count = (html, re) => (html.match(re) || []).length;

test('weight, armor and coin add up', () => {
	assert.deepEqual(
		load(
			'## Gear',
			'[1 Weight] [1 Armor] Leather Armor',
			'[2 Weight] [+1 Armor] Shield',
			'[2 Armor] Chainmail, in a sack',
			'[250 Coin]',
		),
		{ weight: 5, armor: 3 },
	);
});

test('an item that has run out weighs nothing', () => {
	assert.equal(load('[1 Weight] Bundle of Arrows [3 ammo]').weight, 1);
	assert.equal(load('[1 Weight] Bundle of Arrows [1/3 ammo]').weight, 1);
	assert.equal(load('[1 Weight] Bundle of Arrows [0/3 ammo]').weight, 0);
	assert.equal(load('[1 Weight] 3 Throwing Daggers [0/3 charges]').weight, 0);
	assert.equal(load('[1 Weight] Bandages [0/3 uses]').weight, 0);
	assert.equal(load('[1 Weight] Dungeon Rations [0/5 rations]').weight, 0);
	// Two counters: empty only when both are.
	assert.equal(load('[1 Weight] Wand [0/3 charges] [1 use]').weight, 1);
	assert.equal(load('[1 Weight] Wand [0/3 charges] [0/1 use]').weight, 0);
});

test('a counter belongs to the weight before it', () => {
	const bow = '[2 Weight] Ragged Bow (near) and [1 Weight] Bundle of Arrows';
	assert.equal(load(`${bow} [3 ammo]`).weight, 3);
	assert.equal(load(`${bow} [0/3 ammo]`).weight, 2);
	assert.equal(
		load('[2 Weight] Worn bow, [1 Weight] Bundle of arrows [0/3 ammo], and [1 Weight] Short sword')
			.weight,
		3,
	);
	assert.equal(isSpent(' Bundle of Arrows [0/3 ammo]'), true);
	assert.equal(isSpent(' Short sword'), false);
});

test('options nobody has taken are not carried', () => {
	const gear = [
		'## Gear',
		'You start with: (?*)',
		'[1 Weight] Dungeon Rations [5 rations]',
		'Choose your attire: (?)',
		"[0 Weight] Noble's Silks and [300 Coin]",
		'[1 Weight] [1 Armor] Leather (worn)',
		'',
		'[4 Weight] An anvil',
		'Range: [[1 Weight] Sling | [2 Weight] Bow](?)',
	];
	assert.deepEqual(carriedLoad(gear.join('\n')), { weight: 4, armor: 0 });
	const rations = pickChoice(gear, 1, 0);
	assert.deepEqual(carriedLoad(rations.join('\n')), { weight: 5, armor: 0 });
	const leather = pickChoice(rations, 2, 1);
	assert.deepEqual(carriedLoad(leather.join('\n')), { weight: 6, armor: 1 });
	const bow = pickChoice(leather, `${leather.findIndex((l) => l.startsWith('Range'))}:0`, 1);
	assert.deepEqual(carriedLoad(bow.join('\n')), { weight: 8, armor: 1 });
	// Moves on offer under a heading are not carried either.
	assert.equal(
		load('## Advanced Moves (?>Moves)', '### Pack Mule', '[3 Weight] A pack', '## Moves').weight,
		0,
	);
});

test('a fresh sheet carries nothing until its gear is chosen', async () => {
	const { buildCharacterSheet } = await import('../src/lib/dw/sheetBuilder.js');
	const dir = new URL('../src/lib/dw/homebrew/classes/', import.meta.url);
	for (const f of readdirSync(dir).filter((x) => x.endsWith('.md'))) {
		const body = buildCharacterSheet(readFileSync(new URL(f, dir), 'utf8'), '')
			.split('\n')
			.slice(4)
			.join('\n');
		if (!/^You start with: \(\?\*\)$/m.test(body)) continue;
		assert.deepEqual(carriedLoad(body), { weight: 0, armor: 0 }, f);
	}
});

test('ammo is drawn as quivers, the spent ones empty', () => {
	const html = renderMarkdown('[1 Weight] Bundle of Arrows [1/3 ammo]');
	assert.equal(count(html, /class="ammo-icon"/g), 3);
	assert.equal(count(html, /class="ammo-icon"[^>]*data-state="used"/g), 2);
	assert.equal(count(html, /class="ammo-icon"[^>]*data-state="remaining"/g), 1);
	assert.ok(!html.replace(/<[^>]*>/g, '').includes('ammo'), 'no marker left in the text');
	// The other counters still come out as themselves.
	const all = renderMarkdown('[3 uses] [2 charges] [1 Charge] [5 rations] [1 ammo]');
	assert.equal(count(all, /class="uses-icon"/g), 3);
	assert.equal(count(all, /class="charges-icon"/g), 3);
	assert.equal(count(all, /class="rations-icon"/g), 5);
	assert.equal(count(all, /class="ammo-icon"/g), 1);
	assert.equal('[2/3 Ammo]'.replace(counterRe('ammo'), '$1 of $2 $3'), '2 of 3 Ammo');
});

test('the weight of an item that has run out is drawn faded', () => {
	const spent = (src) => count(renderMarkdown(src), /weight-icon weight-spent/g);
	assert.equal(spent('[1 Weight] Bundle of Arrows [3 ammo]'), 0);
	assert.equal(spent('[1 Weight] Bundle of Arrows [0/3 ammo]'), 1);
	assert.equal(spent('[2 Weight] Bow and [1 Weight] Arrows [0/3 ammo]'), 1);
	assert.equal(spent('- [1 Weight] Daggers [0/3 charges]'), 1);
	assert.equal(spent('[1 Weight] Sword'), 0);
});

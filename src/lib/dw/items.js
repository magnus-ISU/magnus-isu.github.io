// Item markers: what a thing weighs, and how much of it is left.
//
//   [1 Weight]  [2 Armor]  [+1 Armor]  [10 Coin]
//   [3 uses]  [5 rations]     consumed: ticked off one by one, and the item
//                             goes with the last
//   [3 charges]  [3 ammo]     spent and had back: the item stays at none
//
// A counter that has been drawn on is written "[1/3 ammo]": one left of three.

import { parseChoices } from './choices.js';
import { collapseTooltips } from './tooltips.js';

const COUNTER_WORDS = { uses: 'uses?', charges: 'charges?', ammo: 'ammo', rations: 'rations?' };
export const COUNTER_KINDS = Object.keys(COUNTER_WORDS);

// Matches one kind of counter: [1] what is left (or the full count), [2] the
// full count if written, [3] the word as written.
export const counterRe = (kind) =>
	new RegExp(String.raw`\[(\d+)(?:\/(\d+))?\s+(${COUNTER_WORDS[kind]})\]`, 'gi');

const ANY_COUNTER_RE = new RegExp(
	String.raw`\[(\d+)(?:\/(\d+))?\s+(?:${Object.values(COUNTER_WORDS).join('|')})\]`,
	'gi',
);
const WEIGHT_RE = /\[([^\]]+) Weight\]/gi;

// Whether the item described by `text` has counters, all of them run out.
export function isSpent(text) {
	let counters = 0;
	for (const m of text.matchAll(ANY_COUNTER_RE)) {
		if (Math.min(+m[1], +(m[2] ?? m[1])) > 0) return false;
		counters++;
	}
	return counters > 0;
}

// An item is written weight first — "[1 Weight] Bundle of Arrows [3 ammo]" —
// so the text a weight marker speaks for runs from the marker to the next one.
// `from` is the offset just past the marker.
export function weighedItem(line, from) {
	WEIGHT_RE.lastIndex = from;
	const next = WEIGHT_RE.exec(line);
	return line.slice(from, next ? next.index : line.length);
}

// What a sheet's body adds up to: the weight carried and the armor worn.
// - Something that has run out weighs nothing: an empty quiver, daggers that
//   have all been thrown.
// - Options of a choice nobody has made yet are not the character's.
// - A hundred coins weigh 1. "[2 Armor]" is armor worn, of which only the best
//   counts; "[+1 Armor]" adds to it.
export function carriedLoad(body) {
	const lines = collapseTooltips(body).split('\n');
	const offered = new Set(); // lines that are options
	const inlineSpans = new Map(); // line -> [start, end) spans of inline choices
	for (const g of parseChoices(lines).groups.values()) {
		if (g.kind === 'inline') {
			if (!inlineSpans.has(g.line)) inlineSpans.set(g.line, []);
			inlineSpans.get(g.line).push([g.start, g.end]);
		} else {
			for (const o of g.options) for (let j = o.start; j < o.end; j++) offered.add(j);
		}
	}

	let weight = 0;
	let coins = 0;
	let baseArmor = 0;
	let bonusArmor = 0;
	for (let i = 0; i < lines.length; i++) {
		if (offered.has(i)) continue;
		let line = lines[i];
		if (!line.includes('[')) continue;
		for (const [start, end] of (inlineSpans.get(i) ?? []).slice().reverse()) {
			line = line.slice(0, start) + line.slice(end);
		}
		for (const m of line.matchAll(/\[([+-]?)(\d+)\s+(Weight|Armor|Coin)\]/gi)) {
			const val = (m[1] === '-' ? -1 : 1) * +m[2];
			const type = m[3].toLowerCase();
			if (type === 'weight') {
				if (!isSpent(weighedItem(line, m.index + m[0].length))) weight += val;
			} else if (type === 'coin') coins += val;
			else if (m[1]) bonusArmor += val;
			else baseArmor = Math.max(baseArmor, val);
		}
	}
	return { weight: weight + Math.floor(coins / 100), armor: baseArmor + bonusArmor };
}

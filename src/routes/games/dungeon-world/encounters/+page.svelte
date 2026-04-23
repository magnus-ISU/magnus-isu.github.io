<script>
import { tick } from 'svelte';
import MonsterSearch from '$lib/components/MonsterSearch.svelte';
import MonsterStatblock from '$lib/components/MonsterStatblock.svelte';
import TextBox from '$lib/components/TextBox.svelte';
import { encounterText } from '$lib/dw/encounterText.svelte.js';
import { allMonsters } from '$lib/dw/monsters.js';
import { parseMonsterText } from '$lib/dw/monsterText.js';
import { monsterUndo } from '$lib/dw/monsterUndo.svelte.js';
import { pageArt } from '$lib/dw/navigation.js';
import { userMonsters } from '$lib/dw/userMonsters.svelte.js';

const artUrl =
	typeof pageArt.encounters === 'string' ? pageArt.encounters : pageArt.encounters?.url;
let art = $state(null);
$effect(() => {
	if (!artUrl) return;
	if (document.readyState === 'complete') {
		art = artUrl;
	} else {
		const handler = () => {
			art = artUrl;
		};
		window.addEventListener('load', handler, { once: true });
		return () => window.removeEventListener('load', handler);
	}
});

const et = encounterText;
const encounterPlaceholder = `Bandit King (Vizzini,)\nBandit (Fezzik, Inigo Montoya)\nWild Dog (3)\nHawk`;

let textBox;
let textBoxEl;

function scrollToTextarea() {
	// Scroll immediately to prevent the browser from jumping to the top
	// when search results disappear due to layout shift
	textBoxEl?.scrollIntoView({ block: 'start' });
	// Then smooth-scroll to the final position after Svelte updates the DOM
	tick().then(() => {
		textBoxEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		textBox?.focus();
	});
}

const knownMonsters = $derived([...userMonsters.list, ...allMonsters]);
const maxWords = $derived(Math.max(...knownMonsters.map((m) => m.name.split(/\s+/).length), 1));

// Keep the store aware of valid monster names for cleanup on shift+click
$effect(() => {
	encounterText.setKnownNames(knownMonsters.map((m) => m.name));
});

// Parse parenthetical after a monster name:
// (4) → count=4 unnamed, (Boss,) → 1 named "Boss", (2,) → 1 named "2"
// (John, Paul) → 2 named
// (11 Vizzini,) → 1 named "Vizzini" with hp=11
// (2 Fezzik, 2 Inigo Montoya) → 2 named with hp values
// (2 HP,) → 1 unnamed with hp=2
// (2 #1, 2 #2, 2 #3) → 3 unnamed with hp values
function parseParen(str) {
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

// Greedy name matching — operates on ranges within each line
const parsed = $derived.by(() => {
	if (!et.value.trim()) return { matched: [], unmatched: '' };
	const nameMap = new Map(knownMonsters.map((m) => [m.name.toLowerCase(), m]));
	const results = [];
	const missed = [];
	const lines = et.value.split('\n');
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
});
const matched = $derived(parsed.matched);
const unmatched = $derived(parsed.unmatched);

// Build parenthetical string from labels and optional HP values
function buildParen(labels, count, hps) {
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

function updateMonsterParen(monsterName, newLabels, count, hps) {
	const lines = et.value.split('\n');
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
			et.value = lines.join('\n');
			return;
		}
	}
}

function onLabelsChange(monsterName, newLabels, count, hps) {
	updateMonsterParen(monsterName, newLabels, count, hps);
}

function onHpChange(monsterName, newHps, newLabels, count, maxHp) {
	// Omit HP number for instances at full health
	const hpsToSave = newHps.map((h) => (h === maxHp ? null : h));
	updateMonsterParen(monsterName, newLabels, count, hpsToSave);
}

let h1Copied = $state(false);
</script>

<svelte:window onkeydown={(e) => {
	if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey && monsterUndo.length) {
		e.preventDefault();
		monsterUndo.pop();
	}
}} />

<svelte:head>
	<title>Encounters - Dungeon World</title>
</svelte:head>

<article class="dw-article">
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<h1 class:copied={h1Copied} onclick={() => { if (et.value.trim()) { navigator.clipboard.writeText(et.value.trim()); h1Copied = true; setTimeout(() => { h1Copied = false; }, 1000); } }} onkeydown={(e) => { if (e.key === 'Enter' && et.value.trim()) { navigator.clipboard.writeText(et.value.trim()); h1Copied = true; setTimeout(() => { h1Copied = false; }, 1000); } }} style="cursor: pointer">Encounters</h1>

	<section class="encounter-input">
		<label for="encounter-text">
			Type monster names to build an encounter. Shift click, long-press, or double-click monster names to add them.
			Click on HP to track it, attacks to roll them, moves to note usage.
		</label>
		<div bind:this={textBoxEl}></div>
		<TextBox bind:this={textBox} bind:value={et.value} placeholders={et.value.trim() ? [] : encounterPlaceholder.split('\n')} rows={5} onkeydown={(e) => {
			if (e.key === 'ArrowRight' && !et.value.trim()) {
				e.preventDefault();
				et.value = encounterPlaceholder;
			}
		}} oninput={() => {
			textBoxEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}} />
	</section>

	{#if matched.length > 0}
		<section class="encounter-results" class:two-col={matched.length >= 2}>
			{#each matched as m, i (i)}
				<MonsterStatblock {...m} open={true} locked={true} onLabelsChange={(newLabels, count, hps) => onLabelsChange(m.name, newLabels, count, hps)} onHpChange={(newHps, newLabels, count, maxHp) => onHpChange(m.name, newHps, newLabels, count, maxHp)} />
			{/each}
		</section>
	{/if}

	<section class="monster-search-section">
		<MonsterSearch hint={unmatched} onEncounterAdd={scrollToTextarea} />
	</section>
</article>

{#if art}
	<div class="bg-art">
		<img src={art} alt="" />
	</div>
{/if}

<style>
	.bg-art {
		position: fixed;
		inset: 0;
		z-index: -1;
		pointer-events: none;
	}

	.bg-art img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0.12;
	}

	.encounter-input {
		margin-bottom: 1.5rem;
	}

	.encounter-input label {
		display: block;
		font-size: 0.65rem;
		color: #999;
		margin-bottom: 0.4rem;
	}

	.encounter-results {
		margin-bottom: 1rem;
	}

	.encounter-results.two-col {
		columns: 2;
		column-gap: 0.5rem;
	}

	.encounter-results.two-col > :global(.monster) {
		break-inside: avoid;
		margin-bottom: 0.5rem;
	}

	.encounter-results.two-col > :global(.monster.is-expanded) {
		margin-top: 0;
	}

	@media (max-width: 1028px) {
		.encounter-results.two-col {
			columns: 1;
		}
	}

	.monster-search-section {
		margin-top: 2rem;
	}

	h1.copied {
		color: #8f8;
		transition: color 0.15s;
	}

	h1.copied::after {
		content: 'Copied!';
		font-size: 0.6em;
		color: #8f8;
		margin-left: 0.75rem;
		font-weight: normal;
	}
</style>

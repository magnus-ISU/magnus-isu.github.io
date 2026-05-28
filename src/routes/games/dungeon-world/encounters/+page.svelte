<script>
import { tick } from 'svelte';
import MonsterSearch from '$lib/components/MonsterSearch.svelte';
import MonsterStatblock from '$lib/components/MonsterStatblock.svelte';
import TextBox from '$lib/components/TextBox.svelte';
import { parseEncounter, updateMonsterParen } from '$lib/dw/encounterParse.js';
import { encounterText } from '$lib/dw/encounterText.svelte.js';
import { allMonsters } from '$lib/dw/monsters.js';
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

// Keep the store aware of valid monster names for cleanup on shift+click
$effect(() => {
	encounterText.setKnownNames(knownMonsters.map((m) => m.name));
});

// Parse the encounter text into matched monster instances + leftover words.
const parsed = $derived(parseEncounter(et.value, knownMonsters));
const matched = $derived(parsed.matched);
const unmatched = $derived(parsed.unmatched);

function onLabelsChange(monsterName, newLabels, count, hps) {
	et.value = updateMonsterParen(et.value, monsterName, newLabels, count, hps);
}

function onHpChange(monsterName, newHps, newLabels, count, maxHp) {
	// Omit HP number for instances at full health
	const hpsToSave = newHps.map((h) => (h === maxHp ? null : h));
	et.value = updateMonsterParen(et.value, monsterName, newLabels, count, hpsToSave);
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

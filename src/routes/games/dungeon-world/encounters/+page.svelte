<script>
	import MonsterStatblock from '$lib/components/MonsterStatblock.svelte';
	import MonsterSearch from '$lib/components/MonsterSearch.svelte';
	import TextBox from '$lib/components/TextBox.svelte';
	import { allMonsters } from '$lib/dw/monsters.js';
	import { userMonsters } from '$lib/dw/userMonsters.svelte.js';
	import { encounterText } from '$lib/dw/encounterText.svelte.js';
	import { tick } from 'svelte';

	let text = $state(encounterText.value);
	const encounterPlaceholder = `Bandit King\n3 bandit\nowlbear`;

	// Sync local → store
	$effect(() => { encounterText.value = text; });

	// Sync store → local (shift+click from other components)
	let encounterInputEl;
	let textBox;
	$effect(() => {
		const storeVal = encounterText.value;
		if (storeVal !== text) {
			text = storeVal;
			tick().then(() => {
				encounterInputEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
				textBox?.focus();
			});
		}
	});

	const knownMonsters = $derived([...userMonsters.list, ...allMonsters]);
	const maxWords = $derived(Math.max(...knownMonsters.map((m) => m.name.split(/\s+/).length), 1));

	// Keep the store aware of valid monster names for cleanup on shift+click
	$effect(() => { encounterText.setKnownNames(knownMonsters.map(m => m.name)); });

	// Greedy name matching — tries longest prefix first
	const parsed = $derived.by(() => {
		if (!text.trim()) return { matched: [], unmatched: '' };
		const nameMap = new Map(knownMonsters.map((m) => [m.name.toLowerCase(), m]));
		const results = [];
		const missed = [];
		for (const line of text.split('\n')) {
			let words = line.trim().replace(/,/g, '').split(/\s+/).filter(Boolean);
			const lineUnmatched = [];
			while (words.length > 0) {
				let count = 1;
				let offset = 0;
				if (/^\d+$/.test(words[0]) && words.length > 1) {
					count = +words[0];
					offset = 1;
				}
				let found = false;
				for (let len = Math.min(words.length - offset, maxWords); len > 0; len--) {
					const candidate = words.slice(offset, offset + len).join(' ').toLowerCase();
					if (nameMap.has(candidate)) {
						results.push({ ...nameMap.get(candidate), count });
						words = words.slice(offset + len);
						found = true;
						break;
					}
				}
				if (!found) {
					lineUnmatched.push(words[0]);
					words = words.slice(1);
				}
			}
			if (lineUnmatched.length) missed.push(lineUnmatched.join(' '));
		}
		return { matched: results, unmatched: missed.join(' ') };
	});
	const matched = $derived(parsed.matched);
	const unmatched = $derived(parsed.unmatched);


</script>

<svelte:head>
	<title>Encounters - Dungeon World</title>
</svelte:head>

<article class="dw-article">
	<h1>Encounters</h1>

	<section class="encounter-input" bind:this={encounterInputEl}>
		<label for="encounter-text">
			Type monster names to build an encounter. Shift Click or Long Press monster names to add them.
			Click on HP to track it, attacks to roll them, moves to note usage.
		</label>
		<TextBox bind:this={textBox} bind:value={text} placeholders={text.trim() ? [] : encounterPlaceholder.split('\n')} rows={5} />
	</section>

	{#if matched.length > 0}
		<section class="encounter-results">
			{#each matched as m, i (i)}
				<MonsterStatblock {...m} open={true} />
			{/each}
		</section>
	{/if}

	<section class="monster-search-section">
		<MonsterSearch hint={unmatched} />
	</section>
</article>

<style>
	.encounter-input {
		margin-bottom: 1.5rem;
	}

	.encounter-input label {
		display: block;
		font-size: 0.65rem;
		color: #999;
		margin-bottom: 0.4rem;
	}

	.match-count {
		color: #888;
		font-size: 0.8rem;
		margin: 0.3rem 0 0;
	}

	.encounter-results {
		margin-bottom: 1rem;
	}

	.monster-search-section {
		margin-top: 2rem;
	}
</style>

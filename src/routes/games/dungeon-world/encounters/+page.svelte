<script>
	import MonsterStatblock from '$lib/components/MonsterStatblock.svelte';
	import TextBox from '$lib/components/TextBox.svelte';
	import { monsterSections, allMonsters } from '$lib/dw/monsters.js';
	import { userMonsters } from '$lib/dw/userMonsters.svelte.js';
	import { encounterText } from '$lib/dw/encounterText.svelte.js';
	import { tick } from 'svelte';

	let text = $state(encounterText.value);
	const encounterPlaceholder = `Bandit King\n3 bandit\nowlbear`;

	// Sync local → store
	$effect(() => { encounterText.value = text; });

	// Sync store → local (shift+click from other components)
	let searchSectionEl;
	$effect(() => {
		const storeVal = encounterText.value;
		if (storeVal !== text) {
			// Anchor the search section so the clicked monster doesn't jump
			const anchorTop = searchSectionEl?.getBoundingClientRect().top;
			text = storeVal;
			tick().then(() => {
				if (anchorTop == null || !searchSectionEl) return;
				const drift = searchSectionEl.getBoundingClientRect().top - anchorTop;
				if (Math.abs(drift) > 0.5) window.scrollBy(0, drift);
			});
		}
	});

	const knownMonsters = $derived([...userMonsters.list, ...allMonsters]);
	const maxWords = $derived(Math.max(...knownMonsters.map((m) => m.name.split(/\s+/).length), 1));

	// Greedy name matching — tries longest prefix first
	const matched = $derived.by(() => {
		if (!text.trim()) return [];
		const nameMap = new Map(knownMonsters.map((m) => [m.name.toLowerCase(), m]));
		const results = [];
		for (const line of text.split('\n')) {
			let words = line.trim().split(/\s+/).filter(Boolean);
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
				if (!found) words = words.slice(1);
			}
		}
		return results;
	});

	// Search bar — regex-enabled, same as All Monsters
	let search = $state('');
	const filteredSections = $derived.by(() => {
		if (!search.trim()) return [];
		const q = search.trim();
		let test;
		try {
			const re = new RegExp(q, 'i');
			test = (name) => re.test(name);
		} catch {
			const lower = q.toLowerCase();
			test = (name) => name.toLowerCase().includes(lower);
		}
		return monsterSections
			.map(s => ({
				...s,
				monsters: s.monsters.filter(m => test(m.name))
			}))
			.filter(s => s.monsters.length > 0);
	});
	const filteredCount = $derived(filteredSections.reduce((n, s) => n + s.monsters.length, 0));
	const autoExpand = $derived(search.trim() && filteredCount > 0 && filteredCount <= 3);
</script>

<svelte:head>
	<title>Encounters - Dungeon World</title>
</svelte:head>

<article class="dw-article">
	<h1>Encounters</h1>

	<section class="encounter-input">
		<label for="encounter-text">
			Type monster names to build an encounter. Shift Click or Long Press monster names to add them.
			Click on HP to track it, attacks to roll them, moves to note usage.
		</label>
		<TextBox bind:value={text} placeholders={text.trim() ? [] : encounterPlaceholder.split('\n')} rows={5} />
	</section>

	{#if matched.length > 0}
		<section class="encounter-results">
			{#each matched as m, i (i)}
				<MonsterStatblock {...m} open={true} />
			{/each}
		</section>
	{/if}

	<section class="monster-search-section" bind:this={searchSectionEl}>
		<input class="monster-search" type="text" placeholder="Search monsters…" bind:value={search} />
		{#each filteredSections as section}
			<h2>{section.name}</h2>
			{#each section.monsters as m}
				<MonsterStatblock {...m} open={autoExpand} />
			{/each}
		{/each}
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

	.monster-search {
		width: 100%;
		box-sizing: border-box;
		background: #161616;
		border: 1px solid #333;
		border-radius: 6px;
		color: #ddd;
		font-family: inherit;
		font-size: 0.9rem;
		padding: 0.5rem 0.75rem;
		margin-bottom: 1rem;
		outline: none;
	}

	.monster-search:focus {
		border-color: #d4a847;
	}
</style>

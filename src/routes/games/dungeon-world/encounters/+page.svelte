<script>
	import MonsterStatblock from '$lib/components/MonsterStatblock.svelte';
	import { allMonsters } from '$lib/dw/monsters.js';
	import { userMonsters } from '$lib/dw/userMonsters.svelte.js';

	let text = $state('');
	const encounterPlaceholder = `Bandit King\n3 bandit\nowlbear`;

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
</script>

<svelte:head>
	<title>Encounters - Dungeon World</title>
</svelte:head>

<article class="dw-article">
	<h1>Encounters</h1>

	<section class="encounter-input">
		<label for="encounter-text">Type monster names to build an encounter</label>
		<textarea
			id="encounter-text"
			bind:value={text}
			placeholder={encounterPlaceholder}
			rows="5"
		></textarea>
		{#if matched.length > 0}
			<p class="match-count">{matched.length} creature{matched.length === 1 ? '' : 's'}</p>
		{/if}
	</section>

	{#if matched.length > 0}
		<section class="encounter-results">
			{#each matched as m, i (i)}
				<MonsterStatblock {...m} open={true} />
			{/each}
		</section>
	{/if}
</article>

<style>
	.encounter-input {
		margin-bottom: 1.5rem;
	}

	.encounter-input label {
		display: block;
		font-size: 0.85rem;
		color: #999;
		margin-bottom: 0.4rem;
	}

	.encounter-input textarea {
		width: 100%;
		background: #161616;
		border: 1px solid #333;
		border-radius: 6px;
		color: #ddd;
		font-family: inherit;
		font-size: 0.9rem;
		padding: 0.6rem 0.75rem;
		resize: vertical;
		outline: none;
	}

	.encounter-input textarea:focus {
		border-color: #d4a847;
	}

	.match-count {
		color: #888;
		font-size: 0.8rem;
		margin: 0.3rem 0 0;
	}

	.encounter-results {
		margin-bottom: 1rem;
	}
</style>

<script>
	import MonsterStatblock from './MonsterStatblock.svelte';
	import { monsterSections } from '$lib/dw/monsters.js';
	import { userMonsters } from '$lib/dw/userMonsters.svelte.js';

	let {
		/** Show all sections when search is empty */
		showAll = false,
	} = $props();

	let search = $state('');

	const filteredSections = $derived.by(() => {
		if (!search.trim()) {
			if (!showAll) return [];
			const sections = [...monsterSections];
			if (userMonsters.list.length > 0) {
				sections.unshift({ slug: 'user-monsters', name: 'User Monsters', monsters: userMonsters.list });
			}
			return sections;
		}
		const q = search.trim();
		let test;
		try {
			const re = new RegExp(q, 'i');
			test = (name) => re.test(name);
		} catch {
			const lower = q.toLowerCase();
			test = (name) => name.toLowerCase().includes(lower);
		}
		const sections = monsterSections
			.map(s => ({ ...s, monsters: s.monsters.filter(m => test(m.name)) }))
			.filter(s => s.monsters.length > 0);
		const matchedUser = userMonsters.list.filter(m => test(m.name));
		if (matchedUser.length > 0) {
			sections.unshift({ slug: 'user-monsters', name: 'User Monsters', monsters: matchedUser });
		}
		return sections;
	});

	const filteredCount = $derived(filteredSections.reduce((n, s) => n + s.monsters.length, 0));
	const autoExpand = $derived(search.trim() && filteredCount > 0 && filteredCount <= 3);
</script>

<div class="monster-search-wrap">
	<input class="monster-search" type="text" placeholder="Search monsters…" bind:value={search} />
	{#each filteredSections as section}
		<h2>{section.name}</h2>
		{#each section.monsters as m}
			<MonsterStatblock {...m} open={autoExpand} />
		{/each}
	{/each}
</div>

<style>
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

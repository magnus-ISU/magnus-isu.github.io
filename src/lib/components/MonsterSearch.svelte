<script>
import { globalExpand } from '$lib/dw/descExpanded.svelte.js';
import { monsterSections } from '$lib/dw/monsters.js';
import { userMonsters } from '$lib/dw/userMonsters.svelte.js';
import MonsterStatblock from './MonsterStatblock.svelte';

let {
	/** Show all sections when search is empty */
	showAll = false,
	/** External search hint (used when the user hasn't typed anything) */
	hint = '',
	/** Forwarded to each MonsterStatblock */
	onEncounterAdd = null,
} = $props();

let userTyped = $state(false);
let search = $state('');
const isHint = $derived(!userTyped && !!hint);

$effect(() => {
	if (!userTyped) search = hint;
});

function onSearchInput(e) {
	search = e.target.value;
	userTyped = !!e.target.value;
}

const filteredSections = $derived.by(() => {
	if (!search.trim()) {
		if (!showAll) return [];
		const sections = [...monsterSections];
		if (userMonsters.list.length > 0) {
			sections.unshift({
				slug: 'user-monsters',
				name: 'User Monsters',
				monsters: userMonsters.list,
			});
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
		.map((s) => ({ ...s, monsters: s.monsters.filter((m) => test(m.name)) }))
		.filter((s) => s.monsters.length > 0);
	const matchedUser = userMonsters.list.filter((m) => test(m.name));
	if (matchedUser.length > 0) {
		sections.unshift({ slug: 'user-monsters', name: 'User Monsters', monsters: matchedUser });
	}
	return sections;
});

const filteredCount = $derived(filteredSections.reduce((n, s) => n + s.monsters.length, 0));
const autoExpand = $derived(search.trim() && filteredCount > 0 && filteredCount <= 3);
</script>

<div class="monster-search-wrap">
	<input class="monster-search" class:hint={isHint} type="text" placeholder="Search monsters…" value={search} oninput={onSearchInput} />
	{#each filteredSections as section}
		<h2>{section.name}</h2>
		{#each section.monsters as m}
			<MonsterStatblock {...m} open={autoExpand} {onEncounterAdd} />
		{/each}
	{/each}
	{#if filteredCount >= 2}
		<button class="expand-all-btn" onclick={() => globalExpand.toggle()}>{globalExpand.value ? 'Collapse All' : 'Expand All'}</button>
	{/if}
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

	.monster-search.hint {
		color: #e05555;
		border-color: #e05555;
	}

	.expand-all-btn {
		display: block;
		margin: 1.5rem auto 0;
		background: transparent;
		border: 1px solid #444;
		border-radius: 4px;
		color: #999;
		cursor: pointer;
		font-size: 0.8rem;
		padding: 0.4rem 1.2rem;
		font-family: inherit;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
	}

	.expand-all-btn:hover {
		background: #252525;
		color: #ddd;
		border-color: #666;
	}
</style>

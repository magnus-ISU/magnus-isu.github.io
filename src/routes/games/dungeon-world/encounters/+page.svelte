<script>
	import MonsterStatblock from '$lib/components/MonsterStatblock.svelte';
	import MonsterSearch from '$lib/components/MonsterSearch.svelte';
	import TextBox from '$lib/components/TextBox.svelte';
	import { allMonsters } from '$lib/dw/monsters.js';
	import { userMonsters } from '$lib/dw/userMonsters.svelte.js';
	import { encounterText } from '$lib/dw/encounterText.svelte.js';
	import { pageArt } from '$lib/dw/navigation.js';
	import { monsterUndo } from '$lib/dw/monsterUndo.svelte.js';
	import { tick, onMount } from 'svelte';

	const artUrl = typeof pageArt['encounters'] === 'string' ? pageArt['encounters'] : pageArt['encounters']?.url;
	let art = $state(null);
	onMount(() => {
		function loadArt() { art = artUrl; }
		if (document.readyState === 'complete') loadArt();
		else window.addEventListener('load', loadArt, { once: true });
		return () => window.removeEventListener('load', loadArt);
	});

	let text = $state(encounterText.value);
	const encounterPlaceholder = `Bandit King (Vizzini,)\nBandit (Fezzik, Inigo Montoya)\nWild Dog (2)\nOwlbear`;

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

	// Parse parenthetical after a monster name:
	// (4) → count=4 unnamed, (Boss,) → 1 named "Boss", (2,) → 1 named "2"
	// (John, Paul) → 2 named
	function parseParen(str) {
		const m = str.match(/^\((.+)\)$/);
		if (!m) return { count: 1, names: [] };
		const inner = m[1].trim();
		// Trailing comma with single item → singular named monster
		if (inner.endsWith(',')) {
			const singleName = inner.slice(0, -1).trim();
			if (singleName) return { count: 1, names: [singleName] };
		}
		// Pure number → count of unnamed
		if (/^\d+$/.test(inner)) return { count: +inner, names: [] };
		// Comma-separated names
		const names = inner.split(',').map(s => s.trim()).filter(Boolean);
		return { count: names.length, names };
	}

	// Greedy name matching — operates on ranges within each line
	const parsed = $derived.by(() => {
		if (!text.trim()) return { matched: [], unmatched: '' };
		const nameMap = new Map(knownMonsters.map((m) => [m.name.toLowerCase(), m]));
		const results = [];
		const missed = [];
		for (const line of text.split('\n')) {
			const trimmed = line.trim();
			if (!trimmed) continue;
			// Split on commas that are NOT inside parentheses
			const mentions = [];
			let depth = 0, current = '';
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
				let matched_any = false;

				while (words.length > 0) {
					let found = false;
					for (let len = Math.min(words.length, maxWords); len > 0; len--) {
						const candidate = words.slice(0, len).join(' ').toLowerCase();
						if (nameMap.has(candidate)) {
							const { count, names } = parenPart ? parseParen(parenPart) : { count: 1, names: [] };
							results.push({ ...nameMap.get(candidate), count, memberNames: names });
							words = words.slice(len);
							found = true;
							matched_any = true;
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
		}
		return { matched: results, unmatched: missed.join(' ') };
	});
	const matched = $derived(parsed.matched);
	const unmatched = $derived(parsed.unmatched);

	// Build parenthetical string from labels
	function buildParen(labels, count) {
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

	function onLabelsChange(monsterName, newLabels, count) {
		const lines = text.split('\n');
		const lowerName = monsterName.toLowerCase();
		for (let i = 0; i < lines.length; i++) {
			const stripped = lines[i].trim().replace(/\s*\(.*\)\s*$/, '').toLowerCase();
			if (stripped === lowerName) {
				const baseName = lines[i].trim().replace(/\s*\(.*\)\s*$/, '');
				const paren = buildParen(newLabels, count);
				lines[i] = paren ? `${baseName} ${paren}` : baseName;
				text = lines.join('\n');
				return;
			}
		}
	}


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
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<h1 onclick={() => { if (text.trim()) navigator.clipboard.writeText(text.trim()); }} style="cursor: pointer; -webkit-tap-highlight-color: transparent">Encounters</h1>

	<section class="encounter-input" bind:this={encounterInputEl}>
		<label for="encounter-text">
			Type monster names to build an encounter. Shift click, long-press, or double-click monster names to add them.
			Click on HP to track it, attacks to roll them, moves to note usage.
		</label>
		<TextBox bind:this={textBox} bind:value={text} placeholders={text.trim() ? [] : encounterPlaceholder.split('\n')} rows={5} />
	</section>

	{#if matched.length > 0}
		<section class="encounter-results" class:two-col={matched.length >= 2}>
			{#each matched as m, i (i)}
				<MonsterStatblock {...m} open={true} locked={true} onLabelsChange={(newLabels, count) => onLabelsChange(m.name, newLabels, count)} />
			{/each}
		</section>
	{/if}

	<section class="monster-search-section">
		<MonsterSearch hint={unmatched} />
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
</style>

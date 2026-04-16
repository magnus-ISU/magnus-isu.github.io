<script>
	import MonsterStatblock from '$lib/components/MonsterStatblock.svelte';
	import { allMonsters } from '$lib/dw/monsters.js';

	let text = $state('');
	let customMonsters = $state([]);

	const knownMonsters = $derived([...allMonsters, ...customMonsters]);
	const maxWords = $derived(Math.max(...knownMonsters.map((m) => m.name.split(/\s+/).length), 1));

	// Greedy name matching — tries longest prefix first
	const matched = $derived.by(() => {
		if (!text.trim()) return [];
		const nameMap = new Map(knownMonsters.map((m) => [m.name.toLowerCase(), m]));
		const results = [];
		for (const line of text.split('\n')) {
			let words = line.trim().split(/\s+/).filter(Boolean);
			while (words.length > 0) {
				// Check for leading number
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

	// Builder state
	let bName = $state('');
	let bTags = $state('');
	let bHp = $state('');
	let bArmor = $state('');
	let bAttacks = $state([{ name: '', damage: '', tags: '' }]);
	let bSpecial = $state('');
	let bDescription = $state('');
	let bInstinct = $state('');
	let bMoves = $state(['']);
	let bNotes = $state('');
	let builderOpen = $state(false);

	function addAttack() { bAttacks = [...bAttacks, { name: '', damage: '', tags: '' }]; }
	function rmAttack(i) { bAttacks = bAttacks.filter((_, idx) => idx !== i); }
	function addMove() { bMoves = [...bMoves, '']; }
	function rmMove(i) { bMoves = bMoves.filter((_, idx) => idx !== i); }

	const built = $derived({
		name: bName || 'Unnamed',
		...(bTags && { tags: bTags }),
		...(bHp && { hp: Number(bHp) }),
		...(bArmor && { armor: Number(bArmor) }),
		attacks: bAttacks.filter((a) => a.name),
		...(bSpecial && { special: bSpecial }),
		...(bDescription && { description: bDescription }),
		...(bInstinct && { instinct: bInstinct }),
		moves: bMoves.filter(Boolean),
		...(bNotes && { notes: bNotes })
	});

	function addToEncounter() {
		if (!bName.trim()) return;
		customMonsters = [...customMonsters, { ...built }];
		text = text.trim() ? text + '\n' + bName : bName;
	}

	// Export as JS object for monsters.js
	function toJsObject(m) {
		const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
		const lines = ['\t\t\t{'];
		lines.push(`\t\t\t\tname: '${esc(m.name)}',`);
		if (m.tags) lines.push(`\t\t\t\ttags: '${esc(m.tags)}',`);
		if (m.hp != null) lines.push(`\t\t\t\thp: ${m.hp},`);
		if (m.armor != null) lines.push(`\t\t\t\tarmor: ${m.armor},`);
		if (m.attacks?.length) {
			const atks = m.attacks.map((a) => {
				const p = [`name: '${esc(a.name)}'`];
				if (a.damage) p.push(`damage: '${esc(a.damage)}'`);
				if (a.tags) p.push(`tags: '${esc(a.tags)}'`);
				return `{ ${p.join(', ')} }`;
			});
			lines.push(`\t\t\t\tattacks: [${atks.join(', ')}],`);
		}
		if (m.special) lines.push(`\t\t\t\tspecial: '${esc(m.special)}',`);
		if (m.description) lines.push(`\t\t\t\tdescription: '${esc(m.description)}',`);
		if (m.instinct) lines.push(`\t\t\t\tinstinct: '${esc(m.instinct)}',`);
		if (m.moves?.length) {
			lines.push(`\t\t\t\tmoves: [${m.moves.map((v) => `'${esc(v)}'`).join(', ')}],`);
		}
		if (m.notes) lines.push(`\t\t\t\tnotes: '${esc(m.notes)}',`);
		lines.push('\t\t\t}');
		return lines.join('\n');
	}

	let copied = $state('');
	async function copyExport() {
		await navigator.clipboard.writeText(toJsObject(built));
		copied = 'data';
		setTimeout(() => { copied = ''; }, 2000);
	}
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
			placeholder="Bandit King&#10;Bandit&#10;Bandit&#10;Soldier"
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

	<hr />

	<details bind:open={builderOpen}>
		<summary class="builder-toggle">Create Monster</summary>

		<div class="builder">
			<div class="builder-row">
				<label>
					Name
					<input type="text" bind:value={bName} placeholder="Owlbear" />
				</label>
				<label>
					Tags
					<input type="text" bind:value={bTags} placeholder="Solitary, Large" />
				</label>
			</div>

			<div class="builder-row">
				<label>
					HP
					<input type="number" bind:value={bHp} placeholder="12" />
				</label>
				<label>
					Armor
					<input type="number" bind:value={bArmor} placeholder="1" />
				</label>
				<label>
					Special Qualities
					<input type="text" bind:value={bSpecial} placeholder="Wings, Keen senses" />
				</label>
			</div>

			<fieldset>
				<legend>Attacks</legend>
				{#each bAttacks as atk, i}
					<div class="builder-attack-row">
						<input type="text" bind:value={bAttacks[i].name} placeholder="Attack name" />
						<input type="text" bind:value={bAttacks[i].damage} placeholder="d10+2" />
						<input type="text" bind:value={bAttacks[i].tags} placeholder="Close, Messy" />
						{#if bAttacks.length > 1}
							<button class="rm-btn" onclick={() => rmAttack(i)}>x</button>
						{/if}
					</div>
				{/each}
				<button class="add-btn" onclick={addAttack}>+ Attack</button>
			</fieldset>

			<label class="full-width">
				Description
				<textarea bind:value={bDescription} placeholder="Flavor text..." rows="3"></textarea>
			</label>

			<div class="builder-row">
				<label>
					Instinct
					<input type="text" bind:value={bInstinct} placeholder="To hunt" />
				</label>
			</div>

			<fieldset>
				<legend>Moves</legend>
				{#each bMoves as _, i}
					<div class="builder-move-row">
						<input type="text" bind:value={bMoves[i]} placeholder="Monster move" />
						{#if bMoves.length > 1}
							<button class="rm-btn" onclick={() => rmMove(i)}>x</button>
						{/if}
					</div>
				{/each}
				<button class="add-btn" onclick={addMove}>+ Move</button>
			</fieldset>

			<label class="full-width">
				Design Notes
				<textarea bind:value={bNotes} placeholder="Optional GM notes..." rows="2"></textarea>
			</label>

			{#if bName.trim()}
				<div class="builder-preview">
					<h3>Preview</h3>
					<MonsterStatblock {...built} open={true} />
				</div>

				<div class="builder-actions">
					<button class="action-btn primary" onclick={addToEncounter}>Add to Encounter</button>
					<button class="action-btn" onclick={copyExport}>
						{copied === 'data' ? 'Copied!' : 'Copy for monsters.js'}
					</button>
				</div>
			{/if}
		</div>
	</details>
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

	hr {
		border: none;
		border-top: 1px solid #333;
		margin: 2rem 0;
	}

	/* Builder toggle */
	.builder-toggle {
		cursor: pointer;
		font-size: 1.1rem;
		font-weight: bold;
		color: #d4a847;
		padding: 0.5rem 0;
		user-select: none;
		list-style: none;
	}

	.builder-toggle::-webkit-details-marker {
		display: none;
	}

	.builder-toggle::before {
		content: '+ ';
		font-family: monospace;
	}

	details[open] > .builder-toggle::before {
		content: '- ';
	}

	/* Builder form */
	.builder {
		margin-top: 1rem;
	}

	.builder label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.78rem;
		color: #888;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		flex: 1;
		min-width: 0;
	}

	.builder input[type='text'],
	.builder input[type='number'],
	.builder textarea {
		background: #161616;
		border: 1px solid #333;
		border-radius: 4px;
		color: #ddd;
		font-family: inherit;
		font-size: 0.88rem;
		padding: 0.4rem 0.6rem;
		outline: none;
		width: 100%;
		box-sizing: border-box;
	}

	.builder input:focus,
	.builder textarea:focus {
		border-color: #555;
	}

	.builder textarea {
		resize: vertical;
	}

	.builder-row {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.full-width {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.78rem;
		color: #888;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.75rem;
	}

	fieldset {
		border: 1px solid #2c2c2c;
		border-radius: 6px;
		padding: 0.6rem 0.75rem 0.5rem;
		margin: 0 0 0.75rem;
	}

	legend {
		font-size: 0.78rem;
		color: #888;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0 0.4rem;
	}

	.builder-attack-row,
	.builder-move-row {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.4rem;
		align-items: center;
	}

	.builder-attack-row input:first-child {
		flex: 2;
	}

	.builder-attack-row input:nth-child(2) {
		flex: 1;
	}

	.builder-attack-row input:nth-child(3) {
		flex: 2;
	}

	.builder-move-row input {
		flex: 1;
	}

	.rm-btn {
		background: none;
		border: 1px solid #444;
		border-radius: 3px;
		color: #888;
		cursor: pointer;
		font-size: 0.75rem;
		padding: 0.25rem 0.5rem;
		font-family: inherit;
		flex-shrink: 0;
		transition: color 0.15s, border-color 0.15s;
	}

	.rm-btn:hover {
		color: #e05555;
		border-color: #e05555;
	}

	.add-btn {
		background: none;
		border: 1px dashed #444;
		border-radius: 4px;
		color: #888;
		cursor: pointer;
		font-size: 0.8rem;
		padding: 0.3rem 0.75rem;
		font-family: inherit;
		transition: color 0.15s, border-color 0.15s;
	}

	.add-btn:hover {
		color: #d4a847;
		border-color: #d4a847;
	}

	.builder-preview {
		margin-top: 1rem;
	}

	.builder-preview h3 {
		font-size: 0.85rem;
		color: #888;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 0.5rem;
		background: none;
		padding: 0;
	}

	.builder-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 1rem;
		flex-wrap: wrap;
	}

	.action-btn {
		background: #252525;
		border: 1px solid #444;
		border-radius: 4px;
		color: #ccc;
		cursor: pointer;
		font-size: 0.85rem;
		padding: 0.45rem 1rem;
		font-family: inherit;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
	}

	.action-btn:hover {
		background: #333;
		color: #fff;
	}

	.action-btn.primary {
		background: #d4a847;
		color: #1e1e1e;
		border-color: #d4a847;
		font-weight: bold;
	}

	.action-btn.primary:hover {
		background: #e0b850;
	}
</style>

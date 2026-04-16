<script>
	import { userMonsters } from '$lib/dw/userMonsters.svelte.js';
	import { allMonsters } from '$lib/dw/monsters.js';
	import MonsterStatblock from '$lib/components/MonsterStatblock.svelte';

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
	let nameError = $state(false);
	let importInput = $state(null);

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

	function resetBuilder() {
		bName = ''; bTags = ''; bHp = ''; bArmor = '';
		bAttacks = [{ name: '', damage: '', tags: '' }];
		bSpecial = ''; bDescription = ''; bInstinct = '';
		bMoves = ['']; bNotes = '';
	}

	function saveMonster() {
		if (!bName.trim()) return;
		const taken = new Set([
			...userMonsters.list.map(m => m.name.toLowerCase()),
			...allMonsters.map(m => m.name.toLowerCase()),
		]);
		if (taken.has(bName.trim().toLowerCase())) {
			nameError = true;
			setTimeout(() => { nameError = false; }, 2000);
			return;
		}
		userMonsters.add({ ...built });
		resetBuilder();
	}

	function exportMonsters() {
		const json = JSON.stringify(userMonsters.list, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'user-monsters.json';
		a.click();
		URL.revokeObjectURL(url);
	}

	function handleImport(e) {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			try {
				const parsed = JSON.parse(ev.target.result);
				if (Array.isArray(parsed)) userMonsters.import(parsed);
			} catch {}
		};
		reader.readAsText(file);
		e.target.value = '';
	}
</script>

<svelte:head>
	<title>User Monsters - Dungeon World</title>
</svelte:head>

<article class="dw-article">
	<h1>User Monsters</h1>

	<div class="toolbar">
		{#if userMonsters.list.length > 0}
			<button class="action-btn" onclick={exportMonsters}>Export</button>
		{/if}
		<label class="action-btn import-label">
			Import
			<input type="file" accept=".json" onchange={handleImport} />
		</label>
	</div>

	{#if userMonsters.list.length > 0}
		<section class="monster-list">
			{#each userMonsters.list as m (m.name)}
				<div class="monster-row">
					<MonsterStatblock {...m} />
					<button class="remove-btn" onclick={() => userMonsters.remove(m.name)} title="Remove">✕</button>
				</div>
			{/each}
		</section>
		<hr />
	{/if}

	<details open={userMonsters.list.length === 0}>
		<summary class="builder-toggle">Create Monster</summary>

		<div class="builder">
			<div class="builder-row">
				<label class:error={nameError}>
					Name{#if nameError} <span class="error-msg">— already exists</span>{/if}
					<input
						type="text"
						bind:value={bName}
						placeholder="Owlbear"
						class:input-error={nameError}
					/>
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
			{/if}

			<div class="builder-actions">
				<button class="action-btn primary" onclick={saveMonster}>Save Monster</button>
				{#if bName.trim() || bDescription.trim() || bTags.trim()}
					<button class="action-btn" onclick={resetBuilder}>Clear</button>
				{/if}
			</div>
		</div>
	</details>
</article>

<style>
	hr {
		border: none;
		border-top: 1px solid #333;
		margin: 2rem 0;
	}

	.toolbar {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.monster-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-bottom: 1.5rem;
	}

	.monster-row {
		position: relative;
	}

	.remove-btn {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		background: none;
		border: none;
		color: #555;
		cursor: pointer;
		font-size: 0.75rem;
		padding: 0.2rem 0.4rem;
		border-radius: 3px;
		line-height: 1;
		transition: color 0.15s, background 0.15s;
		z-index: 2;
	}

	.remove-btn:hover {
		color: #e05555;
		background: #2a1a1a;
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

	.builder-toggle::-webkit-details-marker { display: none; }
	.builder-toggle::before { content: '+ '; font-family: monospace; }
	details[open] > .builder-toggle::before { content: '- '; }

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

	.builder label.error {
		color: #e05555;
	}

	.error-msg {
		text-transform: none;
		font-weight: normal;
		letter-spacing: 0;
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
	.builder textarea:focus { border-color: #555; }
	.builder textarea { resize: vertical; }

	.input-error { border-color: #e05555 !important; }

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

	.builder-attack-row input:first-child { flex: 2; }
	.builder-attack-row input:nth-child(2) { flex: 1; }
	.builder-attack-row input:nth-child(3) { flex: 2; }
	.builder-move-row input { flex: 1; }

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

	.rm-btn:hover { color: #e05555; border-color: #e05555; }

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

	.add-btn:hover { color: #d4a847; border-color: #d4a847; }

	.builder-preview { margin-top: 1rem; }

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

	.action-btn:hover { background: #333; color: #fff; }

	.action-btn.primary {
		background: #d4a847;
		color: #1e1e1e;
		border-color: #d4a847;
		font-weight: bold;
	}

	.action-btn.primary:hover { background: #e0b850; }

	.import-label {
		display: inline-flex;
		align-items: center;
		cursor: pointer;
	}

	.import-label input[type='file'] {
		display: none;
	}
</style>

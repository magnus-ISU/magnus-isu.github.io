<script>
import { onMount } from 'svelte';
import MonsterSearch from '$lib/components/MonsterSearch.svelte';
import MonsterStatblock from '$lib/components/MonsterStatblock.svelte';
import TextBox from '$lib/components/TextBox.svelte';
import { globalExpand } from '$lib/dw/descExpanded.svelte.js';
import { allMonsters } from '$lib/dw/monsters.js';
import { pageArt } from '$lib/dw/navigation.js';
import { userMonsters } from '$lib/dw/userMonsters.svelte.js';

const artUrl =
	typeof pageArt['user-monsters'] === 'string'
		? pageArt['user-monsters']
		: pageArt['user-monsters']?.url;
let art = $state(null);
onMount(() => {
	function loadArt() {
		art = artUrl;
	}
	if (document.readyState === 'complete') loadArt();
	else window.addEventListener('load', loadArt, { once: true });
	return () => window.removeEventListener('load', loadArt);
});

let text = $state('');

const built = $derived.by(() => {
	const lines = text.split('\n');
	const get = (i) => lines[i]?.trim() || '';

	// Line 0: name, tag, tag, tag...
	const nameParts = get(0).split(',').map((s) => s.trim());
	const name = nameParts[0] || '';
	const tags = nameParts.slice(1).filter(Boolean).join(', ');

	// Line 1: hp, armor, description
	const line1 = get(1).split(',').map((s) => s.trim());
	const hp = line1[0] ? +line1[0] : null;
	const armor = line1[1] ? +line1[1] : null;
	const description = line1.slice(2).join(', ').replaceAll('\\n', '\n');

	// Line 2: instinct, special qualities
	const line2 = get(2).split(',').map((s) => s.trim());
	const instinct = line2[0] || '';
	const special = line2.slice(1).filter(Boolean).join(', ');

	const attacks = [];
	const moves = [];
	for (let i = 3; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;
		if (line.toLowerCase().startsWith('attack:')) {
			const parts = line
				.slice(7)
				.split(';')
				.map((s) => s.trim());
			attacks.push({ name: parts[0] || '', damage: parts[1] || '', tags: parts[2] || '' });
		} else {
			for (const m of line.split(';').map((s) => s.trim()).filter(Boolean)) moves.push(m);
		}
	}

	return {
		name: name || 'Unnamed',
		...(tags && { tags }),
		...(hp !== null && !isNaN(hp) && { hp }),
		...(armor !== null && !isNaN(armor) && { armor }),
		attacks: attacks.filter((a) => a.name),
		...(special && { special }),
		...(description && { description }),
		...(instinct && { instinct }),
		moves,
	};
});

const takenNames = $derived(new Set([
	...userMonsters.list.map((m) => m.name.toLowerCase()),
	...allMonsters.map((m) => m.name.toLowerCase()),
]));
const canSave = $derived(built.name !== 'Unnamed' && !takenNames.has(built.name.toLowerCase()));

const placeholders = $derived.by(() => {
	const lines = text.split('\n');
	const phs = [
		'Name, Solitary, Large',
		'hp, armor, description',
		'Instinct, special qualities',
	];

	const hasAttack = lines.slice(3).some((l) => l.trim().toLowerCase().startsWith('attack:'));
	phs.push(
		hasAttack
			? 'Move or attack: Name ; damage ; tags'
			: 'attack: Attack name ; Attack damage ; Attack tags',
	);
	phs.push('attack or move; move; move');

	const total = Math.max(lines.length, phs.length);
	while (phs.length < total) {
		phs.push('');
	}

	return phs;
});

function monsterToText(m) {
	const line0 = [m.name, ...(m.tags ? m.tags.split(',').map((s) => s.trim()).filter(Boolean) : [])].join(', ');
	const line1 = [m.hp ?? '', m.armor ?? '', m.description || ''].join(', ');
	const line2 = [m.instinct || '', m.special || ''].join(', ');
	const lines = [line0, line1, line2];
	for (const atk of m.attacks || []) {
		const parts = [atk.name, atk.damage, atk.tags].filter(Boolean);
		lines.push(`attack: ${parts.join(' ; ')}`);
	}
	if (m.moves?.length) lines.push(m.moves.join('; '));
	while (lines.length > 1 && !lines[lines.length - 1]) lines.pop();
	return lines.join('\n');
}

function saveMonster() {
	if (!canSave) return;
	userMonsters.add({ ...built });
	text = '';
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
		} catch {
			/* ignore */
		}
	};
	reader.readAsText(file);
	e.target.value = '';
}

// Delete confirmation — prompt once, then allow for 1 minute
let pendingDelete = $state(null);
let lastConfirmed = 0;

function requestDelete(name) {
	if (Date.now() - lastConfirmed < 60_000) {
		userMonsters.remove(name);
	} else {
		pendingDelete = name;
	}
}

function confirmDelete() {
	lastConfirmed = Date.now();
	userMonsters.remove(pendingDelete);
	pendingDelete = null;
}

function cancelDelete() {
	pendingDelete = null;
}
</script>

<svelte:head>
	<title>User Monsters - Dungeon World</title>
</svelte:head>

{#if art}
	<div class="bg-art">
		<img src={art} alt="" />
	</div>
{/if}

{#if pendingDelete}
	<div class="modal-backdrop" onclick={cancelDelete} role="presentation">
		<div class="modal" onpointerdown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
			<p>Delete <strong>{pendingDelete}</strong>?</p>
			<div class="modal-actions">
				<button class="action-btn primary danger" onclick={confirmDelete}>Delete</button>
				<button class="action-btn" onclick={cancelDelete}>Cancel</button>
			</div>
		</div>
	</div>
{/if}

<article class="dw-article">
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<h1 onclick={() => { if (userMonsters.list.length >= 2) globalExpand.toggle(); }} onkeydown={(e) => { if (e.key === 'Enter' && userMonsters.list.length >= 2) globalExpand.toggle(); }} style="cursor: pointer; -webkit-tap-highlight-color: transparent">User Monsters</h1>

	<div class="builder">
		<TextBox bind:value={text} {placeholders} rows={12} />

		{#if built.name !== 'Unnamed'}
			<div class="builder-preview">
				<MonsterStatblock {...built} open={true} custom={true} />
			</div>
		{/if}

		<div class="builder-actions">
			<button class="action-btn primary" onclick={saveMonster} disabled={!canSave}>Save Monster</button>
			{#if text.trim()}
				<button class="action-btn" onclick={() => { text = ''; }}>Clear</button>
			{/if}
		</div>
	</div>

	{#if userMonsters.list.length > 0}
		<hr />

		<div class="toolbar">
			<button class="action-btn" onclick={exportMonsters}>Export</button>
			<label class="action-btn import-label">
				Import
				<input type="file" accept=".json" onchange={handleImport} />
			</label>
		</div>

		<section class="monster-list">
			{#each userMonsters.list as m (m.name)}
				<div class="monster-row">
					<div class="monster-wrap">
						<MonsterStatblock {...m} onEncounterAdd={() => { text = monsterToText(m); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
					</div>
					<button class="remove-btn" onclick={() => requestDelete(m.name)} title="Delete">✕</button>
				</div>
			{/each}
		</section>
		{#if userMonsters.list.length >= 2}
			<button class="expand-all-btn" onclick={() => globalExpand.toggle()}>{globalExpand.value ? 'Collapse All' : 'Expand All'}</button>
		{/if}
	{:else}
		<div class="toolbar">
			<label class="action-btn import-label">
				Import
				<input type="file" accept=".json" onchange={handleImport} />
			</label>
		</div>
	{/if}

	<section class="monster-search-section">
		<MonsterSearch />
	</section>
</article>

<style>
	.monster-search-section {
		margin-top: 2rem;
	}

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

	hr {
		border: none;
		border-top: 1px solid #333;
		margin: 2rem 0 1.5rem;
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
	}

	.monster-row {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.monster-wrap {
		flex: 1;
		min-width: 0;
	}

	.remove-btn {
		flex-shrink: 0;
		align-self: flex-start;
		margin-top: calc(0.45rem + 5px);
		background: none;
		border: 1px solid #3a3a3a;
		border-radius: 4px;
		color: #555;
		cursor: pointer;
		font-size: 0.7rem;
		padding: 0.3rem 0.45rem;
		line-height: 1;
		transition: color 0.15s, border-color 0.15s, background 0.15s, margin-top 0.25s ease;
	}

	.monster-row:has(:global(.monster.is-expanded)) .remove-btn {
		margin-top: calc(1.25rem + 0.45rem + 11px);
	}

	.remove-btn:hover {
		color: #e05555;
		border-color: #e05555;
		background: #2a1a1a;
	}

	/* Modal */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		z-index: 2000;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.modal {
		background: #1e1e1e;
		border: 1px solid #444;
		border-radius: 8px;
		padding: 1.5rem 2rem;
		min-width: 260px;
		text-align: center;
	}

	.modal p {
		color: #ddd;
		margin: 0 0 1.25rem;
		font-size: 1rem;
	}

	.modal strong {
		color: #fff;
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
	}

	/* Builder */
	.builder {
		margin-bottom: 0;
	}

	.builder-preview {
		margin-top: 1rem;
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

	.action-btn.primary:hover:not(:disabled) { background: #e0b850; }

	.action-btn.primary:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.action-btn.primary.danger {
		background: #c0392b;
		border-color: #c0392b;
	}

	.action-btn.primary.danger:hover { background: #d44438; }

	.import-label {
		display: inline-flex;
		align-items: center;
		cursor: pointer;
	}

	.import-label input[type='file'] {
		display: none;
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

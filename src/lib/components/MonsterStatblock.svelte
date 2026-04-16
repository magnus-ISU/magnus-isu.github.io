<script>
	import { fly } from 'svelte/transition';

	let {
		name,
		tags = '',
		hp = null,
		armor = null,
		attack = '',
		damage = '',
		attackTags = '',
		attack2 = '',
		damage2 = '',
		attackTags2 = '',
		special = '',
		description = '',
		instinct = '',
		moves = [],
		notes = ''
	} = $props();

	const hasStats = $derived(hp !== null || armor !== null || !!attack);

	// Move toggle
	let usedMoves = $state(new Set());
	function toggleMove(i) {
		const next = new Set(usedMoves);
		if (next.has(i)) next.delete(i); else next.add(i);
		usedMoves = next;
	}

	// Dice rolling
	let rollResult = $state(null);
	let rollVisible = $state(false);
	let rollTimer = null;

	function rollDie(sides) {
		return Math.ceil(Math.random() * sides);
	}

	function parseAndRoll(dmg) {
		if (!dmg || dmg === '??') return null;

		// "3d12 keep lowest 2"
		const keepMatch = dmg.match(/^(\d+)d(\d+)\s+keep\s+lowest\s+(\d+)/i);
		if (keepMatch) {
			const count = +keepMatch[1], sides = +keepMatch[2], keep = +keepMatch[3];
			const rolls = Array.from({ length: count }, () => rollDie(sides));
			const sorted = [...rolls].sort((a, b) => a - b);
			const kept = sorted.slice(0, keep);
			return { total: kept.reduce((a, b) => a + b, 0), rolls, kept };
		}

		// "NdX+M" / "dX+M" / "dX"
		const m = dmg.match(/^(\d+)?d(\d+)([+-]\d+)?/i);
		if (!m) return null;
		const count = +(m[1] || 1), sides = +m[2], modifier = +(m[3] || 0);
		const rolls = Array.from({ length: count }, () => rollDie(sides));
		return { total: rolls.reduce((a, b) => a + b, 0) + modifier, rolls, modifier };
	}

	function formatDetail(r) {
		if (!r) return null;
		if (r.kept) return `[${r.rolls.join(', ')}] keep [${r.kept.join(', ')}]`;
		if (r.rolls.length === 1 && r.modifier === 0) return null;
		const base = r.rolls.length === 1 ? `${r.rolls[0]}` : r.rolls.join(' + ');
		if (r.modifier > 0) return `${base} + ${r.modifier}`;
		if (r.modifier < 0) return `${base} − ${Math.abs(r.modifier)}`;
		return base;
	}

	const rollDetail = $derived(rollResult ? formatDetail(rollResult) : null);

	function doRoll(dmg, atk) {
		const result = parseAndRoll(dmg);
		if (!result) return;
		clearTimeout(rollTimer);
		rollResult = { attackName: atk, ...result };
		rollVisible = true;
		rollTimer = setTimeout(() => { rollVisible = false; }, 5000);
	}
</script>

<div class="monster">
	<div class="monster-header">
		<div class="monster-name">{name}</div>
		{#if tags}
			<div class="monster-tags">{tags}</div>
		{/if}
	</div>

	{#if hasStats}
		<div class="monster-stats">
			<div class="monster-attacks">
				{#if attack}
					<div class="attack-row">
						<button class="attack-btn" onclick={() => doRoll(damage, attack)}>{attack}</button>
						{#if damage}<span class="attack-damage">{damage}</span>{/if}
						{#if attackTags}<span class="attack-tags">{attackTags}</span>{/if}
					</div>
				{/if}
				{#if attack2}
					<div class="attack-row">
						<button class="attack-btn" onclick={() => doRoll(damage2, attack2)}>{attack2}</button>
						{#if damage2}<span class="attack-damage">{damage2}</span>{/if}
						{#if attackTags2}<span class="attack-tags">{attackTags2}</span>{/if}
					</div>
				{/if}
			</div>
			<div class="monster-vitals">
				{#if hp !== null}
					<span class="vital"><span class="vital-label">HP</span> {hp}</span>
				{/if}
				{#if armor !== null}
					<span class="vital"><span class="vital-label">Armor</span> {armor}</span>
				{/if}
			</div>
		</div>
	{/if}

	{#if rollVisible && rollResult}
		<div class="roll-area" transition:fly={{ y: -6, duration: 180 }}>
			<span class="roll-label">{rollResult.attackName}</span>
			<span class="roll-arrow">→</span>
			<span class="roll-total">{rollResult.total}</span>
			{#if rollDetail}
				<span class="roll-breakdown">{rollDetail}</span>
			{/if}
		</div>
	{/if}

	{#if special}
		<div class="monster-special"><em>Special: {special}</em></div>
	{/if}

	{#if description}
		<div class="monster-description">{description}</div>
	{/if}

	{#if instinct}
		<div class="monster-instinct"><strong>Instinct:</strong> {instinct}</div>
	{/if}

	{#if moves.length > 0}
		<div class="monster-moves">
			{#each moves as move, i}
				<button class="move-pill" class:used={usedMoves.has(i)} onclick={() => toggleMove(i)}>
					{move}
				</button>
			{/each}
		</div>
	{/if}

	{#if notes}
		<div class="monster-notes">{notes}</div>
	{/if}
</div>

<style>
	.monster {
		border: 1px solid #333;
		border-radius: 6px;
		margin: 1.25rem 0;
		overflow: hidden;
	}

	.monster-header {
		background: #252525;
		padding: 0.45rem 0.75rem;
		border-bottom: 1px solid #333;
	}

	.monster-name {
		font-size: 1.1rem;
		font-weight: bold;
		color: #eee;
		line-height: 1.3;
	}

	.monster-tags {
		font-style: italic;
		color: #aaa;
		font-size: 0.85rem;
		margin-top: 0.1rem;
	}

	.monster-stats {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.25rem 0.5rem;
		padding: 0.4rem 0.75rem;
		background: #1e1e1e;
		border-bottom: 1px solid #2c2c2c;
	}

	.monster-attacks {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.attack-row {
		display: flex;
		align-items: baseline;
		gap: 0 0.6rem;
		flex-wrap: wrap;
	}

	.attack-btn {
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		font-weight: bold;
		color: #ddd;
		cursor: pointer;
		font-size: 0.9rem;
		transition: color 0.15s;
	}

	.attack-btn:hover {
		color: #d4a847;
	}

	.attack-damage {
		color: #d4a847;
		font-family: monospace;
		font-size: 0.85rem;
		margin-left: 0.75rem;
	}

	.attack-tags {
		color: #777;
		font-size: 0.82rem;
	}

	.monster-vitals {
		display: flex;
		gap: 0.75rem;
		flex-shrink: 0;
	}

	.vital {
		font-size: 0.88rem;
		white-space: nowrap;
		color: #ddd;
	}

	.vital-label {
		font-size: 0.72rem;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #888;
		margin-right: 0.2rem;
	}

	.roll-area {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0.75rem;
		background: #131d1d;
		border-bottom: 1px solid #1e3030;
	}

	.roll-label {
		color: #666;
		font-size: 0.78rem;
	}

	.roll-arrow {
		color: #555;
		font-size: 0.8rem;
	}

	.roll-total {
		color: #d4a847;
		font-size: 1.15rem;
		font-weight: bold;
		font-family: monospace;
	}

	.roll-breakdown {
		color: #666;
		font-size: 0.78rem;
		font-family: monospace;
	}

	.monster-special {
		padding: 0.35rem 0.75rem 0;
		color: #aaa;
		font-size: 0.88rem;
		background: #1a1a1a;
	}

	.monster-description {
		padding: 0.5rem 0.75rem;
		color: #bbb;
		font-style: italic;
		font-size: 0.92rem;
		line-height: 1.6;
		background: #1a1a1a;
	}

	.monster-instinct {
		padding: 0.35rem 0.75rem 0.4rem;
		font-size: 0.88rem;
		color: #ccc;
		background: #1a1a1a;
		border-top: 1px solid #2c2c2c;
	}

	.monster-instinct strong {
		color: #fff;
	}

	.monster-moves {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.35rem;
		padding: 0.5rem 0.75rem;
		background: #1a1a1a;
		border-top: 1px solid #2c2c2c;
	}

	.move-pill {
		background: #222;
		border: 1px solid #393939;
		border-radius: 4px;
		padding: 0.3rem 0.5rem;
		color: #bbb;
		font-size: 0.78rem;
		font-family: inherit;
		cursor: pointer;
		text-align: left;
		line-height: 1.3;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
	}

	.move-pill:hover {
		background: #2a2a2a;
		border-color: #555;
		color: #ddd;
	}

	.move-pill.used {
		background: #1e1a0f;
		border-color: #6b5a2a;
		color: #c8a84b;
	}

	.monster-notes {
		border-top: 1px solid #333;
		background: #1e1e1e;
		border-left: 3px solid #d4a847;
		padding: 0.5rem 0.75rem;
		color: #999;
		font-size: 0.82rem;
		line-height: 1.6;
	}
</style>

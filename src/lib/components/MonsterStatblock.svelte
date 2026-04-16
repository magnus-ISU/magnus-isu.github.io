<script>
	let {
		name,
		tags = '',
		hp = null,
		armor = null,
		attacks = [],
		special = '',
		description = '',
		instinct = '',
		moves = [],
		notes = '',
		count = 1
	} = $props();

	const hasStats = $derived(hp !== null || armor !== null || attacks.length > 0);
	const atkNameWidth = $derived(attacks.length > 1 ? Math.max(...attacks.map(a => a.name.length)) + 'ch' : 'auto');

	// Grid columns: 1→1, 2→2, 4→2 (2×2), everything else→3
	const moveColumns = $derived(
		moves.length === 1 ? 1 :
		moves.length === 2 ? 2 :
		moves.length === 4 ? 2 : 3
	);

	// Move toggle
	let usedMoves = $state(new Set());
	function toggleMove(i) {
		const next = new Set(usedMoves);
		if (next.has(i)) next.delete(i); else next.add(i);
		usedMoves = next;
	}

	// HP tracking — supports multiple instances via count prop
	const hpNum = $derived(typeof hp === 'number' ? hp : null);
	let currentHps = $state([]);
	$effect(() => {
		currentHps = hpNum !== null ? Array.from({ length: count }, () => hpNum) : [];
	});
	function getHpColor(val) {
		if (val == null) return null;
		return val <= 0 ? '#e05555' : val < hpNum ? '#d4a847' : '#5aaa6a';
	}
	function clickHp(idx) {
		if (currentHps[idx] == null) return;
		currentHps[idx] = currentHps[idx] <= 0 ? hpNum : currentHps[idx] - 1;
	}

	// Chunk HP entries into rows of 6
	const hpRows = $derived.by(() => {
		const rows = [];
		for (let i = 0; i < currentHps.length; i += 6) {
			rows.push(currentHps.slice(i, i + 6).map((_, j) => i + j));
		}
		return rows;
	});

	// Dice rolling — rollKey increments on each roll to restart the CSS animation
	let rollResult = $state(null); // { attackKey: 'atk1'|'atk2', total: number }
	let rollKey = $state(0);

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
			return [...rolls].sort((a, b) => a - b).slice(0, keep).reduce((a, b) => a + b, 0);
		}

		// "NdX+M" / "dX+M" / "dX"
		const m = dmg.match(/^(\d+)?d(\d+)([+-]\d+)?/i);
		if (!m) return null;
		const count = +(m[1] || 1), sides = +m[2], modifier = +(m[3] || 0);
		return Array.from({ length: count }, () => rollDie(sides)).reduce((a, b) => a + b, 0) + modifier;
	}

	function doRoll(dmg, atkIdx) {
		const total = parseAndRoll(dmg);
		if (total === null) return;
		rollKey++;
		rollResult = { atkIdx, total };
	}
</script>

<div class="monster">
	<div class="monster-header">
		<div class="monster-name">{count > 1 ? `${name} ×${count}` : name}</div>
		{#if tags}
			<div class="monster-tags">{tags}</div>
		{/if}
	</div>

	{#if hasStats}
		<div class="monster-stats">
			<div class="monster-attacks">
				{#each attacks as atk, i}
					<div class="attack-row">
						<button class="attack-btn" style="min-width: {atkNameWidth}" onclick={() => doRoll(atk.damage, i)}>{atk.name}</button>
						<span class="roll-slot">
							{#key rollKey}
								{#if rollResult?.atkIdx === i}
									<span class="roll-inline" onanimationend={() => { rollResult = null; }}>
										{rollResult.total}
									</span>
								{/if}
							{/key}
						</span>
						{#if atk.damage}<span class="attack-damage">{atk.damage} damage</span>{/if}
						{#if atk.tags}<span class="attack-tags">{atk.tags}</span>{/if}
					</div>
				{/each}
			</div>
			<div class="monster-vitals">
				{#if hp !== null && count <= 1}
					<span class="vital">
						<button class="vital-label hp-btn" onclick={() => clickHp(0)} title={currentHps[0] <= 0 ? 'Reset HP' : 'Reduce HP'}>HP</button>
						{#if hpNum !== null}
							<input class="hp-input" type="number" style="color: {getHpColor(currentHps[0])}" bind:value={currentHps[0]} />
						{:else}
							<span>{hp}</span>
						{/if}
					</span>
				{/if}
				{#if armor !== null}
					<span class="vital"><span class="vital-label">Armor</span> {armor}</span>
				{/if}
			</div>
		</div>
	{/if}

	{#if hp !== null && count > 1}
		<div class="monster-hp-grid">
			{#each hpRows as row}
				<div class="hp-row">
					{#each row as idx}
						<span class="vital">
							<button class="vital-label hp-btn" onclick={() => clickHp(idx)} title={currentHps[idx] <= 0 ? 'Reset HP' : 'Reduce HP'}>
								HP{idx + 1}
							</button>
							{#if hpNum !== null}
								<input class="hp-input" type="number" style="color: {getHpColor(currentHps[idx])}" bind:value={currentHps[idx]} />
							{:else}
								<span>{hp}</span>
							{/if}
						</span>
					{/each}
				</div>
			{/each}
		</div>
	{/if}

	{#if description}
		<div class="monster-description">{description}</div>
	{/if}

	{#if instinct || special}
		<div class="monster-instinct">
			{#if instinct}<span><strong>Instinct:</strong> {instinct}</span>{/if}
			{#if special}<span class="monster-special">{special}</span>{/if}
		</div>
	{/if}

	{#if moves.length > 0}
		<div class="monster-moves" style="grid-template-columns: repeat({moveColumns}, 1fr)">
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
		align-items: center;
		gap: 0 0.6rem;
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
		flex-shrink: 0;
	}

	.attack-btn:hover {
		color: #d4a847;
	}

	/* Fixed-width slot — always reserves space so siblings never shift */
	.roll-slot {
		width: 2.5rem;
		flex-shrink: 0;
		position: relative;
		height: 1.3em;
	}

	@keyframes roll-slide-fade {
		0%   { transform: translateX(4rem); opacity: 0; }
		17%  { transform: translateX(0);    opacity: 1; }
		83%  { transform: translateX(0);    opacity: 1; }
		100% { transform: translateX(0);    opacity: 0; }
	}

	.roll-inline {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		color: #e8c76a;
		font-family: monospace;
		font-weight: bold;
		font-size: 1.05rem;
		animation: roll-slide-fade 3s ease-out forwards;
		pointer-events: none;
		white-space: nowrap;
	}

	.attack-damage {
		color: #d4a847;
		font-family: monospace;
		font-size: 0.85rem;
		margin-left: 0.25rem;
	}

	.attack-tags {
		color: #777;
		font-size: 0.82rem;
	}

	.monster-vitals {
		display: flex;
		align-items: baseline;
		gap: 0.4rem 0.75rem;
		flex-shrink: 0;
		flex-wrap: wrap;
	}

	.monster-hp-grid {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 0.4rem 0.75rem;
		background: #1e1e1e;
		border-bottom: 1px solid #2c2c2c;
	}

	.hp-row {
		display: flex;
		gap: 0.75rem;
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

	.hp-btn {
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		cursor: pointer;
		transition: color 0.15s;
	}

	.hp-btn:hover {
		color: #bbb;
	}

	.hp-input {
		background: none;
		border: none;
		padding: 0;
		margin: 0;
		font: inherit;
		font-size: 0.88rem;
		width: 3.5ch;
		outline: none;
		-moz-appearance: textfield;
		appearance: textfield;
		transition: color 0.2s;
	}

	.hp-input::-webkit-inner-spin-button,
	.hp-input::-webkit-outer-spin-button {
		-webkit-appearance: none;
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
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.75rem;
		padding: 0.35rem 0.75rem 0.4rem;
		font-size: 0.88rem;
		color: #ccc;
		background: #1a1a1a;
		border-top: 1px solid #2c2c2c;
	}

	.monster-instinct strong {
		color: #fff;
	}

	.monster-special {
		color: #aaa;
		font-style: italic;
		font-size: 0.82rem;
		flex-shrink: 0;
	}

	.monster-moves {
		display: grid;
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

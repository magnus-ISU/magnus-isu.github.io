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
		count = 1,
		memberNames = [],
		open = false,
		locked = false,
		onLabelsChange = null
	} = $props();

	import { tick } from 'svelte';
	import { encounterText } from '$lib/dw/encounterText.svelte.js';
	import { diceHistory } from '$lib/dw/diceHistory.svelte.js';
	import { globalExpand, descExpanded as globalDesc } from '$lib/dw/descExpanded.svelte.js';

	function inlineMd(text) {
		return text
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/__(.+?)__/g, '<strong>$1</strong>')
			.replace(/\*(.+?)\*/g, '<em>$1</em>')
			.replace(/_(.+?)_/g, '<em>$1</em>')
			.replace(/`(.+?)`/g, '<code>$1</code>');
	}

	const descriptionHtml = $derived(description ? inlineMd(description) : '');

	let expanded = $state(open);
	$effect(() => { expanded = open; });
	let globalMounted = false;
	$effect(() => {
		const g = globalExpand.value;
		if (!globalMounted) { globalMounted = true; return; }
		if (g) expanded = true;
		else if (!locked) expanded = false;
	});
	let el;

	// Long-press / shift-click to copy name
	let longPressTimer;
	let isLongPress = false;
	let copied = $state(false);

	function onPointerDown() {
		isLongPress = false;
		longPressTimer = setTimeout(() => {
			isLongPress = true;
			doAddToEncounter();
		}, 400);
	}

	function onPointerUp() {
		clearTimeout(longPressTimer);
	}

	function doAddToEncounter() {
		const oldTop = el.getBoundingClientRect().top;
		encounterText.appendName(name);
		const end = performance.now() + 300;
		requestAnimationFrame(function track() {
			const drift = el.getBoundingClientRect().top - oldTop;
			if (Math.abs(drift) > 0.5) window.scrollBy(0, drift);
			if (performance.now() < end) requestAnimationFrame(track);
		});
		copied = true;
		setTimeout(() => { copied = false; }, 1200);
	}

	async function handleShiftClick() {
		// Copy full statblock to clipboard in user-monsters-pasteable format
		const lines = [name, tags || ''];
		const vitals = [];
		if (hp !== null) vitals.push(`${hp} HP`);
		if (armor !== null) vitals.push(`${armor} Armor`);
		lines.push(vitals.join(', ') || '0 HP, 0 Armor');
		lines.push(special || '');
		lines.push(description || '');
		lines.push(instinct || '');
		for (const atk of attacks) {
			const parts = [atk.name, atk.damage, atk.tags].filter(Boolean);
			lines.push(`attack: ${parts.join(' ; ')}`);
		}
		for (const m of moves) lines.push(m);
		while (lines.length > 1 && !lines[lines.length - 1]) lines.pop();
		await navigator.clipboard.writeText(lines.join('\n'));
		doAddToEncounter();
	}

	let lastClickTime = 0;

	function handleHeaderClick(e) {
		if (isLongPress) {
			isLongPress = false;
			return;
		}
		if (e.shiftKey) {
			handleShiftClick();
			return;
		}
		const now = Date.now();
		if (now - lastClickTime < 400) {
			lastClickTime = 0;
			doAddToEncounter();
			return;
		}
		lastClickTime = now;
		if (!locked) toggleExpanded();
	}

	function toggleExpanded() {
		const oldTop = el.getBoundingClientRect().top;
		expanded = !expanded;

		// Track element position each frame and compensate scroll to keep it pinned
		const end = performance.now() + 300;
		requestAnimationFrame(function track() {
			const drift = el.getBoundingClientRect().top - oldTop;
			if (Math.abs(drift) > 0.5) window.scrollBy(0, drift);
			if (performance.now() < end) requestAnimationFrame(track);
		});
	}

	const hasStats = $derived(hp !== null || armor !== null || attacks.length > 0);
	const atkNameWidth = $derived(attacks.length > 1 ? Math.max(...attacks.map(a => a.name.length)) + 'ch' : 'auto');

	// Grid columns: 1→1, 2→2, 4→2 (2×2), everything else→3
	const moveColumns = $derived(
		moves.length === 1 ? 1 :
		moves.length === 2 ? 2 :
		moves.length === 4 ? 2 : 3
	);

	// Description expand toggle — shift/long-press flips this one until next global toggle
	let localFlip = $state(false);
	const descExpanded = $derived(localFlip ? !globalDesc.value : globalDesc.value);
	$effect(() => { globalDesc.value; localFlip = false; });
	let descLongPress = false;
	let descLongTimer;

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
	let labels = $state([]);
	$effect(() => {
		currentHps = hpNum !== null ? Array.from({ length: count }, () => hpNum) : [];
		labels = Array.from({ length: count }, (_, i) => memberNames[i] || (count <= 1 ? 'HP' : `#${i + 1}`));
	});
	const hpInline = $derived(count < 4);
	function getHpColor(val) {
		if (val == null) return null;
		return val <= 0 ? '#e05555' : val < hpNum ? '#d4a847' : '#5aaa6a';
	}
	import { commitHp as commitHpFn } from '$lib/dw/hpCommit.js';
	import { monsterUndo } from '$lib/dw/monsterUndo.svelte.js';
	import DraggableCounter from '$lib/components/DraggableCounter.svelte';

	let dcRefs = $state({});

	function commitMonsterHp(raw, idx) {
		const result = commitHpFn(raw, currentHps[idx], hpNum, armor ?? 0);
		if (result !== null) {
			const prev = currentHps[idx];
			monsterUndo.push(() => { currentHps[idx] = prev; });
			currentHps[idx] = result;
		}
	}

	const hpIndices = $derived(
		Array.from({ length: currentHps.length }, (_, i) => i)
			.sort((a, b) => (currentHps[a] <= 0 ? 1 : 0) - (currentHps[b] <= 0 ? 1 : 0))
	);

	// Dice rolling — rollKey increments on each roll to restart the CSS animation
	let rollResult = $state(null); // { attackKey: 'atk1'|'atk2', total: number }
	let rollKey = $state(0);

	function rollDie(sides) {
		return Math.ceil(Math.random() * sides);
	}

	function parseAndRoll(dmg) {
		if (!dmg || dmg === '??') return null;

		// "3d12 keep lowest 2 +3"
		const keepLowest = dmg.match(/^(\d+)d(\d+)\s+keep\s+lowest\s+(\d+)\s*([+-]\d+)?/i);
		if (keepLowest) {
			const cnt = +keepLowest[1], sides = +keepLowest[2], keep = +keepLowest[3], mod = +(keepLowest[4] || 0);
			const rolls = Array.from({ length: cnt }, () => rollDie(sides));
			const kept = [...rolls].sort((a, b) => a - b).slice(0, keep);
			const total = kept.reduce((a, b) => a + b, 0) + mod;
			const formula = `${cnt}d${sides}kl${keep}${mod ? (mod > 0 ? ` + ${mod}` : ` - ${-mod}`) : ''}`;
			const breakdown = `(${rolls.join(' or ')})${mod ? (mod > 0 ? ` + ${mod}` : ` - ${-mod}`) : ''}`;
			return { total, formula, breakdown };
		}

		// "3d12 keep highest 2 +9"
		const keepHighest = dmg.match(/^(\d+)d(\d+)\s+keep\s+highest\s+(\d+)\s*([+-]\d+)?/i);
		if (keepHighest) {
			const cnt = +keepHighest[1], sides = +keepHighest[2], keep = +keepHighest[3], mod = +(keepHighest[4] || 0);
			const rolls = Array.from({ length: cnt }, () => rollDie(sides));
			const kept = [...rolls].sort((a, b) => b - a).slice(0, keep);
			const total = kept.reduce((a, b) => a + b, 0) + mod;
			const formula = `${cnt}d${sides}kh${keep}${mod ? (mod > 0 ? ` + ${mod}` : ` - ${-mod}`) : ''}`;
			const breakdown = `(${rolls.join(' or ')})${mod ? (mod > 0 ? ` + ${mod}` : ` - ${-mod}`) : ''}`;
			return { total, formula, breakdown };
		}

		// "NdX+M" / "dX+M" / "dX"
		const m = dmg.match(/^(\d+)?d(\d+)([+-]\d+)?/i);
		if (!m) {
			// Plain number
			const n = dmg.match(/^([+-]?\d+)$/);
			if (!n) return null;
			const total = +n[1];
			return { total, formula: `${total}`, breakdown: `${total}` };
		}
		const cnt = +(m[1] || 1), sides = +m[2], modifier = +(m[3] || 0);
		const rolls = Array.from({ length: cnt }, () => rollDie(sides));
		const total = rolls.reduce((a, b) => a + b, 0) + modifier;
		const formula = `${cnt}d${sides}${modifier ? (modifier > 0 ? ` + ${modifier}` : ` - ${-modifier}`) : ''}`;
		const breakdown = rolls.join('+') + (modifier ? (modifier > 0 ? `+${modifier}` : `${modifier}`) : '');
		return { total, formula, breakdown };
	}

	function doRoll(dmg, atkIdx) {
		const result = parseAndRoll(dmg);
		if (result === null) return;
		rollKey++;
		rollResult = { atkIdx, total: result.total };
		diceHistory.add({
			formula: `${result.formula} ${name}`,
			breakdown: result.breakdown,
			total: result.total,
			tier: 'damage'
		});
	}

	function handleCopy(e) {
		const sel = window.getSelection();
		if (!sel.rangeCount) return;
		const range = sel.getRangeAt(0);
		if (!el.contains(range.commonAncestorContainer)) return;
		// Only intercept if the selection includes the monster name
		const nameEl = el.querySelector('.monster-name');
		if (!nameEl || !sel.containsNode(nameEl, true)) return;

		let md = `**${name}**`;
		if (tags) md += ` _${tags}_`;
		md += '\n';
		for (const atk of attacks) {
			md += `${atk.name} (${atk.damage ? atk.damage + ' damage' : '??'})`;
			if (atk.tags) md += ` ${atk.tags}`;
			md += '\n';
		}
		const vitals = [];
		if (hp !== null) vitals.push(`${hp} HP`);
		if (armor !== null) vitals.push(`${armor} Armor`);
		if (vitals.length) md += vitals.join(', ') + '\n';
		if (special) md += `**Special Qualities:** ${special}\n`;
		if (description) md += `\n${description}\n`;
		if (instinct) md += `\n_Instinct:_ ${instinct}\n`;
		if (moves.length) md += '\n' + moves.map(m => `- ${m}`).join('\n') + '\n';
		if (notes) md += `\n> ${notes}\n`;

		e.clipboardData.setData('text/plain', md.trim());
		e.preventDefault();
	}
</script>

<div class="monster" class:is-expanded={expanded} bind:this={el} oncopy={handleCopy}>
	<button
		class="monster-header"
		class:copied
		onclick={handleHeaderClick}
		onpointerdown={onPointerDown}
		onpointerup={onPointerUp}
		onpointercancel={onPointerUp}
	>
		<div class="monster-header-left">
			<span class="monster-name">{count > 1 ? `${name} ×${count}` : name}</span>
			{#if tags}
				<span class="monster-tags">{tags}</span>
			{/if}
		</div>
		{#if !expanded}
			<div class="monster-summary">
				{#if attacks.length > 0}
					<span class="summary-damage">{attacks.map(a => a.damage).filter(Boolean).map(d => d.replace(/\s*keep\s+highest\s*/i, 'kh').replace(/\s*keep\s+lowest\s*/i, 'kl')).join(', ')}</span>
				{/if}
				{#if hp !== null}<span class="summary-hp">{hp}</span>{/if}
				{#if armor !== null}<svg class="summary-armor-shield" width="18" height="18" viewBox="0 0 512 559" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0,47)"><path d="M256 16L48 96v160c0 138.5 89 229.3 208 240 119-10.7 208-101.5 208-240V96L256 16z" fill="#3a6faa" stroke="#2a4f7a" stroke-width="16"/><path d="M256 48L80 116v140c0 120 78 199 176 210 98-11 176-90 176-210V116L256 48z" fill="#5a8fd4"/></g><text x="256" y="305" text-anchor="middle" dominant-baseline="central" font-size="240" font-weight="bold" fill="#fff" font-family="sans-serif">{armor}</text></svg>{/if}
				{#if instinct}<span class="summary-instinct">{instinct}</span>{/if}
			</div>
		{:else if instinct}
			<span class="summary-instinct expanded-instinct">{instinct}</span>
		{/if}
	</button>

	<div class="monster-body" class:is-open={expanded}>
		<div class="monster-body-inner">
			{#if hasStats}
				<div class="monster-stats">
					<div class="monster-attacks">
						{#each attacks as atk, i}
							<div class="attack-row">
								<button class="attack-btn" onclick={(e) => { e.stopPropagation(); doRoll(atk.damage, i); }}>
									<span class="attack-name" style="min-width: {atkNameWidth}">{atk.name}</span>
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
								</button>
								{#if atk.tags}<span class="attack-tags">{atk.tags}</span>{/if}
							</div>
						{/each}
					</div>
					<div class="monster-vitals">
						{#if hp !== null && hpInline}
							{#each hpIndices as idx}
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<span class="hp-pill hp-draggable" onpointerdown={(e) => { if (!e.target.closest('.label-input')) dcRefs[idx]?.handlePointerDown(e); }}>
									<input
										class="label-input"
										style="width: {Math.max(2, labels[idx]?.length || 2) + 1}ch"
										bind:value={labels[idx]}
										onclick={(e) => e.stopPropagation()}
										onkeydown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
										onblur={() => { if (onLabelsChange) onLabelsChange(labels, count); }}
									/>
									{#if hpNum !== null}
										<DraggableCounter bind:this={dcRefs[idx]} value={currentHps[idx]} oncommit={(raw) => commitMonsterHp(raw, idx)} inputWidth="{String(currentHps[idx] ?? 0).length + 1}ch" style="color: {getHpColor(currentHps[idx])}">
											{#snippet children()}<span class="hp-display" style="color: {getHpColor(currentHps[idx])}">{currentHps[idx]}</span>{/snippet}
										</DraggableCounter>
									{:else}
										<span>{hp}</span>
									{/if}
								</span>
							{/each}
						{/if}
						{#if armor !== null}
							<span class="vital"><span class="vital-label">Armor</span> <svg class="armor-shield-vital" width="22" height="22" viewBox="0 0 512 559" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0,47)"><path d="M256 16L48 96v160c0 138.5 89 229.3 208 240 119-10.7 208-101.5 208-240V96L256 16z" fill="#3a6faa" stroke="#2a4f7a" stroke-width="16"/><path d="M256 48L80 116v140c0 120 78 199 176 210 98-11 176-90 176-210V116L256 48z" fill="#5a8fd4"/></g><text x="256" y="305" text-anchor="middle" dominant-baseline="central" font-size="240" font-weight="bold" fill="#fff" font-family="sans-serif">{armor}</text></svg></span>
						{/if}
					</div>
				</div>
			{/if}

			{#if hp !== null && !hpInline}
				<div class="monster-hp-grid">
					{#each hpIndices as idx}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<span class="hp-pill hp-draggable" onpointerdown={(e) => { if (!e.target.closest('.label-input')) dcRefs[idx]?.handlePointerDown(e); }}>
							<input
								class="label-input"
								style="width: {Math.max(2, labels[idx]?.length || 2) + 1}ch"
								bind:value={labels[idx]}
								onclick={(e) => e.stopPropagation()}
								onkeydown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
								onblur={() => { if (onLabelsChange) onLabelsChange(labels, count); }}
							/>
							{#if hpNum !== null}
								<DraggableCounter bind:this={dcRefs[idx]} value={currentHps[idx]} oncommit={(raw) => commitMonsterHp(raw, idx)} inputWidth="{String(currentHps[idx] ?? 0).length + 1}ch" style="color: {getHpColor(currentHps[idx])}">
									{#snippet children()}<span class="hp-display" style="color: {getHpColor(currentHps[idx])}">{currentHps[idx]}</span>{/snippet}
								</DraggableCounter>
							{:else}
								<span>{hp}</span>
							{/if}
						</span>
					{/each}
				</div>
			{/if}

			{#if description}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="monster-description" class:desc-expanded={descExpanded} onclick={(e) => {
					if (descLongPress) { descLongPress = false; return; }
					if (e.shiftKey) { localFlip = !localFlip; }
					else { localFlip = false; globalDesc.toggle(); }
				}} onpointerdown={() => { descLongPress = false; descLongTimer = setTimeout(() => { descLongPress = true; localFlip = !localFlip; }, 400); }}
				onpointerup={() => clearTimeout(descLongTimer)}
				onpointercancel={() => clearTimeout(descLongTimer)}>{@html descriptionHtml}</div>
			{/if}

			{#if special}
				<div class="monster-instinct">
					<span class="monster-special"><strong>Special:</strong> {special}</span>
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
	</div>
</div>

<style>
	.monster {
		border: none;
		overflow: hidden;
		margin: 0;
		transition: margin 0.25s ease;
	}

	.monster.is-expanded {
		margin: 1.25rem 0;
	}

	.monster-body {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows 0.25s ease;
	}

	.monster-body.is-open {
		grid-template-rows: 1fr;
	}

	.monster-body-inner {
		overflow: hidden;
	}

	.monster-header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.25rem 0.75rem;
		width: 100%;
		background: transparent;
		padding: 0.45rem 0.75rem;
		border: none;
		cursor: pointer;
		text-align: left;
		font: inherit;
		transition: background 0.15s;
		-webkit-user-select: none;
		user-select: none;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}

	.is-expanded .monster-header {
		border-bottom: none;
		position: relative;
	}

	.is-expanded .monster-header::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 10px;
		right: 10px;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent,
			#666 4px,
			#aaa 12px,
			#ddd 20%,
			#ddd 80%,
			#aaa calc(100% - 12px),
			#666 calc(100% - 4px),
			transparent
		);
	}


	.monster-header:hover {
		background: #2a2a2a;
	}

	.monster-header.copied {
		background: #2a3a2a;
		transition: background 0s;
	}

	.monster-header.copied .monster-name::after {
		content: ' +';
		color: #5aaa6a;
		font-size: 0.8em;
	}

	.monster-header-left {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
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
	}

	.monster-summary {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		margin-left: auto;
		font-size: 0.8rem;
		color: #888;
	}

	.summary-damage {
		color: #e05555;
		font-family: monospace;
	}

	.summary-hp {
		color: #5aaa6a;
		font-family: monospace;
	}

	.summary-armor-shield {
		display: inline-block;
		vertical-align: middle;
		transform: translateY(3px);
	}

	.armor-shield-vital {
		display: inline-block;
		vertical-align: middle;
		transform: translateY(-3px);
	}

	.summary-instinct {
		color: #777;
		font-style: italic;
	}

	.expanded-instinct {
		margin-left: auto;
		font-size: 0.8rem;
	}

	.monster-stats {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.25rem 0.5rem;
		padding: 0.4rem 0.75rem;
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
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		background: transparent;
		border: 1px solid #3a3a3a;
		border-radius: 999px;
		padding: 0.15rem 0.55rem;
		font: inherit;
		color: #ddd;
		cursor: pointer;
		font-size: 0.9rem;
		transition: background 0.15s, border-color 0.15s;
		flex-shrink: 0;
		touch-action: manipulation;
	}

	.attack-btn:hover {
		background: #2a2a2a;
		border-color: #555;
	}

	.attack-name {
		font-weight: bold;
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
		color: #e05555;
		font-family: monospace;
		font-weight: bold;
		font-size: 1.05rem;
		animation: roll-slide-fade 3s ease-out forwards;
		pointer-events: none;
		white-space: nowrap;
	}

	.attack-damage {
		color: #e05555;
		font-family: monospace;
		font-size: 0.85rem;
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
		flex-wrap: wrap;
		gap: 0.3rem 0.75rem;
		justify-content: flex-end;
		padding: 0.4rem 0.75rem;
	}

	.hp-pill {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		min-width: 5rem;
		background: transparent;
		border: 1px solid #3a3a3a;
		border-radius: 999px;
		padding: 0.2rem 0.6rem;
		cursor: pointer;
		font: inherit;
		font-size: 0.88rem;
		color: #ddd;
		transition: background 0.15s, border-color 0.15s;
		white-space: nowrap;
	}

	.hp-pill:hover {
		background: #2a2a2a;
		border-color: #555;
	}

	.hp-pill.hp-draggable {
		cursor: ns-resize;
		overflow: visible;
		touch-action: none;
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

	.label-input {
		background: none;
		border: none;
		padding: 0;
		margin: 0;
		font-size: 0.72rem;
		font-weight: bold;
		letter-spacing: 0.06em;
		color: #888;
		margin-right: 0.2rem;
		outline: none;
		cursor: text;
		flex: none;
	}

	.label-input:focus {
		color: #ccc;
	}

	.hp-display {
		font-size: 0.88rem;
		text-align: right;
		transition: color 0.2s;
		cursor: ns-resize;
	}

	.monster-description {
		padding: 0.5rem 0.75rem;
		color: #bbb;
		font-size: 0.92rem;
		line-height: 1.6;
		cursor: pointer;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.monster-description.desc-expanded {
		white-space: pre-line;
		overflow: visible;
		text-overflow: unset;
	}

	.monster-instinct {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.75rem;
		padding: 0.35rem 0.75rem 0.4rem;
		font-size: 0.88rem;
		color: #ccc;
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
	}

	.move-pill {
		background: transparent;
		border: 1px solid #393939;
		border-radius: 4px;
		padding: 0.3rem 0.5rem;
		color: #bbb;
		font-size: 0.78rem;
		font-family: inherit;
		cursor: pointer;
		text-align: center;
		line-height: 1.3;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
		touch-action: manipulation;
	}

	.move-pill:hover {
		background: #2a2a2a;
		border-color: #555;
		color: #ddd;
	}

	.move-pill.used {
		background: transparent;
		border-color: #6b5a2a;
		color: #c8a84b;
	}

	.monster-notes {
		border-top: 1px solid #333;
		border-left: 3px solid #d4a847;
		padding: 0.5rem 0.75rem;
		color: #999;
		font-size: 0.82rem;
		line-height: 1.6;
	}
</style>

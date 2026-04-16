<script>
	import TextBox from '$lib/components/TextBox.svelte';
	import { characterSheet } from '$lib/dw/characterSheet.svelte.js';
	import { tick } from 'svelte';

	const STAT_NAMES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

	let text = $state(characterSheet.value);

	$effect(() => { characterSheet.value = text; });

	$effect(() => {
		const storeVal = characterSheet.value;
		if (storeVal !== text) text = storeVal;
	});

	const parsed = $derived.by(() => {
		const lines = text.split('\n');
		const get = (i) => lines[i]?.trim() || '';

		// Line 0: "Name, Class Level"
		const line0 = get(0);
		const commaIdx = line0.indexOf(',');
		const name = commaIdx >= 0 ? line0.slice(0, commaIdx).trim() : line0;
		const classLevel = commaIdx >= 0 ? line0.slice(commaIdx + 1).trim() : '';
		const clMatch = classLevel.match(/^(.+?)\s+(\d+)$/);
		const clazz = clMatch ? clMatch[1] : classLevel;
		const level = clMatch ? clMatch[2] : '';

		// Line 1: "Base HP 15, Armor 0, Damage d6, Base Load 6, HP 6"
		const vitalsLine = get(1);
		const vParts = vitalsLine.split(',').map(s => s.trim());
		let exp = null, baseHp = null, armor = null, damage = null, baseLoad = null, hp = null;
		for (const p of vParts) {
			let m;
			if ((m = p.match(/^EXP\s+(\d+)$/i))) { exp = +m[1]; continue; }
			if ((m = p.match(/^Base\s*HP\s+(\d+)$/i))) { baseHp = +m[1]; continue; }
			if ((m = p.match(/^Armor\s+(\d+)$/i))) { armor = +m[1]; continue; }
			if ((m = p.match(/^Damage\s+(.+)$/i))) { damage = m[1]; continue; }
			if ((m = p.match(/^Base\s*Load\s+(\d+)$/i))) { baseLoad = +m[1]; continue; }
			if ((m = p.match(/^HP\s+(-?\d+)$/i))) { hp = +m[1]; continue; }
		}

		// Line 2: "STR 2, DEX 1, CON 1, INT 0, WIS 0, CHA -1"
		const statsRaw = get(2);
		const stats = {};
		if (statsRaw) {
			const labeled = [...statsRaw.matchAll(/([A-Za-z]+)\s*([+-]?\d+)/g)];
			if (labeled.length > 0) {
				for (const m of labeled) stats[m[1].toUpperCase()] = +m[2];
			} else {
				const nums = statsRaw.split(/[,\s]+/).map(Number).filter(n => !isNaN(n));
				for (let i = 0; i < Math.min(nums.length, STAT_NAMES.length); i++) {
					stats[STAT_NAMES[i]] = nums[i];
				}
			}
		}

		// Line 3: character art image URL
		const image = get(3);

		const body = lines.slice(4).join('\n');

		return { name, clazz, level, exp, baseHp, armor, damage, baseLoad, hp, stats, image, body };
	});

	// Computed max values from base + stat modifiers
	const maxHp = $derived(parsed.baseHp !== null ? parsed.baseHp + 3 * (parsed.stats.CON ?? 0) : null);
	const maxLoad = $derived(parsed.baseLoad !== null ? parsed.baseLoad + (parsed.stats.STR ?? 0) : null);

	// Carried weight from "(N weight)" in body
	const carriedWeight = $derived.by(() => {
		const matches = [...parsed.body.matchAll(/(\d+)\s+weight/gi)];
		return matches.reduce((sum, m) => sum + (+m[1]), 0);
	});

	const placeholders = $derived.by(() => {
		if (!text.trim()) {
			return ['Shift+click or long-press a class in the sidebar to get started'];
		}
		const lines = text.split('\n');
		const hints = [
			'Name, Class Level',
			'EXP 0, Base HP 15, Armor 0, Damage d6, Base Load 6, HP 18',
			'STR 2, DEX 1, CON 1, INT 0, WIS 0, CHA -1',
			'Character art image URL',
		];
		const phs = hints.map((h, i) => (lines[i]?.trim() ? '' : h));
		const total = Math.max(lines.length + 1, phs.length);
		while (phs.length < total) phs.push('');
		return phs;
	});

	function fmtMod(n) {
		return n > 0 ? `+${n}` : `${n}`;
	}

	// --- HP editing ---
	function updateHpInText(newHp) {
		const lines = text.split('\n');
		const parts = lines[1].split(',').map(s => s.trim());
		const idx = parts.findIndex(p => /^HP\s/i.test(p) && !/^Base/i.test(p));
		if (idx !== -1) {
			parts[idx] = `HP ${newHp}`;
			lines[1] = parts.join(', ');
			text = lines.join('\n');
		}
	}

	function updateExpInText(newExp) {
		const lines = text.split('\n');
		const parts = lines[1].split(',').map(s => s.trim());
		const idx = parts.findIndex(p => /^EXP\s/i.test(p));
		if (idx !== -1) {
			parts[idx] = `EXP ${newExp}`;
		} else {
			parts.unshift(`EXP ${newExp}`);
		}
		lines[1] = parts.join(', ');
		text = lines.join('\n');
	}

	function clickExp() {
		updateExpInText((parsed.exp ?? 0) + 1);
	}

	let editingExp = $state(false);
	let expInputEl;

	function startEditExp(e) {
		e.stopPropagation();
		editingExp = true;
		tick().then(() => expInputEl?.select());
	}

	function commitExp(e) {
		const raw = e.target.value.trim();
		if (!raw) { editingExp = false; return; }
		const val = parseInt(raw);
		if (!isNaN(val)) updateExpInText(val);
		editingExp = false;
	}

	function clickHp() {
		if (editingHp) return;
		if (maxHp === null || parsed.hp === null) return;
		updateHpInText(parsed.hp <= 0 ? maxHp : parsed.hp - 1);
	}

	let editingHp = $state(false);
	let hpInputEl;

	function startEditHp(e) {
		e.stopPropagation();
		editingHp = true;
		tick().then(() => hpInputEl?.select());
	}

	function commitHp(e) {
		const raw = e.target.value.trim();
		if (!raw) { editingHp = false; return; }
		const currentHp = parsed.hp ?? 0;
		if (raw.startsWith('+')) {
			// Heal: +N, capped at maxHp
			const heal = parseInt(raw.slice(1));
			if (!isNaN(heal)) updateHpInText(Math.min(currentHp + heal, maxHp ?? Infinity));
		} else if (raw.startsWith('-')) {
			// Damage: -N, reduced by armor
			const dmg = parseInt(raw.slice(1));
			if (!isNaN(dmg)) {
				const effective = Math.max(0, dmg - (parsed.armor ?? 0));
				updateHpInText(currentHp - effective);
			}
		} else {
			// Absolute value
			const val = parseInt(raw);
			if (!isNaN(val)) updateHpInText(val);
		}
		editingHp = false;
	}

	const hpFillPct = $derived(maxHp ? Math.max(0, Math.min(100, ((parsed.hp ?? 0) / maxHp) * 100)) : 0);

	function hpColor(current, max) {
		if (current == null || max == null) return '#5aaa6a';
		if (current <= 0) return '#e05555';
		const pct = current / max;
		if (pct > 0.5) return '#5aaa6a';
		if (pct > 0.25) return '#d4a847';
		return '#e05555';
	}

	// --- Load helpers ---
	const loadFillPct = $derived(maxLoad ? Math.max(0, Math.min(100, (carriedWeight / maxLoad) * 100)) : 0);

	function loadColor(carried, max) {
		if (max == null) return '#d4a847';
		return carried > max ? '#e05555' : '#d4a847';
	}

	// --- Dice rolling ---
	let rollResult = $state(null);
	let rollKey = $state(0);

	function rollDie(sides) {
		return Math.ceil(Math.random() * sides);
	}

	function launchDir() {
		const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.8;
		const dist = 120 + Math.random() * 60;
		return { lx: Math.cos(angle) * dist, ly: Math.sin(angle) * dist };
	}

	function rollStat(ab, mod, e) {
		const total = rollDie(6) + rollDie(6) + mod;
		const { lx, ly } = launchDir();
		rollKey++;
		rollResult = { ab, mod, total, mx: e.clientX, my: e.clientY, lx, ly };
	}

	function rollDamageFormula(formula, e) {
		// Parse compound formula like "d10+d4+d8" or "2d6"
		const total = parseDamageFormula(formula);
		if (total === null) return;
		const { lx, ly } = launchDir();
		rollKey++;
		rollResult = { ab: 'DMG', mod: 0, total, mx: e.clientX, my: e.clientY, lx, ly, isDamage: true, formula };
	}

	function parseDamageFormula(formula) {
		// Handles "d10", "2d6", "d10+d4", "d10+d4+d8", "2d4+3" etc.
		let total = 0;
		let rest = formula.replace(/\s+/g, '');
		// Split on + but keep negative modifiers
		const parts = rest.match(/[+-]?[^+-]+/g);
		if (!parts) return null;
		let anyDice = false;
		for (const part of parts) {
			const dm = part.match(/^([+-]?)(\d+)?d(\d+)$/i);
			if (dm) {
				const sign = dm[1] === '-' ? -1 : 1;
				const count = +(dm[2] || 1);
				const sides = +dm[3];
				for (let i = 0; i < count; i++) total += sign * rollDie(sides);
				anyDice = true;
			} else {
				const n = parseInt(part);
				if (!isNaN(n)) total += n;
			}
		}
		return anyDice ? total : null;
	}

	function rollTier(total, isDamage) {
		if (isDamage) return 'damage';
		if (total >= 10) return 'strong';
		if (total >= 7) return 'weak';
		return 'miss';
	}

	// --- Stat drag-to-swap ---
	let dragStat = $state(null);
	let dropTarget = $state(null);

	function onStatDragStart(e, ab) {
		dragStat = ab;
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', ab);
	}

	function onStatDragOver(e, ab) {
		if (dragStat && dragStat !== ab) {
			e.preventDefault();
			dropTarget = ab;
		}
	}

	function onStatDragLeave(ab) {
		if (dropTarget === ab) dropTarget = null;
	}

	function onStatDrop(e, ab) {
		e.preventDefault();
		if (!dragStat || dragStat === ab) return;
		swapStats(dragStat, ab);
		dragStat = null;
		dropTarget = null;
	}

	function onStatDragEnd() {
		dragStat = null;
		dropTarget = null;
	}

	function swapStats(a, b) {
		const lines = text.split('\n');
		const statsLine = lines[2];
		// Parse labeled values
		const parts = statsLine.split(',').map(s => s.trim());
		const vals = {};
		for (const p of parts) {
			const m = p.match(/^([A-Za-z]+)\s*([+-]?\d+)$/);
			if (m) vals[m[1].toUpperCase()] = m[2];
		}
		// Swap
		const tmp = vals[a];
		vals[a] = vals[b];
		vals[b] = tmp;
		// Rebuild line preserving order
		lines[2] = parts.map(p => {
			const m = p.match(/^([A-Za-z]+)\s*/);
			if (m) return `${m[1]} ${vals[m[1].toUpperCase()] ?? 0}`;
			return p;
		}).join(', ');
		text = lines.join('\n');
	}

	// Parse damage field into rollable entries (split on semicolons)
	const damageEntries = $derived.by(() => {
		if (!parsed.damage) return [];
		return parsed.damage.split(';').map(s => s.trim()).filter(Boolean);
	});

	// Simple markdown → HTML (CommonMark-ish)
	function renderMarkdown(src) {
		if (!src.trim()) return '';
		const lines = src.split('\n');
		let html = '';
		let inList = false;
		let listTag = '';
		let paraLines = [];

		function closePendingList() {
			if (inList) { html += `</${listTag}>`; inList = false; }
		}

		function flushPara() {
			if (paraLines.length === 0) return;
			const content = paraLines.map((l, i) => {
				const isLast = i === paraLines.length - 1;
				// Hard break: trailing two spaces or trailing backslash
				if (!isLast && / {2,}$/.test(l)) return inline(l.replace(/ {2,}$/, '')) + '<br>';
				if (!isLast && /\\$/.test(l)) return inline(l.slice(0, -1)) + '<br>';
				return inline(l);
			}).join('\n');
			html += `<p>${content}</p>`;
			paraLines = [];
		}

		function inline(t) {
			// Backslash escapes: \* \_ \\ \` \[ etc.
			// Replace escaped chars with placeholders, process, then restore
			const escapes = [];
			t = t.replace(/\\([\\`*_\[\]{}()#+\-.!|~])/g, (_, ch) => {
				escapes.push(ch);
				return `\x00ESC${escapes.length - 1}\x00`;
			});

			t = t
				.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
				.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
				.replace(/__(.+?)__/g, '<strong>$1</strong>')
				.replace(/\*(.+?)\*/g, '<em>$1</em>')
				.replace(/_(.+?)_/g, '<em>$1</em>')
				.replace(/`(.+?)`/g, '<code>$1</code>')
				.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

			// Restore escaped characters
			t = t.replace(/\x00ESC(\d+)\x00/g, (_, i) => escapes[+i].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));

			return t;
		}

		for (const line of lines) {
			const hm = line.match(/^(#{1,4})\s+(.*)/);
			if (hm) {
				flushPara();
				closePendingList();
				const level = hm[1].length;
				html += `<h${level}>${inline(hm[2])}</h${level}>`;
				continue;
			}

			if (/^---+$/.test(line.trim())) {
				flushPara();
				closePendingList();
				html += '<hr>';
				continue;
			}

			if (line.startsWith('> ')) {
				flushPara();
				closePendingList();
				html += `<blockquote><p>${inline(line.slice(2))}</p></blockquote>`;
				continue;
			}

			const ul = line.match(/^[-*]\s+(.*)/);
			if (ul) {
				flushPara();
				if (!inList || listTag !== 'ul') { closePendingList(); html += '<ul>'; inList = true; listTag = 'ul'; }
				html += `<li>${inline(ul[1])}</li>`;
				continue;
			}

			const ol = line.match(/^\d+\.\s+(.*)/);
			if (ol) {
				flushPara();
				if (!inList || listTag !== 'ol') { closePendingList(); html += '<ol>'; inList = true; listTag = 'ol'; }
				html += `<li>${inline(ol[1])}</li>`;
				continue;
			}

			if (!line.trim()) {
				flushPara();
				closePendingList();
				continue;
			}

			// Continuation of paragraph
			closePendingList();
			paraLines.push(line);
		}
		flushPara();
		closePendingList();
		return html;
	}

	const bodyHtml = $derived(renderMarkdown(parsed.body));
</script>

<svelte:head>
	<title>Character Sheet - Dungeon World</title>
</svelte:head>

<article class="dw-article">
	<h1>Character Sheet</h1>

	<div class="sheet-editor">
		<TextBox bind:value={text} {placeholders} rows={12} />
	</div>

	{#if parsed.name}
		<div class="sheet-preview" style={parsed.image ? `background-image: url('${parsed.image}')` : ''}>
			<div class="sheet-top">
			<div class="sheet-header">
				<div class="header-info">
					<h2 class="char-name">{parsed.name}</h2>
					{#if parsed.clazz || parsed.level}
						<p class="char-subtitle">
							{#if parsed.clazz}<span class="char-class">{parsed.clazz}</span>{/if}
							{#if parsed.level}<span class="char-level">Level {parsed.level}</span>{/if}
						</p>
					{/if}
				</div>
				{#if parsed.hp !== null || parsed.armor !== null || damageEntries.length > 0 || maxLoad !== null}
					<div class="header-circles">
						{#if parsed.exp !== null}
							<button class="circle circle-xs circle-exp" onclick={clickExp} title="Add 1 EXP">
								{#if editingExp}
									<input
										class="exp-edit"
										type="text"
										value={parsed.exp}
										bind:this={expInputEl}
										onclick={(e) => e.stopPropagation()}
										onblur={commitExp}
										onkeydown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { editingExp = false; } }}
									/>
								{:else}
									<span class="circle-text" onclick={startEditExp}>{parsed.exp}</span>
								{/if}
								<span class="circle-label">EXP</span>
							</button>
						{/if}
						{#if maxLoad !== null}
							{@const ldC = loadColor(carriedWeight, maxLoad)}
							<div class="circle circle-sm" style="border-color: {ldC}; color: {ldC}">
								<div class="circle-fill" style="height: {loadFillPct}%; background: {ldC}"></div>
								<span class="circle-text">{carriedWeight}/{maxLoad}</span>
								<span class="circle-label">Load</span>
							</div>
						{/if}
						{#if parsed.armor !== null}
							<div class="circle circle-md circle-armor">
								<span class="circle-text">{parsed.armor}</span>
								<span class="circle-label">Armor</span>
							</div>
						{/if}
						{#if parsed.hp !== null && maxHp !== null}
							{@const hpC = hpColor(parsed.hp, maxHp)}
							<button class="circle circle-lg" style="border-color: {hpC}" onclick={clickHp} title={parsed.hp <= 0 ? 'Reset HP' : 'Click to reduce HP'}>
								<div class="circle-fill" style="height: {hpFillPct}%; background: {hpC}"></div>
								{#if editingHp}
									<input
										class="hp-edit"
										type="text"
										value={parsed.hp}
										bind:this={hpInputEl}
										onclick={(e) => e.stopPropagation()}
										onblur={commitHp}
										onkeydown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { editingHp = false; } }}
									/>
								{:else}
									<span class="circle-text" style="color: {hpC}" onclick={startEditHp}>{parsed.hp}/{maxHp}</span>
								{/if}
								<span class="circle-label" style="color: {hpC}">Health</span>
							</button>
						{/if}
						{#each damageEntries as dmgEntry, i}
							<button class="circle circle-lg circle-damage" onclick={(e) => rollDamageFormula(dmgEntry, e)} title="Roll {dmgEntry}">
								<span class="circle-text">{dmgEntry}</span>
								<span class="circle-label">{'Damage'}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			{#if Object.keys(parsed.stats).length > 0}
				<div class="char-stats">
					{#each Object.entries(parsed.stats) as [ab, mod]}
						<button
							class="stat-pill"
							class:drag-over={dropTarget === ab}
							draggable="true"
							onclick={(e) => rollStat(ab, mod, e)}
							ondragstart={(e) => onStatDragStart(e, ab)}
							ondragover={(e) => onStatDragOver(e, ab)}
							ondragleave={() => onStatDragLeave(ab)}
							ondrop={(e) => onStatDrop(e, ab)}
							ondragend={onStatDragEnd}
						>
							<span class="stat-label">{ab}</span>
							<span class="stat-value">{fmtMod(mod)}</span>
						</button>
					{/each}
				</div>
			{/if}
			</div>

			{#if bodyHtml}
				<div class="char-body">
					{@html bodyHtml}
				</div>
			{/if}
		</div>
	{/if}
</article>

<!-- Roll result -->
{#key rollKey}
	{#if rollResult}
		{@const tier = rollTier(rollResult.total, rollResult.isDamage)}
		<div
			class="roll-bubble roll-{tier}"
			style="left: {rollResult.mx}px; top: {rollResult.my}px; --lx: {rollResult.lx}px; --ly: {rollResult.ly}px"
			onanimationend={() => { rollResult = null; }}
		>
			<span class="roll-total">{rollResult.total}</span>
			<span class="roll-label">
				{#if rollResult.isDamage}
					{rollResult.formula}
				{:else}
					2d6{rollResult.mod !== 0 ? fmtMod(rollResult.mod) : ''} {rollResult.ab}
				{/if}
			</span>
		</div>
	{/if}
{/key}

<style>
	.sheet-editor {
		margin-bottom: 1.5rem;
	}

	.sheet-preview {
		border: 1px solid #333;
		border-radius: 6px;
		background-size: cover;
		background-position: center top;
		background-repeat: no-repeat;
	}

	.sheet-top {
		position: sticky;
		top: calc(2rem * 1.7 + 1rem + 1px);
		z-index: 9;
		border-radius: 6px 6px 0 0;
	}

	/* --- Header with circles --- */
	.sheet-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 1rem;
		background: #252525;
		border-bottom: 1px solid #333;
	}

	.header-info {
		min-width: 0;
	}

	.char-name {
		margin: 0;
		font-size: 1.4rem;
		text-align: left;
	}

	.char-subtitle {
		margin: 0.2rem 0 0;
		font-size: 0.9rem;
		color: #aaa;
	}

	.char-class {
		font-style: italic;
	}

	.char-level {
		margin-left: 0.5rem;
		color: #888;
	}

	.header-circles {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	/* --- Circles --- */
	.circle {
		position: relative;
		border-radius: 50%;
		border: 2px solid;
		background: #1a1a1a;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		font: inherit;
		padding: 0;
		cursor: default;
	}

	button.circle {
		cursor: pointer;
		transition: filter 0.15s;
	}

	button.circle:hover {
		filter: brightness(1.2);
	}

	.circle-lg {
		width: 60px;
		height: 60px;
	}

	.circle-md {
		width: 51px;
		height: 51px;
	}

	.circle-xs {
		width: 34px;
		height: 34px;
	}

	.circle-sm {
		width: 42px;
		height: 42px;
	}

	.circle-fill {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		opacity: 0.25;
		transition: height 0.3s, background 0.3s;
	}

	.circle-text {
		position: relative;
		z-index: 1;
		font-weight: bold;
		font-size: 0.82rem;
		line-height: 1;
		cursor: pointer;
	}

	.circle-xs .circle-text {
		font-size: 0.7rem;
	}

	.circle-sm .circle-text {
		font-size: 0.75rem;
		cursor: default;
	}

	.circle-label {
		position: relative;
		z-index: 1;
		font-size: 0.5rem;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		opacity: 0.7;
		line-height: 1;
		margin-top: 2px;
	}

	.circle-damage {
		border-color: #e05555;
		color: #e05555;
	}

	.circle-exp {
		border-color: #9b59b6;
		color: #9b59b6;
	}

	.circle-armor {
		border-color: #5a8fd4;
		color: #5a8fd4;
	}

	/* HP edit input inside circle */
	.hp-edit {
		position: relative;
		z-index: 1;
		width: 2.5rem;
		background: transparent;
		border: none;
		border-bottom: 1px solid currentColor;
		color: inherit;
		font: inherit;
		font-size: 0.82rem;
		font-weight: bold;
		text-align: center;
		outline: none;
		padding: 0;
		-moz-appearance: textfield;
		appearance: textfield;
	}

	.hp-edit::-webkit-inner-spin-button,
	.hp-edit::-webkit-outer-spin-button {
		-webkit-appearance: none;
	}

	.exp-edit {
		position: relative;
		z-index: 1;
		width: 1.5rem;
		background: transparent;
		border: none;
		border-bottom: 1px solid currentColor;
		color: inherit;
		font: inherit;
		font-size: 0.7rem;
		font-weight: bold;
		text-align: center;
		outline: none;
		padding: 0;
	}

	/* --- Stat pills (centered, clickable) --- */
	.char-stats {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: #1e1e1e;
		border-bottom: 1px solid #2c2c2c;
	}

	.stat-pill {
		display: flex;
		align-items: baseline;
		gap: 0.3rem;
		background: #2a2a2a;
		border: 1px solid #3a3a3a;
		border-radius: 999px;
		padding: 0.2rem 0.6rem;
		font: inherit;
		font-size: 0.88rem;
		white-space: nowrap;
		color: #ddd;
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s;
	}

	.stat-pill:hover {
		background: #333;
		border-color: #555;
	}

	.stat-pill.drag-over {
		background: #3a3a5a;
		border-color: #aabbff;
		box-shadow: 0 0 8px #aabbff44;
	}

	.stat-label {
		font-size: 0.72rem;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #888;
	}

	.stat-value {
		color: #ddd;
		font-weight: bold;
	}

	/* --- Body --- */
	.char-body {
		padding: 0.75rem 1rem;
		background: #1a1a1a;
		white-space: normal;
		word-wrap: break-word;
	}

	.char-body :global(h1) {
		position: static;
	}

	.char-body :global(h2) {
		margin-top: 1.5rem;
	}

	.char-body :global(h2:first-child) {
		margin-top: 0;
	}

	.char-body :global(h3) {
		margin-top: 1rem;
	}

	/* --- Roll bubble (launches from mouse) --- */
	@keyframes roll-launch {
		0%   { transform: translate(-50%, -50%) scale(0); opacity: 0; }
		15%  { transform: translate(calc(-50% + var(--lx) * 0.4), calc(-50% + var(--ly) * 0.4)) scale(1.15); opacity: 1; }
		30%  { transform: translate(calc(-50% + var(--lx) * 0.7), calc(-50% + var(--ly) * 0.7)) scale(1); opacity: 1; }
		75%  { transform: translate(calc(-50% + var(--lx)), calc(-50% + var(--ly))) scale(1); opacity: 1; }
		100% { transform: translate(calc(-50% + var(--lx) * 1.05), calc(-50% + var(--ly) * 1.05)) scale(0.9); opacity: 0; }
	}

	.roll-bubble {
		position: fixed;
		z-index: 200;
		pointer-events: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 1.5rem 2.5rem;
		border-radius: 16px;
		background: #1a1a1aee;
		border: 2px solid;
		animation: roll-launch 2s ease-out forwards;
		box-shadow: 0 0 40px #0008;
	}

	.roll-total {
		font-size: 3.5rem;
		font-weight: bold;
		line-height: 1;
	}

	.roll-label {
		font-size: 0.85rem;
		opacity: 0.7;
	}

	.roll-strong {
		border-color: #5aaa6a;
		color: #5aaa6a;
	}

	.roll-weak {
		border-color: #d4a847;
		color: #d4a847;
	}

	.roll-miss {
		border-color: #e05555;
		color: #e05555;
	}

	.roll-damage {
		border-color: #e05555;
		color: #e05555;
	}
</style>

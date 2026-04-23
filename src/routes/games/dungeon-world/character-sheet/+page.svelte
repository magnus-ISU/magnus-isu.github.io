<script>
import { tick, untrack } from 'svelte';
import DraggableCounter from '$lib/components/DraggableCounter.svelte';
import TextBox from '$lib/components/TextBox.svelte';
import { characterSheet } from '$lib/dw/characterSheet.svelte.js';
import { diceHistory } from '$lib/dw/diceHistory.svelte.js';
import { commitHp as commitHpFn } from '$lib/dw/hpCommit.js';
import { renderMarkdown } from '$lib/dw/renderMarkdown.js';

const STAT_NAMES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

let text = $state(characterSheet.value);

$effect(() => {
	const t = text;
	untrack(() => {
		characterSheet.value = t;
	});
});

$effect(() => {
	const storeVal = characterSheet.value;
	if (storeVal !== text) text = storeVal;
});

// --- Multi-character tabs ---
let activeTab = $state(characterSheet.activeIndex);

function switchTab(i) {
	if (i === activeTab) return;
	characterSheet.switchTo(i);
	activeTab = i;
	text = characterSheet.value;
	undoStack = [];
}

function addCharacter() {
	characterSheet.addSlot();
	activeTab = characterSheet.activeIndex;
	text = '';
	undoStack = [];
}

function tabName(i) {
	return characterSheet.slotName(i) || 'Untitled';
}

// --- Delete character confirmation ---
let pendingDeleteIdx = $state(null);
let lastDeleteConfirmed = 0;
let longPressTimer = null;

function requestDelete(i) {
	if (characterSheet.slotCount <= 1) return;
	if (Date.now() - lastDeleteConfirmed < 60_000) {
		doDelete(i);
	} else {
		pendingDeleteIdx = i;
	}
}

function confirmDelete() {
	lastDeleteConfirmed = Date.now();
	doDelete(pendingDeleteIdx);
	pendingDeleteIdx = null;
}

function cancelDelete() {
	pendingDeleteIdx = null;
}

function doDelete(i) {
	characterSheet.deleteSlot(i);
	activeTab = characterSheet.activeIndex;
	text = characterSheet.value;
	undoStack = [];
}

function onTabPointerDown(e, i) {
	clearTimeout(longPressTimer);
	longPressTimer = setTimeout(() => {
		requestDelete(i);
	}, 500);
}

function onTabPointerUp() {
	clearTimeout(longPressTimer);
}

const showNewButton = $derived(
	// Show "New Character" when there's no empty trailing slot
	characterSheet.slotCount === 0 ||
		!characterSheet.isEmpty ||
		activeTab !== characterSheet.slotCount - 1,
);

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
	const vParts = vitalsLine.split(',').map((s) => s.trim());
	let exp = null,
		baseHp = null,
		armor = null,
		damage = null,
		baseLoad = null,
		hp = null;
	for (const p of vParts) {
		let m;
		if ((m = p.match(/^EXP\s+(\d+)$/i))) {
			exp = +m[1];
			continue;
		}
		if ((m = p.match(/^Base\s*HP\s+(\d+)$/i))) {
			baseHp = +m[1];
			continue;
		}
		if ((m = p.match(/^Armor\s+(-?\d+)$/i))) {
			armor = +m[1];
			continue;
		}
		if ((m = p.match(/^Damage\s+(.+)$/i))) {
			damage = m[1];
			continue;
		}
		if ((m = p.match(/^Base\s*Load\s+(\d+)$/i))) {
			baseLoad = +m[1];
			continue;
		}
		if ((m = p.match(/^HP\s+(-?\d+)$/i))) {
			hp = +m[1];
		}
	}

	// Line 2: "STR 2, DEX 1, CON 1, INT 0, WIS 0, CHA -1"
	const statsRaw = get(2);
	const stats = {};
	if (statsRaw) {
		const labeled = [...statsRaw.matchAll(/([A-Za-z]+)\s*([+-]?\d+)/g)];
		if (labeled.length > 0) {
			for (const m of labeled) stats[m[1].toUpperCase()] = +m[2];
		} else {
			const nums = statsRaw
				.split(/[,\s]+/)
				.map(Number)
				.filter((n) => !Number.isNaN(n));
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
const maxLoad = $derived(
	parsed.baseLoad !== null ? parsed.baseLoad + (parsed.stats.STR ?? 0) : null,
);

// Carried weight and worn armor parsed from body in a single pass
const bodyStats = $derived.by(() => {
	const body = parsed.body;
	let weight = 0,
		coins = 0,
		baseArmor = 0,
		bonusArmor = 0;
	for (const m of body.matchAll(/\[([+-]?)(\d+)\s+(Weight|Armor|Coin)\]/gi)) {
		const val = (m[1] === '-' ? -1 : 1) * +m[2];
		const type = m[3].toLowerCase();
		if (type === 'weight') weight += val;
		else if (type === 'coin') coins += val;
		else if (type === 'armor' && m[1]) bonusArmor += val;
		else if (type === 'armor') baseArmor = Math.max(baseArmor, val);
	}
	return { weight: weight + Math.floor(coins / 100), armor: baseArmor + bonusArmor };
});
const carriedWeight = $derived(bodyStats.weight);
const wornArmor = $derived(bodyStats.armor);
const totalArmor = $derived((parsed.armor ?? 0) + wornArmor);

const placeholders = $derived.by(() => {
	if (!text.trim()) {
		return [
			'Shift+click or long-press a class in the sidebar to get started, or open a class and click its name',
		];
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

const charSheetDefault = 'Name, Class 1\nEXP 0, Base HP 15, Armor 0, Damage d6, Base Load 6, HP 15\nSTR 2, DEX 1, CON 1, INT 0, WIS 0, CHA -1';

function fmtMod(n) {
	return n > 0 ? `+${n}` : `${n}`;
}

// --- Undo stack for programmatic edits (HP/EXP) ---
let undoStack = [];

function pushUndo() {
	undoStack.push(text);
}

function undo() {
	if (!undoStack.length) return;
	text = undoStack.pop();
}

// --- HP editing ---
function updateHpInText(newHp) {
	const lines = text.split('\n');
	const parts = lines[1].split(',').map((s) => s.trim());
	const idx = parts.findIndex((p) => /^HP\s/i.test(p) && !/^Base/i.test(p));
	if (idx !== -1) {
		pushUndo();
		parts[idx] = `HP ${newHp}`;
		lines[1] = parts.join(', ');
		text = lines.join('\n');
	}
}

function updateExpInText(newExp) {
	pushUndo();
	const lines = text.split('\n');
	const parts = lines[1].split(',').map((s) => s.trim());
	const idx = parts.findIndex((p) => /^EXP\s/i.test(p));
	if (idx !== -1) {
		parts[idx] = `EXP ${newExp}`;
	} else {
		parts.unshift(`EXP ${newExp}`);
	}
	lines[1] = parts.join(', ');
	text = lines.join('\n');
}

function commitExpRaw(raw) {
	const result = commitHpFn(raw, parsed.exp ?? 0, null, 0);
	if (result !== null) updateExpInText(Math.max(0, result));
}

let hpDcRef = $state();
let expDcRef = $state();

function commitHpRaw(raw) {
	const result = commitHpFn(raw, parsed.hp ?? 0, maxHp, totalArmor);
	if (result !== null) updateHpInText(result);
}

const hpFillPct = $derived(
	maxHp ? Math.max(0, Math.min(100, ((parsed.hp ?? 0) / maxHp) * 100)) : 0,
);

// --- Editable Armor ---
let editingArmor = $state(false);
let armorInputEl = $state();

function startEditArmor() {
	editingArmor = true;
	tick().then(() => {
		armorInputEl?.select();
	});
}

function commitArmor(el) {
	editingArmor = false;
	const val = parseInt(el.value, 10);
	if (Number.isNaN(val)) return;
	const newBaseArmor = val - wornArmor;
	pushUndo();
	const lines = text.split('\n');
	const parts = lines[1].split(',').map((s) => s.trim());
	const idx = parts.findIndex((p) => /^Armor\s/i.test(p));
	if (idx !== -1) parts[idx] = `Armor ${newBaseArmor}`;
	lines[1] = parts.join(', ');
	text = lines.join('\n');
}

// --- Editable Load ---
let editingLoad = $state(false);
let loadInputEl = $state();

function startEditLoad() {
	editingLoad = true;
	tick().then(() => {
		loadInputEl?.select();
	});
}

function commitLoad(el) {
	editingLoad = false;
	const val = parseInt(el.value, 10);
	if (Number.isNaN(val)) return;
	const newBaseLoad = val - (parsed.stats.STR ?? 0);
	pushUndo();
	const lines = text.split('\n');
	const parts = lines[1].split(',').map((s) => s.trim());
	const idx = parts.findIndex((p) => /^Base\s*Load\s/i.test(p));
	if (idx !== -1) parts[idx] = `Base Load ${newBaseLoad}`;
	lines[1] = parts.join(', ');
	text = lines.join('\n');
}

function hpColor(current, max) {
	if (current == null || max == null) return '#5aaa6a';
	if (current <= 0) return '#e05555';
	const pct = current / max;
	if (pct > 0.5) return '#5aaa6a';
	if (pct > 0.25) return '#d4a847';
	return '#e05555';
}

// --- Load helpers ---
const loadFillPct = $derived(
	maxLoad ? Math.max(0, Math.min(100, (carriedWeight / maxLoad) * 100)) : 0,
);

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
	const r1 = rollDie(6),
		r2 = rollDie(6);
	const total = r1 + r2 + mod;
	const { lx, ly } = launchDir();
	rollKey++;
	rollResult = { ab, mod, total, mx: e.clientX, my: e.clientY, lx, ly };
	const modStr = mod !== 0 ? (mod > 0 ? `+${mod}` : `${mod}`) : '';
	diceHistory.add({
		formula: `2d6${modStr} ${ab}`,
		breakdown: `${r1}+${r2}${modStr}`,
		total,
		tier: rollTier(total, false),
	});
}

function rollDamageFormula(formula, e) {
	const result = parseDamageFormula(formula);
	if (result === null) return;
	const { lx, ly } = launchDir();
	rollKey++;
	rollResult = {
		ab: 'DMG',
		mod: 0,
		total: result.total,
		mx: e.clientX,
		my: e.clientY,
		lx,
		ly,
		isDamage: true,
		formula,
	};
	diceHistory.add({
		formula,
		breakdown: result.rolls.join('+'),
		total: result.total,
		tier: 'damage',
	});
}

function parseDamageFormula(formula) {
	// Handles "d10", "2d6", "d10+d4", "d10+d4+d8", "2d4+3" etc.
	let total = 0;
	const rolls = [];
	let rest = formula.replace(/\s+/g, '');
	const parts = rest.match(/[+-]?[^+-]+/g);
	if (!parts) return null;
	let anyDice = false;
	for (const part of parts) {
		const dm = part.match(/^([+-]?)(\d+)?d(\d+)$/i);
		if (dm) {
			const sign = dm[1] === '-' ? -1 : 1;
			const count = +(dm[2] || 1);
			const sides = +dm[3];
			for (let i = 0; i < count; i++) {
				const v = rollDie(sides);
				total += sign * v;
				rolls.push(sign < 0 ? -v : v);
			}
			anyDice = true;
		} else {
			const n = parseInt(part, 10);
			if (!Number.isNaN(n)) {
				total += n;
				rolls.push(n);
			}
		}
	}
	return anyDice ? { total, rolls } : null;
}

function rollTier(total, isDamage) {
	if (isDamage) return 'damage';
	if (total >= 12) return 'crit';
	if (total >= 10) return 'strong';
	if (total >= 7) return 'weak';
	return 'miss';
}

// --- Stat drag-to-swap and drag-to-adjust ---
let dragStat = $state(null);
let dropTarget = $state(null);
let dragStartX = 0;
let dragStartY = 0;
let dragCurX = $state(0);
let dragCurY = $state(0);
let didStartDrag = false;
let statDragDelta = $state(0);
let statDragMode = $state(null); // 'swap' or 'adjust'

function onStatPointerDown(e, ab) {
	dragStartX = e.clientX;
	dragStartY = e.clientY;
	didStartDrag = false;
	statDragDelta = 0;
	statDragMode = null;
	const startAb = ab;

	function onMove(ev) {
		const dx = ev.clientX - dragStartX;
		const dy = ev.clientY - dragStartY;
		if (!didStartDrag && Math.abs(dx) + Math.abs(dy) > 8) {
			didStartDrag = true;
			dragStat = startAb;
			// Lock to swap or adjust based on initial direction
			statDragMode = Math.abs(dx) > Math.abs(dy) ? 'swap' : 'adjust';
		}
		if (!didStartDrag) return;
		dragCurX = ev.clientX;
		dragCurY = ev.clientY;

		if (statDragMode === 'swap') {
			const el = document.elementFromPoint(ev.clientX, ev.clientY);
			const pill = el?.closest('.stat-pill');
			if (pill) {
				const target = pill.dataset.stat;
				dropTarget = target && target !== dragStat ? target : null;
			} else {
				dropTarget = null;
			}
		} else {
			statDragDelta = Math.max(-1, Math.min(1, -Math.round(dy / 100)));
		}
	}

	function onUp() {
		window.removeEventListener('pointermove', onMove);
		window.removeEventListener('pointerup', onUp);
		window.removeEventListener('pointercancel', onUp);
		if (didStartDrag) {
			if (statDragMode === 'swap' && dropTarget && dragStat) {
				swapStats(dragStat, dropTarget);
			} else if (statDragMode === 'adjust' && statDragDelta !== 0 && dragStat) {
				adjustStat(dragStat, statDragDelta);
			}
		}
		dragStat = null;
		dropTarget = null;
		didStartDrag = false;
		statDragDelta = 0;
		statDragMode = null;
	}

	window.addEventListener('pointermove', onMove);
	window.addEventListener('pointerup', onUp);
	window.addEventListener('pointercancel', onUp);
}

function adjustStat(ab, delta) {
	pushUndo();
	const lines = text.split('\n');
	const parts = lines[2].split(',').map((s) => s.trim());
	const vals = {};
	for (const p of parts) {
		const m = p.match(/^([A-Za-z]+)\s*([+-]?\d+)$/);
		if (m) vals[m[1].toUpperCase()] = +m[2];
	}
	vals[ab] = (vals[ab] ?? 0) + delta;
	lines[2] = parts
		.map((p) => {
			const m = p.match(/^([A-Za-z]+)\s*/);
			if (m) return `${m[1]} ${vals[m[1].toUpperCase()] ?? 0}`;
			return p;
		})
		.join(', ');
	text = lines.join('\n');
}

function swapStats(a, b) {
	pushUndo();
	const lines = text.split('\n');
	const statsLine = lines[2];
	const parts = statsLine.split(',').map((s) => s.trim());
	const vals = {};
	for (const p of parts) {
		const m = p.match(/^([A-Za-z]+)\s*([+-]?\d+)$/);
		if (m) vals[m[1].toUpperCase()] = m[2];
	}
	const tmp = vals[a];
	vals[a] = vals[b];
	vals[b] = tmp;
	lines[2] = parts
		.map((p) => {
			const m = p.match(/^([A-Za-z]+)\s*/);
			if (m) return `${m[1]} ${vals[m[1].toUpperCase()] ?? 0}`;
			return p;
		})
		.join(', ');
	text = lines.join('\n');
}

// Parse damage field into rollable entries (split on semicolons)
const damageEntries = $derived.by(() => {
	if (!parsed.damage) return [];
	return parsed.damage
		.split(';')
		.map((s) => s.trim())
		.filter(Boolean);
});

const bodyHtml = $derived(renderMarkdown(parsed.body));

let charBodyEl = $state();
let editorEl = $state();
let sheetTopEl = $state();
let animatingH3 = -1;

function sizeEditor() {
	if (!editorEl || !sheetTopEl) return;
	const textarea = editorEl.querySelector('textarea');
	if (!textarea) return;
	const editorTop = editorEl.getBoundingClientRect().top + window.scrollY;
	const sheetTopH = sheetTopEl.offsetHeight;
	const gap = parseFloat(getComputedStyle(editorEl).marginBottom) || 0;
	const h = window.innerHeight - editorTop - gap - sheetTopH;
	textarea.style.height = Math.max(100, h) + 'px';
}

$effect(() => {
	if (!editorEl || !sheetTopEl) return;
	requestAnimationFrame(sizeEditor);
});

$effect(() => {
	void bodyHtml;
	if (!charBodyEl) return;
	const idx = animatingH3;
	// Apply glow instantly to all except the one being animated
	charBodyEl.querySelectorAll('h3[data-glow]').forEach((h3) => {
		const allH3s = [...charBodyEl.querySelectorAll('h3')];
		const thisIdx = allH3s.indexOf(h3);
		if (thisIdx !== idx) {
			h3.style.transition = 'none';
			h3.classList.add('glow');
			h3.offsetHeight; // force reflow
			h3.style.transition = '';
		}
	});
	// Animate only the toggled one
	if (idx >= 0) {
		requestAnimationFrame(() => {
			const h3 = charBodyEl?.querySelectorAll('h3')?.[idx];
			if (h3?.hasAttribute('data-glow')) h3.classList.add('glow');
			animatingH3 = -1;
		});
	}
});

function toggleH3Glow(h3Index) {
	const lines = text.split('\n');
	let count = 0;
	// Body starts at line 4
	for (let i = 4; i < lines.length; i++) {
		if (/^###\s/.test(lines[i])) {
			if (count === h3Index) {
				const isGlowing = /\s*###\s*$/.test(lines[i]);
				if (isGlowing) {
					// Animate out: remove class first, then update text after transition
					const h3El = charBodyEl?.querySelectorAll('h3')[h3Index];
					if (h3El) {
						h3El.classList.remove('glow');
						setTimeout(() => {
							pushUndo();
							const l = text.split('\n');
							l[i] = l[i].replace(/\s*###\s*$/, '');
							text = l.join('\n');
						}, 200);
					}
				} else {
					animatingH3 = h3Index;
					pushUndo();
					lines[i] = `${lines[i]} ###`;
					text = lines.join('\n');
				}
				return;
			}
			count++;
		}
	}
}

// --- Radial dice menu ---
let radialMenu = $state(null); // { x, y, timer, closing }
let suppressRadialClick = false;
let pointerDownPos = null;
const RADIAL_DICE = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', '2d6', '1d6+1d8'];

function onArticlePointerDown(e) {
	pointerDownPos = { x: e.clientX, y: e.clientY };
	const target = e.target;
	if (target.closest('.radial-btn')) return;
	if (target.closest('.circle, .armor-display, .circle-draggable, button, input, textarea, a, .sheet-editor, .char-tabs')) {
		suppressRadialClick = true;
		if (radialMenu && !radialMenu.closing) closeRadialMenu();
	}
}

function onArticleClick(e) {
	if (suppressRadialClick) {
		suppressRadialClick = false;
		return;
	}
	// Must be same spot as pointerdown (not a drag/scroll)
	if (pointerDownPos) {
		const dx = e.clientX - pointerDownPos.x;
		const dy = e.clientY - pointerDownPos.y;
		if (dx * dx + dy * dy > 100) return;
	}
	const target = e.target;
	if (target.closest('button, input, textarea, a, select, .circle, .armor-display, .circle-draggable, .sheet-editor, .char-tabs, .code-block, .copy-line')) return;
	if (target.closest('.char-body') && target.closest('h2, h3')) return;
	e.preventDefault();
	if (radialMenu && !radialMenu.closing) {
		closeRadialMenu();
		return;
	}
	clearRadialTimer();
	radialMenu = {
		x: e.clientX,
		y: e.clientY,
		closing: false,
		timer: setTimeout(() => closeRadialMenu(), 5000),
	};
}

function clearRadialTimer() {
	if (radialMenu?.timer) clearTimeout(radialMenu.timer);
}

function closeRadialMenu() {
	clearRadialTimer();
	if (!radialMenu) return;
	radialMenu = { ...radialMenu, closing: true, timer: null };
	setTimeout(() => {
		radialMenu = null;
	}, 200);
}

function rollRadialDie(formula, e) {
	clearRadialTimer();
	radialMenu = null;
	const isMove = formula === '2d6' || formula === '1d6+1d8';

	if (formula === '1d6+1d8') {
		const d6val = rollDie(6);
		const d8val = rollDie(8);
		const total = d6val + d8val;
		const { lx, ly } = launchDir();
		rollKey++;
		rollResult = {
			ab: 'DMG',
			mod: 0,
			total,
			mx: e.clientX,
			my: e.clientY,
			lx,
			ly,
			isDamage: false,
			formula,
			barbarian: true,
			barbLabel: `${d6val}+${d8val}`,
			barbD6Higher: d6val > d8val,
		};
		diceHistory.add({
			formula,
			breakdown: `${d6val}+${d8val}`,
			total,
			tier: rollTier(total, false),
		});
		return;
	}

	const result = parseDamageFormula(formula);
	if (result === null) return;
	const { lx, ly } = launchDir();
	rollKey++;
	rollResult = {
		ab: 'DMG',
		mod: 0,
		total: result.total,
		mx: e.clientX,
		my: e.clientY,
		lx,
		ly,
		isDamage: !isMove,
		formula,
	};
	diceHistory.add({
		formula,
		breakdown: result.rolls.join('+'),
		total: result.total,
		tier: isMove ? rollTier(result.total, false) : 'damage',
	});
}
</script>

<svelte:window onkeydown={(e) => {
	if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey && undoStack.length) {
		e.preventDefault();
		undo();
	}
}} onresize={sizeEditor} />

<svelte:head>
	<title>Character Sheet - Dungeon World</title>
</svelte:head>

{#if pendingDeleteIdx !== null}
	<div class="modal-backdrop" onclick={cancelDelete} role="presentation">
		<div class="modal" onpointerdown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
			<p>Delete <strong>{tabName(pendingDeleteIdx)}</strong>?</p>
			<div class="modal-actions">
				<button class="action-btn primary danger" onclick={confirmDelete}>Delete</button>
				<button class="action-btn" onclick={cancelDelete}>Cancel</button>
			</div>
		</div>
	</div>
{/if}

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<article class="dw-article cs-article" onclick={onArticleClick} onpointerdown={onArticlePointerDown}>
	<h1>Character Sheet</h1>

	<div class="char-tabs">
		{#each { length: characterSheet.slotCount } as _slot, i}
			<button
				class="char-tab"
				class:active={i === activeTab}
				onclick={(e) => { if (e.shiftKey) { requestDelete(i); } else { switchTab(i); } }}
				ondblclick={() => requestDelete(i)}
				onpointerdown={(e) => onTabPointerDown(e, i)}
				onpointerup={onTabPointerUp}
				onpointercancel={onTabPointerUp}
			>{tabName(i)}</button>
		{/each}
		{#if showNewButton}
			<button class="char-tab char-tab-new" onclick={addCharacter}>+ New Character</button>
		{/if}
	</div>

	<div class="sheet-editor" bind:this={editorEl}>
		<TextBox bind:value={text} {placeholders} rows={12} onkeydown={(e) => {
			if (e.key === 'ArrowRight' && !text.trim()) {
				e.preventDefault();
				text = charSheetDefault;
			}
		}} />
	</div>

	{#if parsed.name}
		<div class="sheet-preview">
			<div class="sheet-top" bind:this={sheetTopEl}>
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
							<div class="circle circle-xs circle-exp circle-draggable" onpointerdown={(e) => expDcRef?.handlePointerDown(e)}>
								<DraggableCounter bind:this={expDcRef} value={parsed.exp} oncommit={commitExpRaw} inputWidth="1.5rem" class="circle-text" style="font-size: 0.7rem">
									{#snippet children()}{parsed.exp}{/snippet}
								</DraggableCounter>
								<span class="circle-label">EXP</span>
							</div>
						{/if}
						{#if maxLoad !== null}
							{@const ldC = loadColor(carriedWeight, maxLoad)}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<div class="circle circle-sm" style="border-color: {ldC}; color: {ldC}" onclick={startEditLoad}>
								<div class="circle-fill" style="height: {loadFillPct}%; background: {ldC}"></div>
								{#if editingLoad}
									<input
										bind:this={loadInputEl}
										class="circle-input"
										type="number"
										value={maxLoad}
										onblur={(e) => commitLoad(e.target)}
										onkeydown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { editingLoad = false; } }}
									/>
								{:else}
									<span class="circle-text">{carriedWeight}/{maxLoad}</span>
								{/if}
								<span class="circle-label">Load</span>
							</div>
						{/if}
						{#if parsed.armor !== null}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<div class="armor-display" onclick={startEditArmor}>
								<svg class="armor-shield" viewBox="0 0 512 549" xmlns="http://www.w3.org/2000/svg">
									<g transform="translate(0,37)">
										<path d="M256 16L48 96v160c0 138.5 89 229.3 208 240 119-10.7 208-101.5 208-240V96L256 16z" fill="#3a6faa" stroke="#2a4f7a" stroke-width="16"/>
										<path d="M256 48L80 116v140c0 120 78 199 176 210 98-11 176-90 176-210V116L256 48z" fill="#5a8fd4"/>
									</g>
									{#if !editingArmor}
										<text x="256" y="300" text-anchor="middle" dominant-baseline="central" font-size="240" font-weight="bold" fill="#fff" font-family="sans-serif">{totalArmor}</text>
									{/if}
								</svg>
								{#if editingArmor}
									<input
										bind:this={armorInputEl}
										class="armor-input"
										type="number"
										value={totalArmor}
										onblur={(e) => commitArmor(e.target)}
										onkeydown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { editingArmor = false; } }}
									/>
								{/if}
								<span class="armor-label">Armor</span>
							</div>
						{/if}
						{#if parsed.hp !== null && maxHp !== null}
							{@const hpC = hpColor(parsed.hp, maxHp)}
							<div class="circle circle-lg circle-draggable" style="border-color: {hpC}" onpointerdown={(e) => hpDcRef?.handlePointerDown(e)}>
								<div class="circle-fill" style="height: {hpFillPct}%; background: {hpC}"></div>
								<DraggableCounter bind:this={hpDcRef} value={parsed.hp} oncommit={commitHpRaw} inputWidth="2.5rem" class="circle-text" style="color: {hpC}">
									{#snippet children()}{parsed.hp}/{maxHp}{/snippet}
								</DraggableCounter>
								<span class="circle-label" style="color: {hpC}">Health</span>
							</div>
						{/if}
						{#each damageEntries as dmgEntry}
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
							class:dragging={dragStat === ab}
							data-stat={ab}
							onclick={(e) => { if (!didStartDrag) rollStat(ab, mod, e); }}
							onpointerdown={(e) => onStatPointerDown(e, ab)}
						>
							<span class="stat-label">{ab}</span>
							<span class="stat-value">{fmtMod(mod)}</span>
						</button>
					{/each}
				</div>
			{/if}

			{#if dragStat && parsed.stats[dragStat] !== undefined}
				<div class="stat-drag-ghost" style="left: {dragCurX}px; top: {dragCurY}px">
					<span class="stat-label">{dragStat}</span>
					<span class="stat-value">{fmtMod(parsed.stats[dragStat] + (statDragMode === 'adjust' ? statDragDelta : 0))}</span>
				</div>
			{/if}
			</div>

			{#if bodyHtml}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="char-body" bind:this={charBodyEl} onclick={(e) => {
					const h2 = e.target.closest('h2');
					if (h2) {
						const h2Text = h2.textContent.trim();
						const collapsing = !h2.classList.contains('collapsed-heading');

						if (collapsing) {
							const lines = text.split('\n');
							for (let i = 4; i < lines.length; i++) {
								const m = lines[i].match(/^##\s+(.*)/);
								if (!m) continue;
								const raw = m[1].replace(/\s*::\s*$/, '').trim();
								if (raw === h2Text) {
									lines[i] = `## ${raw} ::`;
									text = lines.join('\n');
									break;
								}
							}
						} else {
							const savedScroll = window.scrollY;
							const lines = text.split('\n');
							for (let i = 4; i < lines.length; i++) {
								const m = lines[i].match(/^##\s+(.*)/);
								if (!m) continue;
								const raw = m[1].replace(/\s*::\s*$/, '').trim();
								if (raw === h2Text) {
									lines[i] = `## ${raw}`;
									text = lines.join('\n');
									break;
								}
							}
							tick().then(() => {
								window.scrollTo(0, savedScroll);
								if (!charBodyEl) return;
								const allH2s = charBodyEl.querySelectorAll('h2');
								for (const newH2 of allH2s) {
									if (newH2.textContent.trim() === h2Text) {
										const sib = newH2.nextElementSibling;
										if (sib?.classList.contains('h2-section')) {
											sib.classList.remove('collapsed');
											sib.style.maxHeight = '0';
											sib.style.overflow = 'hidden';
											sib.offsetHeight;
											sib.style.transition = 'max-height 0.3s ease';
											sib.style.maxHeight = sib.scrollHeight + 'px';
											sib.addEventListener('transitionend', () => { sib.style.maxHeight = ''; sib.style.overflow = ''; sib.style.transition = ''; }, { once: true });
										}
										break;
									}
								}
							});
						}
						return;
					}
					const h3 = e.target.closest('h3');
					if (!h3) return;
					const container = h3.closest('.char-body');
					const allH3s = [...container.querySelectorAll('h3')];
					const h3Index = allH3s.indexOf(h3);
					if (h3Index < 0) return;
					toggleH3Glow(h3Index);
				}}>
					{@html bodyHtml}
				</div>
			{/if}
		</div>
	{/if}
	{#if radialMenu}
		<div class="radial-menu" class:closing={radialMenu.closing} style="left: {radialMenu.x}px; top: {radialMenu.y}px">
			{#each RADIAL_DICE as die, i}
				{@const angle = (i / RADIAL_DICE.length) * 2 * Math.PI - Math.PI / 2}
				{@const radius = 70}
				<button
					class="radial-btn"
					style="transform: translate({Math.cos(angle) * radius}px, {Math.sin(angle) * radius}px)"
					onclick={(e) => { e.stopPropagation(); rollRadialDie(die, e); }}
				>{die}</button>
			{/each}
		</div>
	{/if}
</article>

<!-- Roll result -->
{#key rollKey}
	{#if rollResult}
		{@const tier = rollTier(rollResult.total, rollResult.isDamage)}
		<div
			class="roll-bubble roll-{tier}"
			class:roll-barb-white={rollResult.barbarian && rollResult.barbD6Higher}
			style="left: {rollResult.mx}px; top: {rollResult.my}px; --lx: {rollResult.lx}px; --ly: {rollResult.ly}px"
			onanimationend={() => { rollResult = null; }}
		>
			<span class="roll-total">{rollResult.barbarian ? rollResult.barbLabel : rollResult.total}</span>
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
	:global(.cs-article) {
		cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect x='2' y='2' width='20' height='20' rx='3' fill='%23222' stroke='%23aaa' stroke-width='1.5'/%3E%3Ccircle cx='7' cy='7' r='2' fill='%23fff'/%3E%3Ccircle cx='17' cy='7' r='2' fill='%23fff'/%3E%3Ccircle cx='7' cy='17' r='2' fill='%23fff'/%3E%3Ccircle cx='17' cy='17' r='2' fill='%23fff'/%3E%3Ccircle cx='12' cy='12' r='2' fill='%23fff'/%3E%3C/svg%3E") 12 12, pointer;
	}

	/* Full-width: remove parent padding, add margins to non-sticky elements */
	:global(.dw-content:has(> .cs-article)) {
		padding-left: 0 !important;
		padding-right: 0 !important;
	}

	:global(.cs-article) > :global(h1),
	.char-tabs,
	.sheet-editor,
	.char-body {
		margin-left: 2.5rem;
		margin-right: 2.5rem;
	}

	@media (max-width: 768px) {
		:global(.cs-article) > :global(h1),
		.char-tabs,
		.sheet-editor,
		.char-body {
			margin-left: 1rem;
			margin-right: 1rem;
		}
	}

	.char-tabs {
		display: flex;
		gap: 0.25rem;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
		padding-bottom: 0.25rem;
		margin-bottom: 0.25rem;
		position: relative;
		z-index: 2;
	}

	.char-tabs::-webkit-scrollbar {
		display: none;
	}

	.char-tab {
		flex-shrink: 0;
		padding: 0.3rem 0.75rem;
		background: #2a2a2a;
		border: 1px solid #3a3a3a;
		border-radius: 4px 4px 0 0;
		color: #999;
		font: inherit;
		font-size: 0.8rem;
		cursor: pointer;
		white-space: nowrap;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
		-webkit-user-select: none;
		user-select: none;
	}

	.char-tab:hover {
		background: #333;
		color: #ccc;
	}

	.char-tab.active {
		background: transparent;
		border-color: #555;
		border-bottom-color: transparent;
		color: #fff;
	}

	.char-tab-new {
		color: #666;
		border-style: dashed;
	}

	.char-tab-new:hover {
		color: #aabbff;
		border-color: #aabbff;
	}

	.sheet-editor, .char-tabs {
		cursor: auto;
	}

	.sheet-editor {
		margin-top: -8px;
		margin-bottom: 1.5rem;
		border-radius: 6px;
	}
	.sheet-editor :global(textarea) {
		height: 200px;
	}

	.sheet-top {
		position: sticky;
		top: 0;
		z-index: 9;

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

	.circle-draggable {
		cursor: ns-resize;
		touch-action: none;
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
		cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect x='2' y='2' width='20' height='20' rx='3' fill='%23222' stroke='%23aaa' stroke-width='1.5'/%3E%3Ccircle cx='7' cy='7' r='2' fill='%23fff'/%3E%3Ccircle cx='17' cy='7' r='2' fill='%23fff'/%3E%3Ccircle cx='7' cy='17' r='2' fill='%23fff'/%3E%3Ccircle cx='17' cy='17' r='2' fill='%23fff'/%3E%3Ccircle cx='12' cy='12' r='2' fill='%23fff'/%3E%3C/svg%3E") 12 12, pointer;
		transition: background 0.15s, border-color 0.15s;
		touch-action: none;
		-webkit-user-select: none;
		user-select: none;
	}

	.stat-pill.dragging {
		opacity: 0;
	}

	.stat-drag-ghost {
		position: fixed;
		transform: translate(-50%, -50%);
		display: flex;
		align-items: baseline;
		gap: 0.3rem;
		background: #2a2a2a;
		border: 1px solid #aabbff;
		border-radius: 999px;
		padding: 0.2rem 0.6rem;
		font-size: 0.88rem;
		white-space: nowrap;
		color: #ddd;
		pointer-events: none;
		z-index: 1000;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
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
		white-space: normal;
		word-wrap: break-word;
	}

	.char-body :global(p),
	.char-body :global(li) {
		width: fit-content;
		max-width: 100%;
		cursor: text;
	}

	.char-body :global(td),
	.char-body :global(th),
	.char-body :global(blockquote) {
		cursor: text;
	}

	.char-body :global(h1) {
		position: static;
		background: transparent;
		border-bottom: none;
	}

	.char-body :global(h2) {
		margin-top: 1.5rem;
		cursor: pointer;
		user-select: none;
		-webkit-user-select: none;

	}

	.char-body :global(h2:first-child) {
		margin-top: 0;
	}

	.char-body :global(.h2-section) {
		overflow: hidden;
	}

	.char-body :global(.h2-section.collapsed) {
		display: none;
	}

	.char-body :global(h2.collapsed-heading) {
		text-decoration: none;
		margin-bottom: 0;
		font-size: 0.85em;
		border: 1px solid rgba(255, 255, 255, 0.25);
		border-radius: 999px;
		padding: 0.15em 0.7em;
		background: transparent;
		cursor: pointer;
	}

	.char-body :global(h2.collapsed-inline) {
		display: inline-block;
		margin: 0.25rem 0.35rem 0.25rem 0;
	}

	.char-body :global(h3) {
		margin-top: 0;
		cursor: pointer;
		transition: box-shadow 0.2s, border-color 0.2s;

	}

	.char-body :global(h3.glow) {
		border-color: #d4a847;
		box-shadow: 0 0 12px #d4a847aa, inset 0 0 8px #d4a84733;
	}

	.char-body :global(.move-block + .move-block) {
		margin-top: 1rem;
	}

	.char-body :global(.h2-columns) {
		columns: 2;
		column-gap: 2rem;
	}

	@media (max-width: 1028px) {
		.char-body :global(.h2-columns) {
			columns: 1;
		}
	}

	.char-body :global(.move-block) { break-inside: avoid; }

	.char-body :global(.code-block) {
		background: #1a1a1a;
		border: 1px solid #333;
		border-radius: 4px;
		padding: 0.75rem 1rem;
		font-size: 0.85rem;
		white-space: pre-wrap;
		cursor: pointer;
		user-select: none;
		-webkit-user-select: none;

		transition: border-color 0.15s, color 0.15s;
	}

	.char-body :global(.code-block.copied) {
		border-color: #8f8;
		color: #8f8;
	}

	/* --- Radial dice menu --- */
	.radial-menu {
		position: fixed;
		z-index: 100;
		pointer-events: none;
	}

	.radial-btn {
		position: absolute;
		pointer-events: auto;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: 2px solid #d4a847;
		background: #1a1a1a;
		color: #d4a847;
		font: bold 0.65rem/1 inherit;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		margin-left: -22px;
		margin-top: -22px;
		transition: background 0.15s, color 0.15s;
		animation: radial-pop 0.2s ease-out both;
	}

	.closing .radial-btn {
		animation: radial-pop-out 0.2s ease-in both;
	}

	.radial-btn:hover {
		background: #d4a847;
		color: #1a1a1a;
	}

	@keyframes radial-pop {
		from { scale: 0; opacity: 0; }
		to   { scale: 1; opacity: 1; }
	}

	@keyframes radial-pop-out {
		from { scale: 1; opacity: 1; }
		to   { scale: 0; opacity: 0; }
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

	.roll-crit {
		border-color: #c4f;
		color: #c4f;
	}

	.roll-damage {
		border-color: #333;
		color: #fff;
	}

	.roll-bubble.roll-barb-white {
		background: #ffffffee;
	}

	@media (max-width: 768px) {
		.sheet-top {
			top: 0;
		}

		.sheet-header {
			flex-wrap: wrap;
			padding: 0 1rem 0.4rem 4rem;
			gap: 0.25rem 0.5rem;
		}

		.header-info {
			display: flex;
			align-items: baseline;
			gap: 0.4rem;
			flex-wrap: nowrap;
			overflow: hidden;
			width: 100%;
			min-height: 2.5rem;
			padding-top: 0.4rem;
		}

		.char-name {
			font-size: 1rem;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			flex-shrink: 1;
			min-width: 0;
		}

		.char-subtitle {
			margin: 0;
			margin-left: auto;
			font-size: 0.8rem;
			white-space: nowrap;
			flex-shrink: 0;
		}

		.header-circles {
			width: 100%;
			justify-content: center;
		}

		.circle-xs {
			width: 44px;
			height: 44px;
		}
	}

	/* Delete modal */
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

	.action-btn.primary.danger {
		background: #c0392b;
		border-color: #c0392b;
	}

	.action-btn.primary.danger:hover { background: #d44438; }

	:global(.char-body .coin-icon) {
		display: inline-block;
		width: 24px;
		height: 24px;
		vertical-align: middle;
	}

	:global(.char-body .weight-icon) {
		display: inline-block;
		width: 22px;
		height: 22px;
		vertical-align: middle;
		color: #444;
		transform: translateY(-2px);
	}

	:global(.char-body .armor-icon) {
		display: inline-block;
		width: 22px;
		height: 22px;
		vertical-align: middle;
		transform: translateY(2px);
	}

	.armor-display {
		display: flex;
		flex-direction: column;
		align-items: center;
		cursor: pointer;
		position: relative;
	}

	.armor-shield {
		width: 55px;
		height: 55px;
	}

	.armor-label {
		font-size: 0.5rem;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		opacity: 0.7;
		color: #5a8fd4;
		margin-top: 2px;
	}

	.armor-input {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -60%);
		width: 2rem;
		text-align: center;
		background: transparent;
		border: none;
		color: #fff;
		font-size: 0.9rem;
		font-weight: bold;
		font-family: inherit;
		outline: none;
	}

	.circle-input {
		width: 2.5rem;
		text-align: center;
		background: transparent;
		border: none;
		color: inherit;
		font-size: 0.75rem;
		font-weight: bold;
		font-family: inherit;
		outline: none;
		position: relative;
		z-index: 1;
	}

	/* Hide number input spinners */
	.armor-input::-webkit-inner-spin-button,
	.armor-input::-webkit-outer-spin-button,
	.circle-input::-webkit-inner-spin-button,
	.circle-input::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	.armor-input, .circle-input {
		-moz-appearance: textfield;
		appearance: textfield;
	}
</style>

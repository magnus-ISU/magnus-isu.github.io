<script>
import { onMount } from 'svelte';
import { replaceState } from '$app/navigation';
import { LATEST_VERSION } from './lib/configLoader.js';
import UnitPicker from './lib/components/UnitPicker.svelte';
import SoldierUnitAsRender from './lib/components/SoldierUnitAsRender.svelte';
import CardWithShadow from './lib/components/CardWithShadow.svelte';
import { simulateAndScore, findBestOrder } from './lib/optimize.js';
import { decodeTeam, encodeStateToParams } from './lib/urlState.js';

const PERM_CHEAP_THRESHOLD = 7;
let mounted = $state(false);

let { data } = $props();
const versionConfigs = $derived(data.versionConfigs);
let currentVersion = $state(LATEST_VERSION);
const versionConfig = $derived(versionConfigs[currentVersion] ?? versionConfigs[Object.keys(versionConfigs).sort().pop()]);

let attackers = $state([]);
let defenders = $state([]);

let dragContext = $state(null);
let hoverTarget = $state(null);
let isSwappingColumns = $state(null);
let dragPreview = $state(null);
let armed = $state(null);
let gesture = null;
const LONG_PRESS_MS = 350;
const MOVE_THRESHOLD = 8;

function getUnitConfig(typeUnit) {
	const unit = versionConfig.unitStats.find((u) => u.name === typeUnit);
	if (!unit) throw new Error('Unit type not found: ' + typeUnit);
	return unit;
}

function makeUnit(typeUnit, team, id) {
	const config = getUnitConfig(typeUnit);
	return {
		id,
		config,
		typeUnit,
		team,
		healthMax: config.maxHealth,
		healthBefore: config.maxHealth,
		healthAfter: config.maxHealth,
		veteran: false,
		defenceBonus: false,
		wallBonus: false,
		safeBonus: team === 'Attackers' && config.skills.includes('surprise'),
		poisonedBonus: false,
		becamePoisonedBonus: false,
		boostedBonus: false,
		shipUnit: config.skills.includes('variableHp'),
		splashDamage: false,
		explodeDamage: false,
	};
}

function handleAddAttacker(typeUnit) {
	try {
		attackers = [...attackers, makeUnit(typeUnit, 'Attackers', attackers.length)];
	} catch {
		alert('Error: failed to add attacker.');
	}
}

function handleAddDefender(typeUnit) {
	try {
		defenders = [...defenders, makeUnit(typeUnit, 'Defenders', defenders.length)];
	} catch {
		alert('Error: failed to add defender.');
	}
}

function handleVersionChange(e) {
	attackers = [];
	defenders = [];
	currentVersion = e.target.value;
}

function setList(team, updater) {
	if (team === 'Attackers') attackers = updater(attackers);
	else defenders = updater(defenders);
}

function handleUpdateHitpoints(id, team, value) {
	const numeric = parseFloat(String(value)) || 0;
	setList(team, (list) => list.map((u) => (u.id === id ? { ...u, healthBefore: numeric } : u)));
}

function handleIncreaseHitpoints(id, team) {
	setList(team, (list) => list.map((u) => (u.id === id ? { ...u, healthBefore: u.healthBefore + 1 } : u)));
}

function handleDecreaseHitpoints(id, team) {
	setList(team, (list) => list.map((u) => (u.id === id ? { ...u, healthBefore: u.healthBefore - 1 } : u)));
}

function handleDelete(id, team) {
	setList(team, (list) => list.filter((u) => u.id !== id).map((u, i) => ({ ...u, id: i })));
}

function toggleBonus(id, team, which) {
	if (team === 'Defenders') {
		const isOldPoison = versionConfig?.poisonScheme === 'OLD';
		defenders = defenders.map((u) => {
			if (u.id !== id) return u;
			const updated = { ...u, [which]: !u[which] };
			if (which === 'defenceBonus' && updated.defenceBonus) {
				updated.wallBonus = false;
				if (isOldPoison) updated.poisonedBonus = false;
			}
			if (which === 'wallBonus' && updated.wallBonus) {
				updated.defenceBonus = false;
				if (isOldPoison) updated.poisonedBonus = false;
			}
			if (which === 'poisonedBonus' && updated.poisonedBonus && isOldPoison) {
				updated.wallBonus = false;
				updated.defenceBonus = false;
			}
			return updated;
		});
	} else {
		attackers = attackers.map((u) => (u.id === id ? { ...u, [which]: !u[which] } : u));
	}
}

const handleDefenceBonus = (id, team) => toggleBonus(id, team, 'defenceBonus');
const handleWallBonus = (id, team) => toggleBonus(id, team, 'wallBonus');
const handlePoisonedBonus = (id, team) => toggleBonus(id, team, 'poisonedBonus');
const handleSafeBonus = (id, team) => toggleBonus(id, team, 'safeBonus');
const handleBoostedBonus = (id, team) => toggleBonus(id, team, 'boostedBonus');
const handleSplashDamage = (id, team) => toggleBonus(id, team, 'splashDamage');
const handleExplodeDamage = (id, team) => toggleBonus(id, team, 'explodeDamage');

function handleVeteranBonus(id, team) {
	setList(team, (list) =>
		list.map((u) => {
			if (u.id !== id) return u;
			const wasVet = u.veteran;
			const newMax = wasVet ? u.config.maxHealth : u.config.maxHealth + 5;
			return { ...u, veteran: !wasVet, healthMax: newMax, healthBefore: newMax };
		})
	);
}

function handleShipUnit(id, team) {
	setList(team, (list) =>
		list.map((u) => {
			if (u.id !== id) return u;
			const maxHealth = u.healthMax + 5 > 35 ? 10 : u.healthMax + 5;
			return { ...u, healthMax: maxHealth, healthBefore: maxHealth };
		})
	);
}

function moveWithin(list, fromIdx, toIdx) {
	const next = [...list];
	const [moved] = next.splice(fromIdx, 1);
	const safeIdx = Math.min(toIdx, next.length);
	next.splice(safeIdx, 0, moved);
	return next.map((u, i) => ({ ...u, id: i }));
}

function applyDrop(sourceTeam, sourceIndex, targetTeam, targetIndex) {
	if (sourceTeam === targetTeam) {
		if (targetTeam === 'Attackers') attackers = moveWithin(attackers, sourceIndex, targetIndex);
		else defenders = moveWithin(defenders, sourceIndex, targetIndex);
		return;
	}
	isSwappingColumns = targetTeam === 'Attackers' ? 'toAttackers' : 'toDefenders';
	const oldA = attackers;
	const oldD = defenders;
	setTimeout(() => {
		attackers = oldD.map((u, i) => ({ ...u, id: i, team: 'Attackers' }));
		defenders = oldA.map((u, i) => ({ ...u, id: i, team: 'Defenders' }));
		setTimeout(() => (isSwappingColumns = null), 180);
	}, 80);
}

function findDropTargetAt(x, y) {
	const el = document.elementFromPoint(x, y);
	const target = el?.closest?.('[data-droptarget]');
	if (!target) return null;
	const team = target.dataset.team;
	const indexAttr = target.dataset.index;
	const length = team === 'Attackers' ? attackers.length : defenders.length;
	const index = indexAttr === 'end' ? length : parseInt(indexAttr, 10);
	return { team, index };
}

function isInteractive(el) {
	return el && !!el.closest?.('button, input, select, textarea, label, a, [contenteditable="true"]');
}

function beginPickup(card, pointerId, team, index, rect, startX, startY, clientX, clientY) {
	dragContext = { team, index };
	hoverTarget = { team, index };
	dragPreview = {
		team,
		index,
		clientX,
		clientY,
		clickOffsetX: startX - rect.left,
		clickOffsetY: startY - rect.top,
		width: rect.width,
		height: rect.height,
	};
	try {
		card?.setPointerCapture?.(pointerId);
	} catch {}
}

function clearGesture() {
	if (gesture?.timer) clearTimeout(gesture.timer);
	gesture = null;
}

function endDragState() {
	dragContext = null;
	hoverTarget = null;
	dragPreview = null;
}

function handlePointerDown(e, team, index) {
	if (e.button !== undefined && e.button !== 0) return;
	const onInteractive = isInteractive(e.target);

	// Armed state: a previous long-press is waiting. This tap completes the move (or cancels).
	if (armed) {
		const src = armed;
		armed = null;
		if (src.team === team && src.index === index) return; // tap on same card cancels
		if (onInteractive) return; // let the child handle its click; just cancel armed
		applyDrop(src.team, src.index, team, index);
		return;
	}

	if (onInteractive) return;

	const card = e.currentTarget;
	const rect = card.getBoundingClientRect();
	const pointerId = e.pointerId;
	const pointerType = e.pointerType;
	const startX = e.clientX;
	const startY = e.clientY;
	clearGesture();
	const g = {
		team,
		index,
		rect,
		startX,
		startY,
		pointerId,
		pointerType,
		card,
		moved: false,
		timer: null,
	};
	g.timer = setTimeout(() => {
		if (gesture !== g) return;
		beginPickup(card, pointerId, team, index, rect, startX, startY, startX, startY);
	}, LONG_PRESS_MS);
	gesture = g;
}

function handlePointerMove(e) {
	if (!gesture || gesture.pointerId !== e.pointerId) return;
	const dx = e.clientX - gesture.startX;
	const dy = e.clientY - gesture.startY;
	const dist = Math.hypot(dx, dy);

	if (!dragContext) {
		if (dist > MOVE_THRESHOLD) {
			if (gesture.pointerType === 'mouse' || gesture.pointerType === 'pen') {
				clearTimeout(gesture.timer);
				gesture.timer = null;
				beginPickup(
					gesture.card,
					gesture.pointerId,
					gesture.team,
					gesture.index,
					gesture.rect,
					gesture.startX,
					gesture.startY,
					e.clientX,
					e.clientY,
				);
				gesture.moved = true;
			} else {
				// touch with movement = scroll; abandon
				clearGesture();
			}
		}
		return;
	}

	// In drag state — update preview and hover target
	gesture.moved = gesture.moved || dist > MOVE_THRESHOLD;
	dragPreview = { ...dragPreview, clientX: e.clientX, clientY: e.clientY };
	hoverTarget = findDropTargetAt(e.clientX, e.clientY);
	if (e.cancelable) e.preventDefault();
}

function handlePointerUp(e) {
	if (!gesture || gesture.pointerId !== e.pointerId) {
		// stray pointerup (e.g., after a pointer was captured elsewhere)
		return;
	}
	const wasPickedUp = !!dragContext;
	const moved = gesture.moved;
	const lastX = e.clientX;
	const lastY = e.clientY;
	clearGesture();

	if (!wasPickedUp) {
		// Just a tap/click — let child handlers do their thing.
		return;
	}

	if (moved) {
		const target = findDropTargetAt(lastX, lastY) ?? hoverTarget;
		if (target && dragContext) {
			applyDrop(dragContext.team, dragContext.index, target.team, target.index);
		}
		endDragState();
	} else {
		// Long-press release without drag → enter armed mode
		armed = dragContext;
		endDragState();
	}
}

function handlePointerCancel(e) {
	if (gesture && gesture.pointerId === e.pointerId) clearGesture();
	endDragState();
}

function handleBackgroundPointerDown(e) {
	if (!armed) return;
	const target = e.target.closest?.('[data-droptarget]');
	if (!target) {
		armed = null;
		return;
	}
	// End-zone targets have no card-level pointerdown handler — finish the drop here.
	if (target.dataset.index === 'end') {
		const team = target.dataset.team;
		const length = team === 'Attackers' ? attackers.length : defenders.length;
		const src = armed;
		armed = null;
		applyDrop(src.team, src.index, team, length);
	}
	// Real cards have their own onpointerdown that already processed `armed`.
}

const computed = $derived(simulateAndScore(attackers, defenders, versionConfig));
const attackersAsRender = $derived(computed.attList);
const defendersAsRender = $derived(computed.defList);

const canCheckOptimal = $derived(attackers.length >= 2 && attackers.length <= PERM_CHEAP_THRESHOLD);
const bestForCurrent = $derived(canCheckOptimal ? findBestOrder(attackers, defenders, versionConfig) : null);
const showOptimizeButton = $derived(!!bestForCurrent && bestForCurrent.score > computed.score);

function handleOptimizeOrder() {
	if (!bestForCurrent) return;
	attackers = bestForCurrent.perm.map((u, i) => ({ ...u, id: i }));
}

function tryGetUnitConfig(version, type) {
	const cfg = versionConfigs[version];
	if (!cfg) return null;
	const unit = cfg.unitStats.find((u) => u.name === type);
	return unit ?? null;
}

onMount(() => {
	const params = new URLSearchParams(window.location.search);
	const v = params.get('v');
	if (v && versionConfigs[v]) currentVersion = v;
	const cfg = versionConfigs[currentVersion];
	const getCfg = (type) => {
		const u = cfg.unitStats.find((x) => x.name === type);
		if (!u) throw new Error('unknown unit ' + type);
		return u;
	};
	const a = params.get('a');
	const d = params.get('d');
	if (a) attackers = decodeTeam(a, 'Attackers', getCfg);
	if (d) defenders = decodeTeam(d, 'Defenders', getCfg);
	mounted = true;
});

$effect(() => {
	if (!mounted) return;
	const params = encodeStateToParams(attackers, defenders, currentVersion);
	const search = params.toString();
	const newUrl = window.location.pathname + (search ? '?' + search : '');
	if (newUrl !== window.location.pathname + window.location.search) {
		replaceState(newUrl, {});
	}
});

</script>

<svelte:head>
	<title>Polytopia Damage Calculator</title>
</svelte:head>

<svelte:window onpointerdown={handleBackgroundPointerDown} />

<div class="page">
	<div class="pickers">
		<UnitPicker
			team="Attackers"
			onAdd={handleAddAttacker}
			onOptimize={showOptimizeButton ? handleOptimizeOrder : null}
		/>
		<UnitPicker team="Defenders" onAdd={handleAddDefender} />
	</div>

	<div class="battle">
		<div class="column {isSwappingColumns === 'toDefenders' ? 'swap-out-left' : ''}">
			{#each attackersAsRender as unit, idx (`attacker-${unit.id}-${unit.typeUnit}`)}
				<CardWithShadow
					data-droptarget=""
					data-team="Attackers"
					data-index={idx}
					onpointerdown={(e) => handlePointerDown(e, 'Attackers', idx)}
					onpointermove={handlePointerMove}
					onpointerup={handlePointerUp}
					onpointercancel={handlePointerCancel}
					class={`dnd-card ${
						dragContext && hoverTarget?.team === 'Attackers' && hoverTarget?.index === idx
							? 'dnd-drop-target'
							: ''
					} ${
						dragContext?.team === 'Attackers' && dragContext?.index === idx
							? 'being-dragged'
							: ''
					} ${
						armed?.team === 'Attackers' && armed?.index === idx ? 'armed' : ''
					}`}
				>
					<SoldierUnitAsRender
						{unit}
						{versionConfig}
						onDelete={handleDelete}
						onUpdateHitpoints={handleUpdateHitpoints}
						onIncreaseHitpoints={handleIncreaseHitpoints}
						onDecreaseHitpoints={handleDecreaseHitpoints}
						onVeteranBonus={handleVeteranBonus}
						onDefenceBonus={handleDefenceBonus}
						onWallBonus={handleWallBonus}
						onSafeBonus={handleSafeBonus}
						onPoisonedBonus={handlePoisonedBonus}
						onBoostedBonus={handleBoostedBonus}
						onShipUnit={handleShipUnit}
						onSplashDamage={handleSplashDamage}
						onExplodeDamage={handleExplodeDamage}
					/>
				</CardWithShadow>
			{/each}
			<CardWithShadow
				style="padding:4px; min-height:24px; opacity:0.4;"
				data-droptarget=""
				data-team="Attackers"
				data-index="end"
			>
				<span></span>
			</CardWithShadow>
		</div>

		<div class="column {isSwappingColumns === 'toAttackers' ? 'swap-out-right' : ''}">
			{#each defendersAsRender as unit, idx (`defender-${unit.id}-${unit.typeUnit}`)}
				<CardWithShadow
					data-droptarget=""
					data-team="Defenders"
					data-index={idx}
					onpointerdown={(e) => handlePointerDown(e, 'Defenders', idx)}
					onpointermove={handlePointerMove}
					onpointerup={handlePointerUp}
					onpointercancel={handlePointerCancel}
					class={`dnd-card ${
						dragContext && hoverTarget?.team === 'Defenders' && hoverTarget?.index === idx
							? 'dnd-drop-target'
							: ''
					} ${
						dragContext?.team === 'Defenders' && dragContext?.index === idx
							? 'being-dragged'
							: ''
					} ${
						armed?.team === 'Defenders' && armed?.index === idx ? 'armed' : ''
					}`}
				>
					<SoldierUnitAsRender
						{unit}
						{versionConfig}
						onDelete={handleDelete}
						onUpdateHitpoints={handleUpdateHitpoints}
						onIncreaseHitpoints={handleIncreaseHitpoints}
						onDecreaseHitpoints={handleDecreaseHitpoints}
						onVeteranBonus={handleVeteranBonus}
						onDefenceBonus={handleDefenceBonus}
						onWallBonus={handleWallBonus}
						onSafeBonus={handleSafeBonus}
						onPoisonedBonus={handlePoisonedBonus}
						onBoostedBonus={handleBoostedBonus}
						onShipUnit={handleShipUnit}
						onSplashDamage={handleSplashDamage}
						onExplodeDamage={handleExplodeDamage}
					/>
				</CardWithShadow>
			{/each}
			<CardWithShadow
				style="padding:4px; min-height:24px; opacity:0.4;"
				data-droptarget=""
				data-team="Defenders"
				data-index="end"
			>
				<span></span>
			</CardWithShadow>
		</div>
	</div>

	{#if dragPreview}
		{@const previewUnit = dragPreview.team === 'Attackers' ? attackersAsRender[dragPreview.index] : defendersAsRender[dragPreview.index]}
		{#if previewUnit}
			<div
				class="drag-preview"
				style={`left:${dragPreview.clientX - dragPreview.clickOffsetX}px; top:${dragPreview.clientY - dragPreview.clickOffsetY}px; width:${dragPreview.width}px; height:${dragPreview.height}px;`}
			>
				<CardWithShadow style={`width:${dragPreview.width}px; height:${dragPreview.height}px;`}>
					<SoldierUnitAsRender
						unit={previewUnit}
						{versionConfig}
						onDelete={() => {}}
						onUpdateHitpoints={() => {}}
						onIncreaseHitpoints={() => {}}
						onDecreaseHitpoints={() => {}}
						onVeteranBonus={() => {}}
						onDefenceBonus={() => {}}
						onWallBonus={() => {}}
						onSafeBonus={() => {}}
						onPoisonedBonus={() => {}}
						onBoostedBonus={() => {}}
						onShipUnit={() => {}}
						onSplashDamage={() => {}}
						onExplodeDamage={() => {}}
					/>
				</CardWithShadow>
			</div>
		{/if}
	{/if}

	{#if versionConfig}
		<CardWithShadow style="padding:3px 2%; width:100%;">
			<div class="version-info">
				<label>
					Game version
					<select value={currentVersion} onchange={handleVersionChange}>
						{#each Object.entries(versionConfigs).sort(([a], [b]) => b.localeCompare(a)) as [v, c]}
							<option value={v}>{v} - {c.title}</option>
						{/each}
					</select>
				</label>
				<span>Build version: {versionConfig.buildVersion}</span>
			</div>
		</CardWithShadow>
	{/if}
</div>

<style>
.page {
	max-width: 900px;
	margin: 0 auto;
	display: flex;
	flex-direction: column;
	padding: 1%;
	gap: 1%;
	font-family: 'Josefin Sans', Arial, sans-serif;
	color: #e8e8e8;
}
.pickers {
	display: flex;
	justify-content: space-between;
	flex-flow: wrap;
	gap: 1%;
}
.battle {
	display: flex;
	justify-content: space-between;
	flex-flow: wrap;
	gap: 1%;
}
.column {
	display: block;
	max-width: 425px;
	width: 48%;
	min-width: 280px;
	transition: transform 200ms ease, opacity 200ms ease;
}
.column.swap-out-left {
	transform: translateX(-12px);
	opacity: 0.85;
}
.column.swap-out-right {
	transform: translateX(12px);
	opacity: 0.85;
}
.version-info {
	display: flex;
	flex-direction: column;
	gap: 4px;
	font-size: 0.85rem;
	color: #bbb;
}
.version-info select {
	margin-left: 6px;
	background: #1e1e1e;
	color: #e8e8e8;
	border: 1px solid #4a4a4a;
	border-radius: 3px;
	padding: 2px 6px;
}
.drag-preview {
	position: fixed;
	pointer-events: none;
	z-index: 9999;
}
:global(.dnd-card) {
	transition: transform 180ms ease, box-shadow 180ms ease, outline-color 120ms ease;
	touch-action: none;
	user-select: none;
	-webkit-user-select: none;
	-webkit-touch-callout: none;
}
:global(.dnd-card.dnd-drop-target) {
	outline: 2px solid #4488ff;
	outline-offset: -2px;
}
:global(.dnd-card.being-dragged) {
	opacity: 0;
}
:global(.dnd-card.armed) {
	outline: 2px dashed #ffb74d;
	outline-offset: -2px;
	animation: armed-pulse 1.2s ease-in-out infinite;
}
@keyframes armed-pulse {
	0%, 100% { box-shadow: 0 0 0 0 rgba(255, 183, 77, 0.0); }
	50%      { box-shadow: 0 0 0 6px rgba(255, 183, 77, 0.25); }
}
:global(input[type='text']::-webkit-outer-spin-button),
:global(input[type='text']::-webkit-inner-spin-button) {
	-webkit-appearance: none;
	margin: 0;
}
</style>

<script>
import { LATEST_VERSION } from './lib/configLoader.js';
import UnitPicker from './lib/components/UnitPicker.svelte';
import SoldierUnitAsRender from './lib/components/SoldierUnitAsRender.svelte';
import CardWithShadow from './lib/components/CardWithShadow.svelte';
import {
	calculateAttackForce,
	calculateAttackResult,
	calculateAttackSplash,
	calculateDefenceForce,
	calculateDefenseResult,
	calculateTotalDamage,
} from './lib/damageFormulae.js';

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

// Drag and drop
function handleDragStart(e, team, index) {
	dragContext = { team, index };
	e.dataTransfer.effectAllowed = 'move';
	const target = e.currentTarget;
	target.classList.add('dragging');
	const rect = target.getBoundingClientRect();
	const clickOffsetX = e.clientX - rect.left;
	const clickOffsetY = e.clientY - rect.top;
	const ghost = document.createElement('div');
	ghost.style.width = `${rect.width}px`;
	ghost.style.height = `${rect.height}px`;
	ghost.style.opacity = '0';
	document.body.appendChild(ghost);
	e.dataTransfer.setDragImage(ghost, clickOffsetX, clickOffsetY);
	setTimeout(() => document.body.removeChild(ghost), 0);
	dragPreview = {
		team,
		index,
		clientX: e.clientX,
		clientY: e.clientY,
		clickOffsetX,
		clickOffsetY,
		width: rect.width,
		height: rect.height,
	};
}

function handleDrag(e) {
	if (!dragContext || !dragPreview) return;
	dragPreview = { ...dragPreview, clientX: e.clientX, clientY: e.clientY };
}

function handleDragOver(e) {
	e.preventDefault();
	e.dataTransfer.dropEffect = 'move';
	if (dragContext && dragPreview) {
		dragPreview = { ...dragPreview, clientX: e.clientX, clientY: e.clientY };
	}
}

function handleDragEnd(e) {
	e.currentTarget.classList.remove('dragging');
	isSwappingColumns = null;
	hoverTarget = null;
	dragPreview = null;
	dragContext = null;
}

function moveWithin(list, fromIdx, toIdx) {
	const next = [...list];
	const [moved] = next.splice(fromIdx, 1);
	next.splice(toIdx, 0, moved);
	return next.map((u, i) => ({ ...u, id: i }));
}

function handleDrop(e, targetTeam, targetIndex) {
	e.preventDefault();
	if (!dragContext) return;
	const { team: sourceTeam, index: sourceIndex } = dragContext;
	dragContext = null;
	hoverTarget = null;
	dragPreview = null;

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

function healthAfterCalculation(att, def, cfg) {
	const attList = att.map((u) => ({ ...u, healthAfter: u.healthBefore }));
	const defList = def.map((u) => ({ ...u, healthAfter: u.healthBefore, becamePoisonedBonus: u.becamePoisonedBonus }));

	let idxDefPos = 0;
	let totalAttackResult = 0;
	let defenderRepeatedAttack = 0;

	attList.forEach((attacker) => {
		const defender = defList[idxDefPos];
		if (!defender) return;

		if (defenderRepeatedAttack === 0) {
			defender.becamePoisonedBonus = false;
		}
		defenderRepeatedAttack++;

		const attackerAttack = attacker.config.attack + (attacker.boostedBonus ? 0.5 : 0);
		const attackForce = calculateAttackForce(attackerAttack, attacker.healthBefore, attacker.healthMax);

		let defenderDefenseBonus = defender.wallBonus ? 4 : defender.defenceBonus ? 1.5 : 1;
		if (defender.poisonedBonus || defender.becamePoisonedBonus) {
			if (cfg?.poisonScheme === 'OLD') {
				defenderDefenseBonus = 0.7;
			} else {
				defenderDefenseBonus = defenderDefenseBonus * 0.5;
			}
		}

		const defenseForce = calculateDefenceForce(
			defender.config.defence,
			defender.healthAfter,
			defender.healthMax,
			defenderDefenseBonus
		);
		const totalDamage = calculateTotalDamage(attackForce, defenseForce);

		let attackResult = 0;
		const isSplash =
			attacker.explodeDamage ||
			attacker.typeUnit === 'Segment' ||
			(attacker.splashDamage &&
				(attacker.config.skills.includes('splash') || attacker.config.skills.includes('stomp')));
		if (isSplash) {
			attackResult = calculateAttackSplash(attackForce, totalDamage, attackerAttack);
			if (cfg?.splashScheme === 'FLOOR') {
				attackResult = Math.floor(attackResult);
			}
		} else {
			attackResult = calculateAttackResult(attackForce, totalDamage, attackerAttack);
		}

		totalAttackResult += attackResult;
		defender.healthAfter = defender.healthBefore - totalAttackResult;

		if (defender.healthAfter > 0) {
			const defenceResult = calculateDefenseResult(defenseForce, totalDamage, defender.config.defence);

			if (
				attacker.config.skills.includes('poison') ||
				attacker.typeUnit === 'Segment' ||
				attacker.explodeDamage
			) {
				defender.becamePoisonedBonus = true;
			}

			if (
				!attacker.config.skills.includes('surprise') &&
				!defender.config.skills.includes('stiff') &&
				!attacker.safeBonus
			) {
				attacker.healthAfter = attacker.healthBefore - defenceResult;
			} else if (attacker.explodeDamage || attacker.typeUnit === 'Segment') {
				attacker.healthAfter = 0;
			}
		} else {
			idxDefPos++;
			totalAttackResult = 0;
			defenderRepeatedAttack = 0;
		}
	});

	return { attList, defList };
}

const computed = $derived(healthAfterCalculation(attackers, defenders, versionConfig));
const attackersAsRender = $derived(computed.attList);
const defendersAsRender = $derived(computed.defList);
</script>

<svelte:head>
	<title>Polytopia Damage Calculator</title>
</svelte:head>

<div class="page">
	<h1>Polytopia Damage Calculator</h1>

	<div class="pickers">
		<UnitPicker team="Attackers" onAdd={handleAddAttacker} />
		<UnitPicker team="Defenders" onAdd={handleAddDefender} />
	</div>

	<div class="battle">
		<div class="column {isSwappingColumns === 'toDefenders' ? 'swap-out-left' : ''}">
			{#each attackersAsRender as unit, idx (`attacker-${unit.id}-${unit.typeUnit}`)}
				<CardWithShadow
					draggable={true}
					ondragstart={(e) => handleDragStart(e, 'Attackers', idx)}
					ondrag={handleDrag}
					ondragover={(e) => {
						handleDragOver(e);
						hoverTarget = { team: 'Attackers', index: idx };
					}}
					ondrop={(e) => handleDrop(e, 'Attackers', idx)}
					ondragend={handleDragEnd}
					class={`dnd-card ${
						hoverTarget && hoverTarget.team === 'Attackers' && hoverTarget.index === idx
							? 'dnd-drop-target'
							: ''
					} ${
						dragContext && dragContext.team === 'Attackers' && dragContext.index === idx
							? 'being-dragged'
							: ''
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
				style="padding:4px; min-height:8px; opacity:0.2;"
				ondragover={handleDragOver}
				ondrop={(e) => handleDrop(e, 'Attackers', attackers.length)}
			>
				<span></span>
			</CardWithShadow>
		</div>

		<div class="column {isSwappingColumns === 'toAttackers' ? 'swap-out-right' : ''}">
			{#each defendersAsRender as unit, idx (`defender-${unit.id}-${unit.typeUnit}`)}
				<CardWithShadow
					draggable={true}
					ondragstart={(e) => handleDragStart(e, 'Defenders', idx)}
					ondrag={handleDrag}
					ondragover={(e) => {
						handleDragOver(e);
						hoverTarget = { team: 'Defenders', index: idx };
					}}
					ondrop={(e) => handleDrop(e, 'Defenders', idx)}
					ondragend={handleDragEnd}
					class={`dnd-card ${
						hoverTarget && hoverTarget.team === 'Defenders' && hoverTarget.index === idx
							? 'dnd-drop-target'
							: ''
					} ${
						dragContext && dragContext.team === 'Defenders' && dragContext.index === idx
							? 'being-dragged'
							: ''
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
				style="padding:4px; min-height:8px; opacity:0.2;"
				ondragover={handleDragOver}
				ondrop={(e) => handleDrop(e, 'Defenders', defenders.length)}
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
h1 {
	margin: 0.5em 0 0.25em;
	color: #fff;
	font-weight: 400;
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
	transition: transform 180ms ease, box-shadow 180ms ease;
}
:global(.dnd-card.dragging) {
	box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
}
:global(.dnd-card.dnd-drop-target) {
	outline: 2px solid #4488ff;
	outline-offset: -2px;
}
:global(.dnd-card.being-dragged) {
	opacity: 0;
}
:global(input[type='text']::-webkit-outer-spin-button),
:global(input[type='text']::-webkit-inner-spin-button) {
	-webkit-appearance: none;
	margin: 0;
}
</style>

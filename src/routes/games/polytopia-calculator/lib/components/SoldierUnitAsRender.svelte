<script>
import { displayIcon } from '../unitImages.js';

let {
	unit,
	onDelete,
	onUpdateHitpoints,
	onIncreaseHitpoints,
	onDecreaseHitpoints,
	onVeteranBonus,
	onDefenceBonus,
	onWallBonus,
	onSafeBonus,
	onPoisonedBonus,
	onBoostedBonus,
	onShipUnit,
	onSplashDamage,
	onExplodeDamage,
} = $props();

let healthInputField = $state('');

$effect(() => {
	healthInputField = String(unit.healthBefore);
});

const isAttacker = $derived(unit.team === 'Attackers');
const isDefender = $derived(unit.team === 'Defenders');

function commitHealth(value) {
	const normalized = String(value).replace(',', '.');
	const numeric = parseFloat(normalized) || 0;
	healthInputField = String(numeric);
	onUpdateHitpoints(unit.id, unit.team, numeric);
}

function onKeyDown(e) {
	if (e.key === 'Enter') commitHealth(e.target.value);
}
</script>

<div class="soldier-unit">
	<div class="row top">
		<div class="left">
			<img
				class="unit-img {isDefender ? 'flip' : ''}"
				src={displayIcon(unit.typeUnit, unit.team)}
				alt="Soldier"
			/>
			<label class="hp-label" for={`${unit.team}${unit.id}HitpointField`}>
				<input
					id={`${unit.team}${unit.id}HitpointField`}
					name={`${unit.team}${unit.id}HitpointField`}
					type="text"
					inputmode="decimal"
					bind:value={healthInputField}
					onblur={(e) => commitHealth(e.target.value)}
					onkeydown={onKeyDown}
					onfocus={(e) => e.target.select()}
					maxlength="5"
				/>
			</label>
			<span class="arrow">→</span>
			<span class="health-after" data-testid={`${unit.team.toLowerCase()}-${unit.id}-health-after`}>
				{unit.healthAfter}
			</span>
		</div>
		<button class="delete-btn" onclick={() => onDelete(unit.id, unit.team)} aria-label="delete unit">
			✕
		</button>
	</div>

	<div class="row buttons">
		<button class="hp-btn plus" onclick={() => onIncreaseHitpoints(unit.id, unit.team)} aria-label="increase hp">+</button>

		{#if !unit.config.skills.includes('static')}
			<button
				class="bonus-btn"
				class:on={unit.veteran}
				onclick={() => onVeteranBonus(unit.id, unit.team, unit.typeUnit)}
			>{unit.veteran ? 'VET' : 'vet'}</button>
		{/if}

		{#if unit.shipUnit}
			<button
				class="bonus-btn"
				onclick={() => onShipUnit(unit.id, unit.team, unit.typeUnit, unit.shipUnit)}
			>mx{unit.healthMax}</button>
		{/if}

		{#if isAttacker && (unit.config.skills.includes('splash') || unit.config.skills.includes('stomp'))}
			<button
				class="bonus-btn"
				class:on={unit.splashDamage}
				onclick={() => onSplashDamage(unit.id, unit.team, unit.typeUnit, unit.splashDamage)}
			>{unit.splashDamage ? 'SPLSH' : 'splsh'}</button>
		{/if}

		{#if isAttacker && unit.config.skills.includes('explode')}
			<button
				class="bonus-btn"
				class:on={unit.explodeDamage}
				onclick={() => onExplodeDamage(unit.id, unit.team, unit.typeUnit, unit.explodeDamage)}
			>{unit.explodeDamage ? 'XPLD' : 'xpld'}</button>
		{/if}

		{#if isDefender}
			<button
				class="bonus-btn"
				class:on={unit.defenceBonus}
				onclick={() => onDefenceBonus(unit.id, unit.team, unit.typeUnit, unit.defenceBonus)}
			>{unit.defenceBonus ? 'DEF' : 'def'}</button>
		{/if}
	</div>

	<div class="row buttons">
		<button class="hp-btn minus" onclick={() => onDecreaseHitpoints(unit.id, unit.team)} aria-label="decrease hp">−</button>

		{#if isDefender && unit.config.skills.includes('fortify')}
			<button
				class="bonus-btn"
				class:on={unit.wallBonus}
				onclick={() => onWallBonus(unit.id, unit.team, unit.typeUnit, unit.wallBonus)}
			>{unit.wallBonus ? 'WALL' : 'wall'}</button>
		{/if}

		{#if isDefender}
			<button
				class="bonus-btn"
				class:on={unit.poisonedBonus}
				class:became-poisoned={!unit.poisonedBonus && unit.becamePoisonedBonus}
				onclick={() => onPoisonedBonus(unit.id, unit.team, unit.typeUnit, unit.poisonedBonus)}
			>{unit.poisonedBonus ? 'POIS' : 'pois'}</button>
		{/if}

		{#if isAttacker && !unit.config.skills.includes('surprise')}
			<button
				class="bonus-btn"
				class:on={unit.safeBonus}
				onclick={() => onSafeBonus(unit.id, unit.team, unit.typeUnit, unit.safeBonus)}
			>{unit.safeBonus ? 'SAFE' : 'safe'}</button>
		{/if}

		{#if isAttacker}
			<button
				class="bonus-btn"
				class:on={unit.boostedBonus}
				onclick={() => onBoostedBonus(unit.id, unit.team, unit.typeUnit, unit.boostedBonus)}
			>{unit.boostedBonus ? 'BST' : 'bst'}</button>
		{/if}
	</div>
</div>

<style>
.soldier-unit {
	display: flex;
	flex-direction: column;
	gap: 4px;
}
.row {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 4px;
}
.row.top {
	justify-content: space-between;
}
.left {
	display: flex;
	align-items: center;
	gap: 4px;
}
.unit-img {
	height: 40px;
	width: 30px;
	object-fit: contain;
	margin: 5px;
	border-radius: 5px;
}
.unit-img.flip {
	transform: scaleX(-1);
}
.hp-label input {
	width: 38px;
	padding: 2px 4px;
	font-size: 1rem;
	background: #1e1e1e;
	color: #e8e8e8;
	border: 1px solid #4a4a4a;
	border-radius: 3px;
}
.hp-label input:focus {
	outline: none;
	border-color: #4488ff;
}
.arrow {
	font-weight: bold;
	font-size: 1.1rem;
	color: #aaa;
}
.health-after {
	font-weight: bold;
	min-width: 1.6em;
	text-align: center;
	color: #fff;
}
.delete-btn {
	background: transparent;
	border: 0;
	color: #ff6b9a;
	cursor: pointer;
	font-size: 1.3rem;
	padding: 0;
	margin-right: 5%;
}
.delete-btn:hover {
	color: #ff8aae;
}
.hp-btn {
	width: 28px;
	height: 28px;
	padding: 0;
	font-size: 1.1rem;
	line-height: 1;
	font-weight: bold;
	background: #1e1e1e;
	border: 1px solid #4a4a4a;
	border-radius: 4px;
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	margin-right: 2%;
}
.hp-btn.plus {
	color: #66bb6a;
	border-color: #3a5a3a;
}
.hp-btn.plus:hover {
	background: #1f2a1f;
	border-color: #66bb6a;
}
.hp-btn.minus {
	color: #ff6b9a;
	border-color: #5a3a4a;
}
.hp-btn.minus:hover {
	background: #2a1f24;
	border-color: #ff6b9a;
}
.bonus-btn {
	min-width: 55px;
	padding: 2px 6px;
	margin-right: 2%;
	background: #1e1e1e;
	border: 1px solid #5a4a6a;
	color: #888;
	border-radius: 4px;
	cursor: pointer;
	font-size: 0.85rem;
}
.bonus-btn:hover {
	background: #2a2a2a;
	border-color: #7e57c2;
}
.bonus-btn.on {
	color: #ce93d8;
	border-color: #ce93d8;
	font-weight: bold;
	background: #2a1f33;
}
.bonus-btn.became-poisoned {
	color: #81c784;
	border-color: #4a6a4a;
}
</style>

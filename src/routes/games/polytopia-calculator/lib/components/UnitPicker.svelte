<script>
import { unitImages } from '../unitImages.js';
import { buildUnitTabs } from '../unitTabs.js';
import CardWithShadow from './CardWithShadow.svelte';

let { team, versionConfig, onAdd, onOptimize = null } = $props();

const colorClass = $derived(team === 'Attackers' ? 'attacker' : 'defender');
const tabs = $derived(buildUnitTabs(versionConfig.unitStats));

let currentTab = $state(0);
const tab = $derived(tabs[Math.min(currentTab, tabs.length - 1)]);
</script>

<CardWithShadow class="picker-card">
	<div class="picker-header">
		{#if onOptimize}
			<button class="optimize-btn {colorClass}" onclick={onOptimize}>Optimize order</button>
		{:else}
			<span class="picker-title">{team} selection</span>
		{/if}
	</div>
	<div class="tabs">
		{#each tabs as t, i (t.label)}
			<button class="tab-btn {colorClass}" class:active={t === tab} onclick={() => (currentTab = i)}>
				{t.label}
			</button>
		{/each}
	</div>
	<div class="picker-grid" style={`grid-template-columns: repeat(${tab.columns}, 1fr);`}>
		{#each tab.units as name (name)}
			<button
				class="unit-btn {colorClass}"
				onclick={() => onAdd(name)}
				data-testid={`${team.toLowerCase().replace(/s$/, '')}-${name.toLowerCase()}`}
			>
				<img src={unitImages[team][name]} alt={name} class:flip={team === 'Defenders'} />
			</button>
		{/each}
	</div>
</CardWithShadow>

<style>
:global(.card-with-shadow.picker-card) {
	max-width: 425px;
	width: 100%;
	padding: 1%;
}
.picker-header {
	display: flex;
	justify-content: center;
	align-items: center;
	font-size: 1.15rem;
	font-weight: 500;
	min-height: 2.2em;
}
.picker-title {
	align-self: center;
}
.optimize-btn {
	flex: 1;
	margin: 0 8px;
	padding: 4px 10px;
	border: 1px solid;
	border-radius: 4px;
	background: #1e1e1e;
	color: #e8e8e8;
	font-family: inherit;
	font-size: 1rem;
	font-weight: 600;
	cursor: pointer;
	transition: background 120ms ease, border-color 120ms ease;
}
.optimize-btn.attacker {
	border-color: #4488ff;
	color: #cfe2ff;
}
.optimize-btn.defender {
	border-color: #e34a4a;
	color: #ffd2d2;
}
.optimize-btn:hover {
	background: #2a2a2a;
	filter: brightness(1.1);
}
.tabs {
	display: flex;
	gap: 2px;
}
.tab-btn {
	flex: 1 1 auto;
	min-width: 0;
	padding: 4px 1px;
	background: transparent;
	border: 0;
	border-bottom: 2px solid transparent;
	color: #888;
	cursor: pointer;
	font-family: inherit;
	font-size: 0.72rem;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.tab-btn:hover {
	color: #ccc;
}
.tab-btn.active {
	color: #e8e8e8;
	font-weight: 600;
}
.tab-btn.attacker.active {
	border-bottom-color: #4488ff;
}
.tab-btn.defender.active {
	border-bottom-color: #e34a4a;
}
.picker-grid {
	display: grid;
	gap: 4px;
	padding: 6px 2px 2px;
	justify-items: center;
	align-content: start;
	/* always reserve two rows of unit buttons so switching tabs never reflows */
	min-height: 100px;
}
.unit-btn {
	width: 100%;
	max-width: 4em;
	padding: 3px;
	background: #1e1e1e;
	cursor: pointer;
	border-radius: 4px;
	border: 1px solid;
}
.unit-btn.attacker {
	border-color: #4488ff;
}
.unit-btn.defender {
	border-color: #e34a4a;
}
.unit-btn:hover {
	background: #2a2a2a;
}
.unit-btn img {
	height: 36px;
	width: 27px;
	object-fit: contain;
	-webkit-appearance: none;
}
.unit-btn img.flip {
	transform: scaleX(-1);
}
</style>

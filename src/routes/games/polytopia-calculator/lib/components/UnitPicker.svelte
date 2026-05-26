<script>
import CardWithShadow from './CardWithShadow.svelte';
import { unitImages, attackerPages, defenderPages } from '../unitImages.js';

let { team, onAdd, onOptimize = null, disabled = false } = $props();

const pages = $derived(team === 'Attackers' ? attackerPages : defenderPages);
const colorClass = $derived(team === 'Attackers' ? 'attacker' : 'defender');
const label = $derived(team === 'Attackers' ? 'Attackers selection' : 'Defenders selection');

let currentPage = $state(0);

function prev() {
	currentPage = currentPage === 0 ? pages.length - 1 : currentPage - 1;
}
function next() {
	currentPage = currentPage === pages.length - 1 ? 0 : currentPage + 1;
}
</script>

<CardWithShadow class="picker-card">
	<div class="picker-header">
		<button class="nav-btn {colorClass}" onclick={prev} {disabled} aria-label="previous page">&lt;</button>
		{#if onOptimize}
			<button class="optimize-btn {colorClass}" onclick={onOptimize}>Optimize order</button>
		{:else}
			<span class="picker-title">{label}</span>
		{/if}
		<button class="nav-btn {colorClass}" onclick={next} {disabled} aria-label="next page">&gt;</button>
	</div>
	{#each [0, 1] as row}
		<div class="picker-row">
			{#each pages[currentPage].slice(row * 5, row * 5 + 5) as unit, i (`${unit.name}-${row}-${i}`)}
				<button
					class="unit-btn {colorClass}"
					onclick={() => onAdd(unit.name)}
					{disabled}
					data-testid={`${team.toLowerCase().replace(/s$/, '')}-${unit.name.toLowerCase()}`}
				>
					<img
						src={unitImages[team][unit.name]}
						alt={unit.name}
						class:flip={team === 'Defenders'}
					/>
				</button>
			{/each}
		</div>
	{/each}
</CardWithShadow>

<style>
:global(.card-with-shadow.picker-card) {
	max-width: 425px;
	width: 100%;
	padding: 1%;
}
.picker-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	font-size: 1.15rem;
	font-weight: 500;
}
.picker-title {
	align-self: center;
}
.optimize-btn {
	flex: 1;
	margin: 0 8px;
	padding: 6px 10px;
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
.picker-row {
	display: flex;
	justify-content: space-between;
}
.nav-btn {
	margin: 8px;
	max-width: 4em;
	min-width: 4em;
	padding: 4px 6px;
	border: 0;
	border-radius: 4px;
	color: white;
	cursor: pointer;
	font-weight: bold;
}
.nav-btn.attacker {
	background: #4488ff;
}
.nav-btn.defender {
	background: #e34a4a;
}
.nav-btn:hover:not(:disabled) {
	filter: brightness(1.15);
}
.nav-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}
.unit-btn {
	margin: 8px;
	max-width: 4em;
	min-width: 4em;
	padding: 4px;
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
.unit-btn:hover:not(:disabled) {
	background: #2a2a2a;
}
.unit-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}
.unit-btn img {
	height: 40px;
	width: 30px;
	object-fit: contain;
	-webkit-appearance: none;
}
.unit-btn img.flip {
	transform: scaleX(-1);
}
</style>

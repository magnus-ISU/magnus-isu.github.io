<script>
import { unitImages } from '../unitImages.js';
import CardWithShadow from './CardWithShadow.svelte';

let { team, versionConfig, onAdd, onOptimize = null } = $props();

const UNITS_PER_PAGE = 10;
const colorClass = $derived(team === 'Attackers' ? 'attacker' : 'defender');

const pages = $derived.by(() => {
	const names = versionConfig.unitStats.map((u) => u.name);
	const chunks = [];
	for (let i = 0; i < names.length; i += UNITS_PER_PAGE)
		chunks.push(names.slice(i, i + UNITS_PER_PAGE));
	return chunks;
});

let currentPage = $state(0);
const page = $derived(Math.min(currentPage, pages.length - 1));

function prev() {
	currentPage = (page + pages.length - 1) % pages.length;
}
function next() {
	currentPage = (page + 1) % pages.length;
}
</script>

<CardWithShadow class="picker-card">
	<div class="picker-header">
		<button class="nav-btn {colorClass}" onclick={prev} aria-label="previous page">&lt;</button>
		{#if onOptimize}
			<button class="optimize-btn {colorClass}" onclick={onOptimize}>Optimize order</button>
		{:else}
			<span class="picker-title">{team} selection</span>
		{/if}
		<button class="nav-btn {colorClass}" onclick={next} aria-label="next page">&gt;</button>
	</div>
	<div class="picker-grid">
		{#each pages[page] as name (name)}
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
.picker-grid {
	display: grid;
	grid-template-columns: repeat(5, 1fr);
	justify-items: center;
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
.nav-btn:hover {
	filter: brightness(1.15);
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
.unit-btn:hover {
	background: #2a2a2a;
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

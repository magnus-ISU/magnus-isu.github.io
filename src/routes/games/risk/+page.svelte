<script>
	import { onMount } from 'svelte';
	import paths from './paths.json';
	import background from './background.json';

	let territories = [
		{ id: 'eastern_australia', name: 'Eastern Australia' },
		{ id: 'indonesia', name: 'Indonesia' },
		{ id: 'new_guinea', name: 'New Guinea' },
		{ id: 'alaska', name: 'Alaska' },
		{ id: 'ontario', name: 'Ontario' },
		{ id: 'northwest_territory', name: 'Northwest Territory' },
		{ id: 'venezuela', name: 'Venezuela' },
		{ id: 'madagascar', name: 'Madagascar' },
		{ id: 'north_africa', name: 'North Africa' },
		{ id: 'greenland', name: 'Greenland' },
		{ id: 'iceland', name: 'Iceland' },
		{ id: 'great_britain', name: 'Great Britain' },
		{ id: 'scandinavia', name: 'Scandinavia' },
		{ id: 'japan', name: 'Japan' },
		{ id: 'yakursk', name: 'Yakutsk' },
		{ id: 'kamchatka', name: 'Kamchatka' },
		{ id: 'siberia', name: 'Siberia' },
		{ id: 'ural', name: 'Ural' },
		{ id: 'afghanistan', name: 'Afghanistan' },
		{ id: 'middle_east', name: 'Middle East' },
		{ id: 'india', name: 'India' },
		{ id: 'siam', name: 'Siam' },
		{ id: 'china', name: 'China' },
		{ id: 'mongolia', name: 'Mongolia' },
		{ id: 'irkutsk', name: 'Irkutsk' },
		{ id: 'ukraine', name: 'Ukraine' },
		{ id: 'southern_europe', name: 'Southern Europe' },
		{ id: 'western_europe', name: 'Western Europe' },
		{ id: 'northern_europe', name: 'Northern Europe' },
		{ id: 'egypt', name: 'Egypt' },
		{ id: 'east_africa', name: 'East Africa' },
		{ id: 'congo', name: 'Congo' },
		{ id: 'south_africa', name: 'South Africa' },
		{ id: 'brazil', name: 'Brazil' },
		{ id: 'argentina', name: 'Argentina' },
		{ id: 'eastern_united_states', name: 'Eastern United States' },
		{ id: 'western_united_states', name: 'Western United States' },
		{ id: 'quebec', name: 'Quebec' },
		{ id: 'central_america', name: 'Central America' },
		{ id: 'peru', name: 'Peru' },
		{ id: 'western_australia', name: 'Western Australia' },
		{ id: 'alberta', name: 'Alberta' }
	];

	let centers = {};
	let state = {};
	let selectedId = null;
	const colors = ['#FF4D4D', '#4D4DFF', '#4DFF4D', '#FFFF4D', '#FF4DFF', '#FFB347'];

	let svgElement;

	function loadState() {
		const saved = localStorage.getItem('risk-state');
		if (saved) {
			state = JSON.parse(saved);
		} else {
			territories.forEach((t) => {
				state[t.id] = {
					armies: 1,
					owner: colors[0],
					isCard: false
				};
			});
		}
	}

	function saveState() {
		localStorage.setItem('risk-state', JSON.stringify(state));
	}

	function handleCountryClick(id) {
		if (selectedId === id) {
			state[id].armies += 1;
		} else {
			selectedId = id;
		}
		state = { ...state };
		saveState();
	}

	function handleRightClick(e, id) {
		e.preventDefault();
		if (selectedId === id) {
			state[id].isCard = !state[id].isCard;
			state = { ...state };
			saveState();
		}
	}

	function changeColor(color) {
		if (selectedId) {
			state[selectedId].owner = color;
			state[selectedId].armies = 1;
			state = { ...state };
			saveState();
		}
	}

	onMount(() => {
		loadState();

		// Calculate centers
		setTimeout(() => {
			if (svgElement) {
				territories.forEach((t) => {
					const el = svgElement.getElementById(t.id);
					if (el) {
						const bbox = el.getBBox();
						centers[t.id] = {
							x: bbox.x + bbox.width / 2,
							y: bbox.y + bbox.height / 2
						};
					}
				});
				centers = { ...centers };
			}
		}, 100);
	});

	$: cards = territories.filter((t) => state[t.id]?.isCard);
</script>

<div class="game-container">
	<div class="color-picker">
		{#each colors as color}
			<button
				class="color-btn"
				class:selected={selectedId && state[selectedId].owner === color}
				style="background-color: {color};"
				on:click={() => changeColor(color)}
			/>
		{/each}
	</div>

	<div class="svg-container">
		<svg
			viewBox="0 0 750 520"
			bind:this={svgElement}
			on:contextmenu|preventDefault={() => {}}
		>
			<g transform="translate(-167.99651,-118.55507)">
				<g id="background" opacity="0.3">
					{#each background as bg}
						<path d={bg.d} fill={bg.fill} style={bg.style} />
					{/each}
				</g>

				<g id="territories">
					{#each territories as t (t.id)}
						{#if paths[t.id]}
							<path
								id={t.id}
								d={paths[t.id]}
								fill={state[t.id]?.owner || '#ccc'}
								fill-opacity="0.7"
								stroke={selectedId === t.id ? 'white' : '#000'}
								stroke-width={selectedId === t.id ? '2.5' : '0.5'}
								class:glowing={state[t.id]?.isCard}
								on:click={() => handleCountryClick(t.id)}
								on:contextmenu={(e) => handleRightClick(e, t.id)}
							/>
						{/if}
					{/each}
				</g>

				<g id="labels" pointer-events="none">
					{#each territories as t (t.id)}
						{#if centers[t.id]}
							<circle cx={centers[t.id].x} cy={centers[t.id].y} r="8" fill="white" opacity="0.9" />
							<text
								x={centers[t.id].x}
								y={centers[t.id].y}
								text-anchor="middle"
								dominant-baseline="central"
								font-size="10"
								font-weight="bold"
								fill="black"
							>
								{state[t.id]?.armies || 0}
							</text>
						{/if}
					{/each}
				</g>
			</g>
		</svg>
	</div>

	<div class="cards-container">
		<h3>Held Cards</h3>
		<div class="cards-list">
			{#each cards as card}
				<div class="card" style="border-color: {state[card.id].owner}">
					{card.name}
				</div>
			{/each}
			{#if cards.length === 0}
				<p>No cards held. Right-click a selected country to hold its card.</p>
			{/if}
		</div>
	</div>
</div>

<style>
	.game-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 20px;
		background-color: #121212;
		color: #e0e0e0;
		min-height: 100vh;
		font-family: sans-serif;
	}

	.color-picker {
		display: flex;
		gap: 15px;
		margin-bottom: 25px;
		padding: 10px;
		background: #1e1e1e;
		border-radius: 30px;
		box-shadow: 0 4px 10px rgba(0,0,0,0.3);
	}

	.color-btn {
		width: 35px;
		height: 35px;
		border-radius: 50%;
		border: 3px solid transparent;
		cursor: pointer;
		transition: transform 0.2s, border-color 0.2s;
	}

	.color-btn:hover {
		transform: scale(1.1);
	}

	.color-btn.selected {
		border-color: white;
		transform: scale(1.2);
	}

	.svg-container {
		width: 100%;
		max-width: 900px;
		background-color: #1a1a1a;
		border: 1px solid #333;
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
	}

	svg {
		width: 100%;
		height: auto;
		display: block;
	}

	path {
		cursor: pointer;
		transition: fill-opacity 0.2s, fill 0.3s;
	}

	path:hover {
		fill-opacity: 0.9;
	}

	.glowing {
		filter: drop-shadow(0 0 12px gold);
		stroke: gold !important;
		stroke-width: 3 !important;
		fill-opacity: 0.9 !important;
	}

	.cards-container {
		margin-top: 40px;
		width: 100%;
		max-width: 900px;
		text-align: center;
	}

	.cards-list {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		justify-content: center;
		margin-top: 15px;
	}

	.card {
		padding: 12px 24px;
		background-color: #1e1e1e;
		border: 2px solid;
		border-radius: 8px;
		font-weight: bold;
		box-shadow: 0 4px 8px rgba(0,0,0,0.2);
		animation: slideUp 0.3s ease-out;
	}

	@keyframes slideUp {
		from { transform: translateY(10px); opacity: 0; }
		to { transform: translateY(0); opacity: 1; }
	}

	h3 {
		margin: 0;
		color: #888;
		text-transform: uppercase;
		letter-spacing: 3px;
		font-size: 0.9rem;
	}

	p {
		color: #666;
		font-style: italic;
	}
</style>

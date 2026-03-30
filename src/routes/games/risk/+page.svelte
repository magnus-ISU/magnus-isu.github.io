<script>
	import { onMount } from 'svelte';
	import paths from './paths.json';
	import background from './background.json';
	import connections from './connections.json';

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
	let activeColor = null;
	const colors = ['#FF0000', '#0000FF', '#FFFF00', '#000000', '#008000', '#C0C0C0'];

	let svgElement;

	function loadState() {
		const saved = localStorage.getItem('risk-state');
		if (saved) {
			state = JSON.parse(saved);
		} else {
			territories.forEach((t) => {
				state[t.id] = {
					armies: 0,
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
		if (activeColor) {
			state[id].owner = activeColor;
			state[id].armies = 1;
			selectedId = id;
		} else {
			if (selectedId === id) {
				state[id].armies += 1;
			} else {
				selectedId = id;
			}
		}
		state = { ...state };
		saveState();
	}

	function handleOceanClick() {
		selectedId = null;
		activeColor = null;
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
		if (activeColor === color) {
			activeColor = null;
		} else {
			activeColor = color;
			if (selectedId) {
				state[selectedId].owner = color;
				state[selectedId].armies = 1;
				state = { ...state };
				saveState();
			}
		}
	}

	function exportState() {
		const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
		const downloadAnchorNode = document.createElement('a');
		downloadAnchorNode.setAttribute("href",     dataStr);
		downloadAnchorNode.setAttribute("download", "risk_state.json");
		document.body.appendChild(downloadAnchorNode);
		downloadAnchorNode.click();
		downloadAnchorNode.remove();
	}

	function importState(event) {
		const file = event.target.files[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const imported = JSON.parse(e.target.result);
				state = imported;
				saveState();
			} catch (err) {
				alert("Failed to import: Invalid JSON");
			}
		};
		reader.readAsText(file);
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

	$: stats = colors.reduce((acc, color) => {
		const teamTerritories = Object.values(state).filter((s) => s.owner === color && s.armies > 0);
		acc[color] = {
			territories: teamTerritories.length,
			armies: teamTerritories.reduce((sum, s) => sum + s.armies, 0)
		};
		return acc;
	}, {});

	function getContrastColor(hex) {
		const r = parseInt(hex.substring(1, 3), 16);
		const g = parseInt(hex.substring(3, 5), 16);
		const b = parseInt(hex.substring(5, 7), 16);
		const yiq = (r * 299 + g * 587 + b * 114) / 1000;
		return yiq >= 128 ? 'black' : 'white';
	}
</script>

<div class="game-container">
	<div class="color-picker">
		{#each colors as color}
			<button
				class="color-btn"
				class:selected={activeColor === color}
				style="background-color: {color}; color: {getContrastColor(color)};"
				on:click={() => changeColor(color)}
			>
				<span class="stat-t">{stats[color].territories}</span>
				<span class="stat-divider" style="background-color: {getContrastColor(color)}; opacity: 0.3;"></span>
				<span class="stat-a">{stats[color].armies}</span>
			</button>
		{/each}
	</div>

	<div
		class="svg-container"
		on:click={handleOceanClick}
		on:keydown={(e) => e.key === 'Escape' && handleOceanClick()}
		role="presentation"
	>
		<svg
			viewBox="0 0 750 520"
			bind:this={svgElement}
			on:contextmenu|preventDefault={() => {}}
			role="application"
			aria-label="Risk Board"
		>
			<g transform="translate(-167.99651,-118.55507)">
				<g
					id="background"
					opacity="0.1"
					on:click|stopPropagation={handleOceanClick}
					on:keydown|stopPropagation={(e) => e.key === 'Escape' && handleOceanClick()}
					role="presentation"
				>
					{#each background as bg}
						<path d={bg.d} fill={bg.fill} style={bg.style} />
					{/each}
				</g>

				<g
					id="connections"
					on:click|stopPropagation={handleOceanClick}
					on:keydown|stopPropagation={(e) => e.key === 'Escape' && handleOceanClick()}
					role="presentation"
				>
					{#each connections as conn}
						<path d={conn.d} style={conn.style} stroke="#000" fill="none" stroke-dasharray="none" />
					{/each}
				</g>

				<g id="territories">
					{#each territories as t (t.id)}
						{#if paths[t.id]}
							<path
								id={t.id}
								d={paths[t.id]}
								fill={state[t.id]?.owner || '#ccc'}
								fill-opacity="1.0"
								stroke={selectedId === t.id
									? state[t.id]?.owner === '#000000'
										? '#FF0000'
										: '#000000'
									: state[t.id]?.isCard
										? 'gold'
										: '#000'}
								stroke-width={selectedId === t.id || state[t.id]?.isCard ? '3' : '0.5'}
								class:glowing={state[t.id]?.isCard}
								on:click|stopPropagation={() => handleCountryClick(t.id)}
								on:keydown|stopPropagation={(e) =>
									(e.key === 'Enter' || e.key === ' ') && handleCountryClick(t.id)}
								on:contextmenu={(e) => handleRightClick(e, t.id)}
								role="button"
								aria-label={t.name}
								tabindex="0"
							/>
						{/if}
					{/each}
				</g>

				<g id="labels" pointer-events="none">
					{#each territories as t (t.id)}
						{#if centers[t.id]}
							<circle cx={centers[t.id].x} cy={centers[t.id].y} r="8" fill="white" opacity="0.9" />
							{#if state[t.id]?.armies > 0}
								<text
									x={centers[t.id].x}
									y={centers[t.id].y}
									text-anchor="middle"
									dominant-baseline="central"
									font-size="10"
									font-weight="bold"
									fill="black"
								>
									{state[t.id].armies}
								</text>
							{/if}
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

		<div class="game-actions">
			<button class="action-btn" on:click={exportState}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
				</svg>
				Export Game
			</button>
			<label class="action-btn">
				<input type="file" accept=".json" on:change={importState} style="display: none;" />
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
				</svg>
				Import Game
			</label>
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
		width: 45px;
		height: 45px;
		border-radius: 50%;
		border: 3px solid transparent;
		cursor: pointer;
		transition: transform 0.2s, border-color 0.2s;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		line-height: 1;
	}

	.stat-t {
		font-size: 0.8rem;
	}

	.stat-a {
		font-size: 0.7rem;
		opacity: 0.9;
	}

	.stat-divider {
		width: 60%;
		height: 1px;
		margin: 2px 0;
	}

	.color-btn:hover {
		transform: scale(1.1);
	}

	.color-btn.selected {
		border-color: white;
		transform: scale(1.2);
	}

	.game-actions {
		display: flex;
		gap: 15px;
		justify-content: center;
		margin-top: 30px;
		padding-top: 20px;
		border-top: 1px solid #333;
	}

	.action-btn {
		padding: 10px 20px;
		background: #1e1e1e;
		border: 1px solid #333;
		border-radius: 6px;
		color: #888;
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: all 0.2s;
	}

	.action-btn:hover {
		background: #2a2a2a;
		border-color: #444;
		color: white;
	}

	.svg-container {
		width: 100%;
		max-width: 900px;
		background-color: white;
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

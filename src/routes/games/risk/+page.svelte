<script>
import { onMount } from 'svelte';
import background from './background.json';
import connections from './connections.json';
import paths from './paths.json';
import defaultStateJson from './risk_state.json';

const { colorOrder: defaultColorOrder, ...defaultState } = defaultStateJson;

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
	{ id: 'alberta', name: 'Alberta' },
];

let centers = {};
let state = {};
let selectedId = null;
let activeColor = null;
const colors = ['#FF0000', '#4488FF', '#FFFF00', '#FFFFFF', '#008000', '#800080'];
const selectedColors = {
	'#FF0000': '#FF6666',
	'#4488FF': '#88AAFF',
	'#FFFF00': '#FFFF88',
	'#FFFFFF': '#CCCCCC',
	'#008000': '#44BB44',
	'#800080': '#BB44BB',
};

let colorOrder = defaultColorOrder ? [...defaultColorOrder] : [...colors];
let dragIdx = null;

let campaign = [];
let campaignStats = [];

const adjacencies = {
	eastern_australia: ['new_guinea', 'western_australia'],
	indonesia: ['siam', 'new_guinea', 'western_australia'],
	new_guinea: ['indonesia', 'western_australia', 'eastern_australia'],
	alaska: ['northwest_territory', 'alberta', 'kamchatka'],
	ontario: [
		'northwest_territory',
		'alberta',
		'western_united_states',
		'eastern_united_states',
		'quebec',
		'greenland',
	],
	northwest_territory: ['alaska', 'alberta', 'ontario', 'greenland'],
	venezuela: ['central_america', 'peru', 'brazil'],
	madagascar: ['east_africa', 'south_africa'],
	north_africa: ['brazil', 'western_europe', 'southern_europe', 'egypt', 'east_africa', 'congo'],
	greenland: ['northwest_territory', 'ontario', 'quebec', 'iceland'],
	iceland: ['greenland', 'great_britain', 'scandinavia'],
	great_britain: ['iceland', 'scandinavia', 'northern_europe', 'western_europe'],
	scandinavia: ['iceland', 'great_britain', 'northern_europe', 'ukraine'],
	japan: ['kamchatka', 'mongolia'],
	yakursk: ['siberia', 'irkutsk', 'kamchatka'],
	kamchatka: ['alaska', 'yakursk', 'irkutsk', 'mongolia', 'japan'],
	siberia: ['ural', 'yakursk', 'irkutsk', 'mongolia', 'china'],
	ural: ['ukraine', 'siberia', 'afghanistan', 'china'],
	afghanistan: ['ukraine', 'ural', 'china', 'india', 'middle_east'],
	middle_east: ['ukraine', 'southern_europe', 'egypt', 'east_africa', 'india', 'afghanistan'],
	india: ['middle_east', 'afghanistan', 'china', 'siam'],
	siam: ['india', 'china', 'indonesia'],
	china: ['afghanistan', 'ural', 'siberia', 'mongolia', 'siam', 'india'],
	mongolia: ['siberia', 'irkutsk', 'kamchatka', 'japan', 'china'],
	irkutsk: ['siberia', 'yakursk', 'kamchatka', 'mongolia'],
	ukraine: [
		'scandinavia',
		'northern_europe',
		'southern_europe',
		'ural',
		'afghanistan',
		'middle_east',
	],
	southern_europe: [
		'western_europe',
		'northern_europe',
		'ukraine',
		'middle_east',
		'egypt',
		'north_africa',
	],
	western_europe: ['great_britain', 'northern_europe', 'southern_europe', 'north_africa'],
	northern_europe: ['great_britain', 'scandinavia', 'ukraine', 'southern_europe', 'western_europe'],
	egypt: ['north_africa', 'southern_europe', 'middle_east', 'east_africa'],
	east_africa: ['egypt', 'north_africa', 'congo', 'south_africa', 'madagascar', 'middle_east'],
	congo: ['north_africa', 'east_africa', 'south_africa'],
	south_africa: ['congo', 'east_africa', 'madagascar'],
	brazil: ['venezuela', 'peru', 'argentina', 'north_africa'],
	argentina: ['peru', 'brazil'],
	eastern_united_states: ['ontario', 'quebec', 'western_united_states', 'central_america'],
	western_united_states: ['alberta', 'ontario', 'eastern_united_states', 'central_america'],
	quebec: ['ontario', 'greenland', 'eastern_united_states'],
	central_america: ['western_united_states', 'eastern_united_states', 'venezuela'],
	peru: ['venezuela', 'brazil', 'argentina'],
	western_australia: ['indonesia', 'new_guinea', 'eastern_australia'],
	alberta: ['alaska', 'northwest_territory', 'ontario', 'western_united_states'],
};

const rollProbs = {
	'3-2': [2275 / 7776, 2611 / 7776, 2890 / 7776], // A-2, A-1/D-1, D-2
	'3-1': [441 / 1296, 855 / 1296], // A-1, D-1
	'2-2': [581 / 1296, 420 / 1296, 295 / 1296], // A-2, A-1/D-1, D-2
	'2-1': [91 / 216, 125 / 216], // A-1, D-1
	'1-2': [161 / 216, 55 / 216], // A-1, D-1
	'1-1': [21 / 36, 15 / 36], // A-1, D-1
};

let battleCache = {};

function solveBattle(A, D) {
	const key = `${A}-${D}`;
	if (battleCache[key]) return battleCache[key];

	let dp = { [`${A}-${D}`]: 1.0 };
	let terminal = {};

	for (let s = A + D; s >= 2; s--) {
		for (let a = 1; a <= A; a++) {
			let d = s - a;
			if (d < 0 || d > D) continue;
			if (a === 1 || d === 0) continue;

			const p = dp[`${a}-${d}`];
			if (!p) continue;

			const nA = Math.min(a - 1, 3);
			const nD = Math.min(d, 2);
			const rKey = `${nA}-${nD}`;
			const probs = rollProbs[rKey];

			if (probs.length === 3) {
				update(a - 2, d, p * probs[0]);
				update(a - 1, d - 1, p * probs[1]);
				update(a, d - 2, p * probs[2]);
			} else {
				update(a - 1, d, p * probs[0]);
				update(a, d - 1, p * probs[1]);
			}
		}
	}

	function update(a, d, prob) {
		if (a === 1 || d === 0) {
			const outcome = d === 0 ? a - 1 : -d;
			terminal[outcome] = (terminal[outcome] || 0) + prob;
		} else {
			dp[`${a}-${d}`] = (dp[`${a}-${d}`] || 0) + prob;
		}
	}

	battleCache[key] = terminal;
	return terminal;
}

function calculateCampaign() {
	if (campaign.length < 2) {
		campaignStats = [];
		return;
	}

	const startId = campaign[0];
	const startArmies = state[startId]?.armies || 0;
	let dist = { [`reached-0-${startArmies}`]: 1.0 };

	for (let i = 1; i < campaign.length; i++) {
		const targetId = campaign[i];
		const initialDefenders = state[targetId]?.armies || 0;
		const nextDist = {};

		for (const [key, p] of Object.entries(dist)) {
			if (key.startsWith('fail')) {
				nextDist[key] = (nextDist[key] || 0) + p;
				continue;
			}

			const parts = key.split('-');
			const attackers = parseInt(parts[2], 10);

			if (attackers <= 1) {
				nextDist[`fail-${i - 1}`] = (nextDist[`fail-${i - 1}`] || 0) + p;
				continue;
			}

			const battleDist = solveBattle(attackers, initialDefenders);
			for (const [outcome, battleP] of Object.entries(battleDist)) {
				const combinedP = p * battleP;
				const res = parseInt(outcome, 10);
				if (res > 0) {
					nextDist[`reached-${i}-${res}`] = (nextDist[`reached-${i}-${res}`] || 0) + combinedP;
				} else {
					nextDist[`fail-${i}-${Math.abs(res)}`] =
						(nextDist[`fail-${i}-${Math.abs(res)}`] || 0) + combinedP;
				}
			}
		}
		dist = nextDist;
	}

	const finalId = campaign[campaign.length - 1];
	const finalName = territories.find((t) => t.id === finalId).name;
	const buckets = {};
	for (const [key, p] of Object.entries(dist)) {
		if (key.startsWith('reached')) {
			const count = key.split('-')[2];
			const label = `${count} ${finalName}`;
			buckets[label] = (buckets[label] || 0) + p;
		} else if (key.startsWith('fail')) {
			const parts = key.split('-');
			const failIdx = parseInt(parts[1], 10);
			const failedName = territories.find((t) => t.id === campaign[failIdx]).name;
			if (parts.length === 3) {
				const count = parts[2];
				const label = `-${count} ${failedName}`;
				buckets[label] = (buckets[label] || 0) + p;
			} else {
				const nextName =
					territories.find((t) => t.id === campaign[failIdx + 1])?.name || failedName;
				const label = `Stopped before ${nextName}`;
				buckets[label] = (buckets[label] || 0) + p;
			}
		}
	}

	// Sort: wins descending, then losses by territory (closest failure first), then by count
	const sorted = Object.entries(buckets)
		.map(([label, prob]) => {
			const numMatch = label.match(/^(-?\d+)/);
			const num = numMatch ? parseInt(numMatch[1], 10) : -999999;
			// Extract territory name for grouping losses
			const nameMatch = label.match(/^-?\d+\s+(.+)/) || label.match(/^Stopped before\s+(.+)/);
			const territory = nameMatch ? nameMatch[1] : '';
			// Find campaign index of territory for ordering loss groups
			const tIdx = campaign.findIndex(
				(id) => territories.find((t) => t.id === id)?.name === territory,
			);
			return { label, prob, num, tIdx: tIdx >= 0 ? tIdx : 999 };
		})
		.sort((a, b) => {
			const aIsWin = a.num > 0;
			const bIsWin = b.num > 0;
			if (aIsWin && !bIsWin) return -1;
			if (!aIsWin && bIsWin) return 1;
			if (aIsWin && bIsWin) return b.num - a.num;
			// Both losses: sort by campaign step (further first), then by fewer remaining defenders
			if (a.tIdx !== b.tIdx) return b.tIdx - a.tIdx;
			if (a.num !== b.num) return b.num - a.num;
			return a.label.localeCompare(b.label);
		});

	// Convert to cumulative probabilities (running sum from best to worst, ending at 100%)
	let cumulative = 0;
	campaignStats = sorted.map((s) => {
		cumulative += s.prob;
		return { label: s.label, prob: cumulative };
	});
}

let svgElement;

function loadState() {
	const saved = localStorage.getItem('risk-state');
	checkHasSave();
	if (saved) {
		state = JSON.parse(saved);
		// Migrate old Black team (#000000) to White (#FFFFFF)
		// and old Silver team (#C0C0C0) to Purple (#800080)
		Object.keys(state).forEach((id) => {
			if (state[id].owner === '#000000') {
				state[id].owner = '#FFFFFF';
			}
			if (state[id].owner === '#C0C0C0') {
				state[id].owner = '#800080';
			}
		});
	} else {
		state = JSON.parse(JSON.stringify(defaultState));
	}
	const savedOrder = localStorage.getItem('risk-color-order');
	if (savedOrder) {
		const parsed = JSON.parse(savedOrder);
		if (parsed.length === colors.length && colors.every((c) => parsed.includes(c))) {
			colorOrder = parsed;
		}
	}
}

function saveState() {
	if (JSON.stringify(state) === JSON.stringify(defaultState)) return;
	if (localStorage.getItem('risk-state') === JSON.stringify(state)) return;
	localStorage.setItem('risk-state', JSON.stringify(state));
	hasSave = true;
}

function saveColorOrder() {
	localStorage.setItem('risk-color-order', JSON.stringify(colorOrder));
}

let hasSave = false;

function checkHasSave() {
	hasSave = localStorage.getItem('risk-state') !== null;
}

function clearSave() {
	localStorage.removeItem('risk-state');
	localStorage.removeItem('risk-color-order');
	state = JSON.parse(JSON.stringify(defaultState));
	colorOrder = defaultColorOrder ? [...defaultColorOrder] : [...colors];
	selectedId = null;
	activeColor = null;
	campaign = [];
	campaignMode = false;
	hasSave = false;
}

let campaignMode = false;

function handleCountryClick(id, isShift = false) {
	if (isShift || campaignMode) {
		if (campaign.length === 0) {
			if (selectedId) campaign = [selectedId];
			else return;
		}
		const last = campaign[campaign.length - 1];
		if (adjacencies[last]?.includes(id)) {
			campaign = [...campaign, id];
		} else {
			campaign = [];
		}
	} else {
		if (activeColor) {
			if (state[id].owner === activeColor) {
				if (isShift) {
					if (state[id].armies > 1) state[id].armies -= 1;
				} else {
					state[id].armies += 1;
				}
			} else {
				state[id].owner = activeColor;
				state[id].armies = 1;
			}
			selectedId = id;
			campaign = [id];
		} else {
			if (selectedId === id) {
				if (isShift) {
					if (state[id].armies > 1) state[id].armies -= 1;
				} else {
					state[id].armies += 1;
				}
			} else {
				selectedId = id;
				campaign = [id];
			}
		}
	}
	state = { ...state };
	saveState();
}

function handleOceanClick() {
	selectedId = null;
	activeColor = null;
	campaign = [];
	campaignMode = false;
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
	const exportData = { ...state, colorOrder };
	const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
	const downloadAnchorNode = document.createElement('a');
	downloadAnchorNode.setAttribute('href', dataStr);
	downloadAnchorNode.setAttribute('download', 'risk_state.json');
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
			if (imported.colorOrder) {
				colorOrder = imported.colorOrder;
				saveColorOrder();
			}
			const { colorOrder: _ignored, ...territories } = imported;
			state = territories;
			saveState();
		} catch (err) {
			alert('Failed to import: Invalid JSON');
		}
	};
	reader.readAsText(file);
}

onMount(() => {
	loadState();

	// Calculate centers
	setTimeout(() => {
		if (svgElement) {
			const centerAdjust = {
				alaska: { dx: 0, dy: -9 },
				northwest_territory: { dx: 0, dy: 13 },
				eastern_united_states: { dx: -3, dy: 6, rotate: -10 },
				scandinavia: { dx: -4, dy: 0, rotate: -20 },
				brazil: { dx: 20, dy: -6 },
				venezuela: { dx: -10, dy: -3 },
				peru: { dx: 0, dy: 4 },
				argentina: { dx: -5, dy: -10 },
				north_africa: { dx: -5, dy: 5 },
				east_africa: { dx: -8, dy: -20 },
				southern_europe: { dx: 7, dy: 0 },
				western_europe: { dx: -7, dy: 16, lines: ['Western', 'Europe'] },
				northern_europe: { dx: 5, dy: 4 },
				ural: { dx: -5, dy: 5 },
				siberia: { dx: 8, dy: -3 },
				china: { dx: 0, dy: 4 },
				siam: { dx: 0, dy: -6 },
				eastern_australia: { dx: 8, dy: -6, lines: ['Eastern', 'Australia'] },
				western_australia: { dx: -7, dy: 9 },
				central_america: {
					dx: -4,
					dy: -15,
					lines: [
						{ text: 'Central', dx: -3 },
						{ text: 'America', dx: -4 },
					],
				},
				madagascar: { dx: -3, dy: 13, rotate: -40 },
				great_britain: {
					dx: 8,
					dy: 16,
					lines: [
						{ text: 'Great', dx: 2 },
						{ text: 'Britain', dx: 1 },
					],
				},
				iceland: { dx: 0, dy: 2, rotate: -20 },
				kamchatka: { dx: 0, dy: -37 },
				japan: { dx: 6, dy: 8, rotate: -60 },
				indonesia: { dx: 7, dy: -2, rotate: -40 },
			};
			territories.forEach((t) => {
				const el = svgElement.getElementById(t.id);
				if (el) {
					const bbox = el.getBBox();
					const adj = centerAdjust[t.id] || { dx: 0, dy: 0 };
					centers[t.id] = {
						x: bbox.x + bbox.width / 2 + adj.dx,
						y: bbox.y + bbox.height / 2 + adj.dy,
						rotate: adj.rotate || 0,
						lines: adj.lines || null,
					};
				}
			});
			centers = { ...centers };
		}
	}, 100);
});

$: cards = territories.filter((t) => state[t.id]?.isCard);

$: if (campaign.length >= 2 && state) {
	calculateCampaign();
} else {
	campaignStats = [];
}

$: stats = colors.reduce((acc, color) => {
	const teamTerritories = Object.values(state).filter((s) => s.owner === color && s.armies > 0);
	acc[color] = {
		territories: teamTerritories.length,
		armies: teamTerritories.reduce((sum, s) => sum + s.armies, 0),
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
		{#each colorOrder as color, i (color)}
			<button
				class="color-btn"
				class:selected={activeColor === color}
				draggable="true"
				style="background-color: {color}; color: {getContrastColor(color)};"
				on:click={() => changeColor(color)}
				on:dragstart={(e) => {
					dragIdx = i;
					e.dataTransfer.effectAllowed = 'move';
				}}
				on:dragover|preventDefault={(e) => {
					e.dataTransfer.dropEffect = 'move';
					if (dragIdx !== null && dragIdx !== i) {
						const newOrder = [...colorOrder];
						const [moved] = newOrder.splice(dragIdx, 1);
						newOrder.splice(i, 0, moved);
						colorOrder = newOrder;
						dragIdx = i;
					}
				}}
				on:dragend={() => {
					dragIdx = null;
					saveColorOrder();
				}}
			>
				{#if stats[color].territories > 0}
					<span class="stat-t">{stats[color].territories}</span>
					<span
						class="stat-divider"
						style="background-color: {getContrastColor(color)}; opacity: 0.3;"
					></span>
					<span class="stat-a">{stats[color].armies}</span>
				{/if}
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
						<path
							d={conn.d}
							style={conn.style}
							stroke="white"
							fill="none"
							stroke-dasharray="none"
						/>
					{/each}
				</g>

				<g id="territories">
					{#each territories as t (t.id)}
						{#if paths[t.id]}
							<path
								id={t.id}
								d={paths[t.id]}
								fill={selectedId === t.id || campaign.includes(t.id)
									? selectedColors[state[t.id]?.owner] || '#ddd'
									: state[t.id]?.owner || '#ccc'}
								fill-opacity="1.0"
								stroke={selectedId === t.id
									? state[t.id]?.owner === '#FFFFFF'
										? '#000000'
										: '#FFFFFF'
									: state[t.id]?.isCard
										? 'gold'
										: '#000'}
								stroke-width={selectedId === t.id || state[t.id]?.isCard ? '3' : '0.5'}
								class:glowing={state[t.id]?.isCard}
								on:click|stopPropagation={(e) => handleCountryClick(t.id, e.shiftKey)}
								on:keydown|stopPropagation={(e) =>
									(e.key === 'Enter' || e.key === ' ') && handleCountryClick(t.id, e.shiftKey)}
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
							{#if centers[t.id].lines}
								<text
									x={centers[t.id].x}
									y={centers[t.id].y - 6 - (centers[t.id].lines.length - 1) * 2.5}
									text-anchor="middle"
									dominant-baseline="central"
									font-size="5"
									fill="black"
									opacity="0.9"
									transform={centers[t.id].rotate ? `rotate(${centers[t.id].rotate}, ${centers[t.id].x}, ${centers[t.id].y - 6})` : undefined}
								>
									{#each centers[t.id].lines as line, i}
										<tspan x={centers[t.id].x + (typeof line === 'object' ? line.dx : 0)} dy={i === 0 ? 0 : 6}>{typeof line === 'object' ? line.text : line}</tspan>
									{/each}
								</text>
							{:else}
								<text
									x={centers[t.id].x}
									y={centers[t.id].y - 6}
									text-anchor="middle"
									dominant-baseline="central"
									font-size="5"
									fill="black"
									opacity="0.9"
									transform={centers[t.id].rotate ? `rotate(${centers[t.id].rotate}, ${centers[t.id].x}, ${centers[t.id].y - 6})` : undefined}
								>
									{t.name}
								</text>
							{/if}
							{#if state[t.id]?.armies > 0}
								<text
									x={centers[t.id].x}
									y={centers[t.id].y + 5}
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

	{#if campaignStats.length > 0}
		<div class="campaign-sidebar">
			<h3>Attack Probabilities</h3>
			<p class="campaign-path">
				{campaign.map((id) => territories.find((t) => t.id === id).name).join(' → ')}
			</p>
			<div class="stats-grid">
				{#each campaignStats as stat}
					<div class="stat-row">
						<span class="stat-label">{stat.label}</span>
						<span class="stat-value">{(stat.prob * 100).toFixed(2)}%</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

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

		<div class="how-to-use">
			<h3>How to Use</h3>
			<ul>
				<li>Click a color to select a team, then click territories to assign them.</li>
				<li>Click an owned territory of the same team color to add troops.</li>
				<li>Click a territory without a team color selected to select it and click again to add troops.</li>
				<li>Right-click a selected territory to toggle its card.</li>
				<li>Hold Shift and click adjacent territories to plan a campaign, or use the Campaign button below.</li>
				<li>Click the ocean to deselect everything.</li>
			</ul>
		</div>

		<div class="game-actions">
			<button
				class="action-btn campaign-btn"
				class:campaign-active={campaignMode}
				disabled={!selectedId}
				on:click={() => (campaignMode = !campaignMode)}
			>
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M5 12h14M12 5l7 7-7 7" />
				</svg>
				{campaignMode ? 'Stop Campaign' : 'Start Campaign'}
			</button>
			<button class="action-btn" on:click={exportState}>
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
				</svg>
				Export Game
			</button>
			<label class="action-btn">
				<input type="file" accept=".json" on:change={importState} style="display: none;" />
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
				</svg>
				Import Game
			</label>
			<button class="action-btn" on:click={clearSave} disabled={!hasSave}>
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M3 6h18M8 6V4h8v2M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6M10 11v6M14 11v6" />
				</svg>
				Clear Save
			</button>
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
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
	}

	.color-btn {
		width: 45px;
		height: 45px;
		border-radius: 50%;
		border: 3px solid transparent;
		cursor: pointer;
		transition:
			transform 0.2s,
			border-color 0.2s;
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

	.color-btn:active:not(.selected) {
		cursor: grabbing;
	}

	.how-to-use {
		margin-top: 30px;
		padding: 16px 20px;
		background: #1e1e1e;
		border-radius: 8px;
		text-align: left;
	}

	.how-to-use h3 {
		margin-bottom: 10px;
	}

	.how-to-use ul {
		margin: 0;
		padding-left: 20px;
		list-style: disc;
	}

	.how-to-use li {
		color: #999;
		font-size: 0.85rem;
		margin-bottom: 4px;
	}

	.campaign-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.campaign-btn.campaign-active {
		border-color: #4fc3f7;
		color: #4fc3f7;
		box-shadow: 0 0 10px rgba(79, 195, 247, 0.5);
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

	.action-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.action-btn:hover:not(:disabled) {
		background: #2a2a2a;
		border-color: #444;
		color: white;
	}

	.svg-container {
		width: 100%;
		max-width: 900px;
		background-color: #121212;
		overflow: hidden;
	}

	svg {
		width: 100%;
		height: auto;
		display: block;
	}

	path {
		cursor: pointer;
		transition:
			fill-opacity 0.2s,
			fill 0.3s;
		outline: none;
	}

	path:hover {
		fill-opacity: 0.9;
	}

	.glowing {
		filter: drop-shadow(0 0 5px gold);
	}

	.campaign-sidebar {
		width: 100%;
		max-width: 900px;
		background: #1a1a1a;
		padding: 16px;
		border-radius: 8px;
		box-sizing: border-box;
		margin-top: 20px;
	}

	@media (min-width: 1280px) {
		.campaign-sidebar {
			position: fixed;
			left: 0;
			top: 0;
			width: 260px;
			max-width: 260px;
			height: 100vh;
			overflow-y: auto;
			z-index: 100;
			border-right: 1px solid #333;
			border-radius: 0;
			margin-top: 0;
		}
	}

	.campaign-path {
		color: #4fc3f7;
		font-weight: bold;
		margin: 10px 0;
		font-size: 0.85rem;
	}

	.stats-grid {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-top: 12px;
	}

	.stat-row {
		background: #2a2a2a;
		padding: 6px 10px;
		border-radius: 4px;
		display: flex;
		justify-content: space-between;
		font-family: monospace;
		font-size: 0.8rem;
	}

	.stat-label {
		color: #aaa;
	}

	.stat-value {
		color: #fff;
		font-weight: bold;
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
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
		animation: slideUp 0.3s ease-out;
	}

	@keyframes slideUp {
		from {
			transform: translateY(10px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
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

<script lang="ts">
import { onDestroy, onMount, tick } from 'svelte';
import {
	Game,
	H,
	ITEMS,
	type ItemKey,
	LEVELS,
	loadSprites,
	type Result,
	render,
	W,
} from './engine';
import type { LevelDef } from './levels';

type Save = {
	money: number;
	maxHp: number;
	items: Record<ItemKey, number>;
	stars: Record<string, number>;
	endlessBest: Record<string, number>;
};
const SAVE_KEY = 'arithma-save-v1';
const HP_UPGRADES = [
	{ hp: 5, price: 150 },
	{ hp: 6, price: 400 },
];
const ITEM_CAP = 5;
const fresh = (): Save => ({
	money: 0,
	maxHp: 4,
	items: { dynamite: 1, emp: 1, barrier: 0, shield: 0 },
	stars: {},
	endlessBest: {},
});

let save: Save = $state(fresh());
let screen: 'map' | 'shop' | 'game' = $state('map');
let selected: LevelDef | null = $state(null);
let result: (Result & { stars: number; newBest: boolean }) | null = $state(null);
let answer = $state('');
let feedback: 'hit' | 'miss' | '' = $state('');
let busy = $state(false);

let canvas: HTMLCanvasElement | undefined = $state();
let input: HTMLInputElement | undefined = $state();
let game: Game | null = null;
let raf = 0;
let last = 0;
let paused = $state(false);

onMount(() => {
	try {
		const raw = localStorage.getItem(SAVE_KEY);
		if (raw) save = { ...fresh(), ...JSON.parse(raw) };
	} catch {}
	loadSprites();
});
onDestroy(() => typeof window !== 'undefined' && cancelAnimationFrame(raf));

function persist() {
	try {
		localStorage.setItem(SAVE_KEY, JSON.stringify(save));
	} catch {}
}

const unlocked = (lv: LevelDef) => !lv.requires || (save.stars[lv.requires] ?? 0) > 0;
const beaten = (lv: LevelDef) => (save.stars[lv.id] ?? 0) > 0;

async function start(lv: LevelDef, endless: boolean) {
	selected = lv;
	result = null;
	answer = '';
	paused = false;
	screen = 'game';
	await tick();
	game = new Game(lv, endless, save.maxHp, save.items, finish);
	last = performance.now();
	cancelAnimationFrame(raf);
	raf = requestAnimationFrame(loop);
	input?.focus();
}

function loop(now: number) {
	if (!game || !canvas) return;
	const dt = Math.min(0.05, (now - last) / 1000);
	last = now;
	if (!paused) game.update(dt);
	busy = game.busy;
	const ctx = canvas.getContext('2d');
	if (ctx) render(ctx, game);
	if (!game.done) raf = requestAnimationFrame(loop);
}

function finish(r: Result) {
	const lv = selected!;
	save.money += r.money;
	save.items = { ...r.items };
	let stars = 0;
	let newBest = false;
	if (r.endless) {
		if (r.wave > (save.endlessBest[lv.id] ?? 0)) {
			save.endlessBest[lv.id] = r.wave;
			newBest = true;
		}
	} else if (r.won) {
		// 3 stars = flawless: no damage taken and no wrong answers
		stars = r.hp >= r.maxHp && r.accuracy >= 1 ? 3 : r.hp * 2 >= r.maxHp ? 2 : 1;
		const bonus = 20 + 10 * Math.floor(Number(lv.id));
		save.money += bonus;
		r.money += bonus;
		save.stars[lv.id] = Math.max(stars, save.stars[lv.id] ?? 0);
	}
	persist();
	result = { ...r, stars, newBest };
}

function quit() {
	if (game && !game.done) game.end(false);
	cancelAnimationFrame(raf);
	game = null;
	screen = 'map';
	result = null;
}

function onKey(e: KeyboardEvent) {
	if (!game) return;
	const k = e.key.toLowerCase();
	const item = ITEMS.find((i) => i.hotkey === k);
	if (item) {
		e.preventDefault();
		if (!paused) game.useItem(item.key);
		return;
	}
	if (e.key === 'Escape') {
		paused = !paused;
		return;
	}
	if (e.key === 'Enter') {
		e.preventDefault();
		if (paused) return;
		const res = game.submit(answer);
		if (res === 'busy') return;
		feedback = res;
		answer = '';
		setTimeout(() => (feedback = ''), 300);
		return;
	}
	if (e.key.length === 1 && !/[0-9-]/.test(e.key)) e.preventDefault();
}

function buyItem(key: ItemKey, price: number) {
	if (save.money < price || save.items[key] >= ITEM_CAP) return;
	save.money -= price;
	save.items[key]++;
	persist();
}
function buyHp(up: { hp: number; price: number }) {
	if (save.money < up.price || save.maxHp !== up.hp - 1) return;
	save.money -= up.price;
	save.maxHp = up.hp;
	persist();
}
function reset() {
	if (!confirm('Erase all PEMDAS Blaster Clone progress?')) return;
	save = fresh();
	persist();
}

const pathD = $derived.by(() => {
	const pts = LEVELS.filter((l) => !l.id.includes('.')).map((l) => l.map);
	return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x * MX} ${p.y}`).join(' ');
});
// map svg is 220×100 so its units are square at the map's 2.2 aspect ratio
const MX = 2.2;
const DISTRICT_GROUND: Record<string, string> = {
	1: '#6b9f4e',
	2: '#c98a3a',
	3: '#a8876a',
	4: '#d8cfa0',
	5: '#6a5a4a',
	6: '#8a6a50',
	7: '#4a5a7a',
	8: '#7a8a6a',
	9: '#5a2a6a',
};
</script>

<svelte:head><title>PEMDAS Blaster Clone</title></svelte:head>

<div class="pemdas">
	{#if screen === 'map'}
		<header>
			<div class="spacer"></div>
			<div class="money">${save.money}</div>
			<button onclick={() => (screen = 'shop')}>Shop</button>
		</header>
		<p class="intro">
			Robots are marching down the road. Type the answer to a robot's problem and press <kbd>Enter</kbd> to shoot
			it. Wrong answers jam your gun for 2 seconds. Shoot supply crates for health, dynamite, or an EMP. Bosses
			show sub-problems you can shoot to reveal partial answers. Three stars takes a flawless run: no damage and no wrong
			answers.
		</p>
		<div class="map">
			<svg viewBox="0 0 220 100" preserveAspectRatio="none">
				<defs>
					<linearGradient id="pb-sky" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stop-color="#140f26" />
						<stop offset="1" stop-color="#6a3a52" />
					</linearGradient>
					<linearGradient id="pb-ground" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stop-color="#3e3430" />
						<stop offset="1" stop-color="#5e4a3c" />
					</linearGradient>
					<pattern id="pb-win" width="1.6" height="2" patternUnits="userSpaceOnUse">
						<rect x=".4" y=".5" width=".7" height=".9" fill="#ffd84a" opacity=".75" />
					</pattern>
				</defs>
				<!-- sky, moon, stars, distant skyline -->
				<rect width="220" height="36" fill="url(#pb-sky)" />
				<circle cx="196" cy="10" r="5" fill="#f4e9c8" />
				<circle cx="198" cy="8.5" r="4.4" fill="#2a1d3d" opacity=".25" />
				{#each Array(26) as _, i}
					<circle cx={(i * 37) % 220} cy={(i * 13) % 26} r={i % 3 ? 0.25 : 0.4} fill="#fff" opacity=".7" />
				{/each}
				<path
					d="M0 36 V30 h6 v-4 h5 v6 h4 v-9 h6 v9 h7 v-5 h5 v5 h6 v-12 h3 v-2 h3 v14 h8 v-6 h6 v6 h5 v-10 h7 v10 h9 v-4 h6 v4 h5 v-8 h4 v8 h8 v-13 h5 v13 h6 v-6 h6 v6 h8 v-9 h4 v9 h7 v-4 h6 v4 h5 v-11 h6 v11 h9 v-5 h5 v5 h6 v-7 h7 v7 h8 v-3 h6 V36Z"
					fill="#251c30"
				/>
				<rect y="36" width="220" height="64" fill="url(#pb-ground)" />

				<!-- district ground patches -->
				{#each LEVELS.filter((l) => l.district) as l}
					<ellipse cx={l.map.x * MX} cy={l.map.y - 4} rx="17" ry="8" fill={DISTRICT_GROUND[l.id]} opacity=".55" />
				{/each}

				<path class="road" d={pathD} />
				{#each LEVELS.filter((l) => l.id.includes('.')) as l}
					{@const parent = LEVELS.find((p) => p.id === l.requires)!}
					<path class="road side" d="M{parent.map.x * MX} {parent.map.y} L{l.map.x * MX} {l.map.y}" />
				{/each}

				<!-- district art: origin is bottom-center, just above the level node -->
				{#each LEVELS.filter((l) => l.district) as l}
					<g class="art" transform="translate({l.map.x * MX} {l.map.y - 6})">
						{#if l.id === '1'}
							<circle cx="-12" cy="-3.5" r="3.2" fill="#3f7a3a" />
							<rect x="-9" y="-8" width="8" height="8" fill="#e8d3a8" />
							<path d="M-10 -8 L-5 -13 L0 -8Z" fill="#b5523b" />
							<rect x="-7" y="-6" width="2" height="2" fill="#ffd84a" />
							<rect x="-4" y="-4" width="2" height="4" fill="#6b4a2a" />
							<rect x="2" y="-10" width="8" height="10" fill="#d9c7e8" />
							<path d="M1 -10 L6 -15 L11 -10Z" fill="#4a6fa5" />
							<rect x="3.5" y="-8" width="2" height="2" fill="#ffd84a" />
							<rect x="6.5" y="-8" width="2" height="2" fill="#ffd84a" />
							<rect x="5" y="-4" width="2" height="4" fill="#6b4a2a" />
							<circle cx="13" cy="-4" r="2.6" fill="#4f8a44" />
						{:else if l.id === '2'}
							{#each [-6.5, 5.5] as sx, i}
								<rect x={sx - 5} y="-5" width="10" height="5" fill="#8b6b3d" />
								<rect x={sx - 5} y="-12" width=".6" height="7" fill="#5b4325" />
								<rect x={sx + 4.4} y="-12" width=".6" height="7" fill="#5b4325" />
								{#each [0, 1, 2, 3, 4] as k}
									<path
										d="M{sx - 5 + k * 2} -13 h2 v3 a1 1 0 0 1 -2 0Z"
										fill={k % 2 ? '#fff' : i ? '#2d7d46' : '#d63031'}
									/>
								{/each}
								<circle cx={sx - 2.5} cy="-6" r="1.1" fill="#ff7043" />
								<circle cx={sx} cy="-6" r="1.1" fill="#ffd84a" />
								<circle cx={sx + 2.5} cy="-6" r="1.1" fill="#8bc34a" />
							{/each}
							<text x="0" y="-15" class="sign">× ÷</text>
						{:else if l.id === '3'}
							<rect x="-13" y="-8" width="9" height="8" fill="#a8876a" />
							<path d="M-11.5 -1 v-3 a1 1 0 0 1 2 0 v3z M-7.5 -1 v-3 a1 1 0 0 1 2 0 v3z" fill="#3a2a20" />
							<rect x="-3" y="-19" width="6" height="19" fill="#c9a27a" />
							<path d="M-4 -19 L0 -25 L4 -19Z" fill="#7a3a2a" />
							<circle cx="0" cy="-15" r="2" fill="#fff8dc" stroke="#3a2a20" stroke-width=".4" />
							<path d="M0 -15 v-1.4 M0 -15 h1" stroke="#3a2a20" stroke-width=".35" />
							<path d="M-1.2 0 v-4 a1.2 1.2 0 0 1 2.4 0 v4z" fill="#3a2a20" />
							<rect x="4" y="-10" width="9" height="10" fill="#b8967a" />
							<text x="8.5" y="-3.5" class="sign small">( )</text>
						{:else if l.id === '4'}
							<rect x="-12" y="-2" width="24" height="2" fill="#bfb69e" />
							<rect x="-11" y="-4" width="22" height="2" fill="#d6cdb4" />
							{#each [-8.5, -4.25, 0, 4.25, 8.5] as cx}
								<rect x={cx - 0.9} y="-12" width="1.8" height="8" fill="#eee7d4" />
							{/each}
							<rect x="-11" y="-13" width="22" height="1.5" fill="#d6cdb4" />
							<path d="M-12 -13 L0 -19 L12 -13Z" fill="#e0d6bc" />
							<text x="0" y="-14" class="sign small" fill="#2d7d46">$</text>
							<text x="14" y="-2" class="sign">+</text>
						{:else if l.id === '5'}
							<rect x="-11" y="-8" width="20" height="8" fill="#7a6a5a" />
							<path d="M-11 -8 V-12 L-6 -8 V-12 L-1 -8 V-12 L4 -8 V-12 L9 -8Z" fill="#5a4a3a" />
							{#each [-9, -5, -1, 3] as wx}
								<rect x={wx} y="-5.5" width="2.4" height="2" fill="#ffb142" />
							{/each}
							<rect x="9.5" y="-19" width="2.6" height="19" fill="#8a4a3a" />
							<rect x="13" y="-15" width="2" height="15" fill="#7a3a2a" />
							<circle class="smoke" cx="10.8" cy="-21" r="2.2" />
							<circle class="smoke late" cx="14" cy="-17" r="1.6" />
						{:else if l.id === '6'}
							<rect x="-14" y="-.8" width="28" height=".5" fill="#999" />
							<rect x="-14" y="-.1" width="28" height=".5" fill="#999" />
							<rect x="-12" y="-6.5" width="9" height="5" fill="#a33" />
							<rect x="-2" y="-6.5" width="9" height="5" fill="#2f6f8f" />
							{#each [-10.5, -4.5, -0.5, 5.5] as wx}
								<circle cx={wx} cy="-1.2" r="1" fill="#222" />
							{/each}
							<path d="M9 0 L10 -9 M14 0 L13 -9" stroke="#555" stroke-width=".6" />
							<rect x="8.5" y="-15" width="6" height="6" rx="1" fill="#6b8f9a" />
							<path d="M8 -15 L11.5 -18 L15 -15Z" fill="#4a6a75" />
						{:else if l.id === '7'}
							{#each [[-11, 12, 4], [-6, 19, 5], [0, 15, 4.5], [5.5, 22, 5], [11, 10, 4]] as [x, h, w]}
								<rect x={x - w / 2} y={-h} width={w} height={h} fill="#3d4a66" />
								<rect x={x - w / 2} y={-h} width={w} height={h} fill="url(#pb-win)" />
							{/each}
							<path d="M5.5 -22 V-26" stroke="#aaa" stroke-width=".4" />
							<circle class="blink" cx="5.5" cy="-26.3" r=".6" fill="#ff3b3b" />
						{:else if l.id === '8'}
							<path d="M-13 0 Q-9.5 -6 -12 -13 L-4 -13 Q-6.5 -6 -3 0Z" fill="#9aa3ad" />
							<path d="M-3 0 Q1 -7 -1.5 -16 L7 -16 Q4.5 -7 8.5 0Z" fill="#b5bdc6" />
							<circle class="smoke" cx="-8" cy="-15" r="2.2" fill="#ddd" />
							<circle class="smoke late" cx="2.8" cy="-18" r="2.6" fill="#ddd" />
							<path d="M12 -19 L9 -11 L12 -11 L9.5 -3 L15 -13 L12 -13 L14 -19Z" fill="#ffd84a" />
							<text x="-16" y="-14" class="sign small">x²</text>
						{:else if l.id === '9'}
							<rect x="-13" y="-9" width="26" height="9" fill="#2d2d40" />
							{#each [-13, -9, -5, 3, 7, 11] as cx}
								<rect x={cx} y="-11" width="2" height="2" fill="#2d2d40" />
							{/each}
							<rect x="-4.5" y="-21" width="9" height="21" fill="#3a3a55" />
							<path d="M-5.5 -21 L0 -30 L5.5 -21Z" fill="#1e1e2a" />
							<path d="M-2 0 v-4 a2 2 0 0 1 4 0 v4z" fill="#0e0e16" />
							<circle class="glow" cx="0" cy="-15" r="2" fill="#ff4be0" />
							<path d="M0 -30 V-34" stroke="#888" stroke-width=".4" />
							<circle class="blink" cx="0" cy="-34.3" r=".7" fill="#ff4be0" />
						{/if}
					</g>
				{/each}
			</svg>
			<div class="title">
				<span class="t1">PEMDAS</span>
				<span class="t2">BLASTER</span>
				<small>clone</small>
			</div>
			{#each LEVELS.filter((l) => l.district) as l}
				<span class="district" style="left:{l.map.x}%;top:{l.map.y + 8}%">{l.district}</span>
			{/each}
			{#each LEVELS as lv}
				<button
					class="node"
					class:half={lv.id.includes('.')}
					class:locked={!unlocked(lv)}
					class:done={beaten(lv)}
					class:sel={selected?.id === lv.id}
					style="left:{lv.map.x}%;top:{lv.map.y}%"
					disabled={!unlocked(lv)}
					onclick={() => (selected = lv)}
				>
					{lv.id}
					<span class="stars">{'★'.repeat(save.stars[lv.id] ?? 0)}</span>
				</button>
			{/each}
		</div>
		{#if selected}
			<div class="panel">
				<h2>Level {selected.id}: {selected.name}</h2>
				<p>{selected.desc}</p>
				<p>
					Best: {'★'.repeat(save.stars[selected.id] ?? 0) || '—'}
					{#if save.endlessBest[selected.id]}· Endless best: wave {save.endlessBest[selected.id]}{/if}
				</p>
				<button class="primary" onclick={() => start(selected!, false)}>Play</button>
				<button disabled={!beaten(selected)} title="Beat the level to unlock" onclick={() => start(selected!, true)}
					>Endless</button
				>
			</div>
		{:else}
			<div class="panel"><p>Select a level on the map.</p></div>
		{/if}
		<button class="reset" onclick={reset}>Reset progress</button>
	{:else if screen === 'shop'}
		<header>
			<h1>Shop</h1>
			<div class="money">${save.money}</div>
			<button onclick={() => (screen = 'map')}>Back to map</button>
		</header>
		<h2>Armor</h2>
		<div class="shop">
			<div class="card">
				<b>Max health: {save.maxHp}</b>
				{#each HP_UPGRADES as up}
					<button disabled={save.maxHp >= up.hp || save.maxHp !== up.hp - 1 || save.money < up.price} onclick={() => buyHp(up)}>
						{save.maxHp >= up.hp ? `✓ ${up.hp} HP` : `${up.hp} HP — $${up.price}`}
					</button>
				{/each}
			</div>
		</div>
		<h2>Items <small>(max {ITEM_CAP} each)</small></h2>
		<div class="shop">
			{#each ITEMS as it}
				<div class="card">
					<b>[{it.hotkey.toUpperCase()}] {it.name}</b>
					<span>{it.desc}</span>
					<span>Owned: {save.items[it.key]}</span>
					<button disabled={save.money < it.price || save.items[it.key] >= ITEM_CAP} onclick={() => buyItem(it.key, it.price)}
						>Buy — ${it.price}</button
					>
				</div>
			{/each}
		</div>
	{:else}
		<div class="stage">
			<canvas bind:this={canvas} width={W} height={H}></canvas>
			{#if paused && !result}
				<div class="overlay">
					<h2>Paused</h2>
					<button class="primary" onclick={() => ((paused = false), input?.focus())}>Resume</button>
					<button onclick={quit}>Quit to map</button>
				</div>
			{/if}
			{#if result}
				<div class="overlay">
					{#if result.endless}
						<h2>Reached wave {result.wave}{result.newBest ? ' — new best!' : ''}</h2>
					{:else if result.won}
						<h2>Level cleared! <span class="stars big">{'★'.repeat(result.stars)}{'☆'.repeat(3 - result.stars)}</span></h2>
					{:else}
						<h2>Destroyed</h2>
					{/if}
					<p>
						Earned ${result.money} · {result.kills} robots · {Math.round(result.accuracy * 100)}% accuracy · {result.avgSolve.toFixed(
							1,
						)}s per answer
					</p>
					<button class="primary" onclick={() => start(selected!, result!.endless)}>Retry</button>
					<button onclick={quit}>Map</button>
				</div>
			{/if}
		</div>
		<div class="controls">
			<input
				bind:this={input}
				bind:value={answer}
				onkeydown={onKey}
				onblur={() => !result && setTimeout(() => input?.focus(), 0)}
				inputmode="numeric"
				autocomplete="off"
				placeholder={busy ? '…' : 'answer + Enter'}
				class:hit={feedback === 'hit'}
				class:miss={feedback === 'miss'}
				class:busy
			/>
			<span class="hint">Q W E R items · Esc pause</span>
			<button onclick={() => (paused = true)}>Pause</button>
		</div>
	{/if}
</div>

<style>
.pemdas {
	max-width: 980px;
	margin: 0 auto;
	padding: 0 16px 40px;
	font-family: system-ui, sans-serif;
}
header {
	display: flex;
	align-items: center;
	gap: 16px;
}
header h1 {
	margin: 0.4em 0;
	flex: 1;
}
header .spacer {
	flex: 1;
	min-height: 56px;
}
.title {
	position: absolute;
	left: 2.5%;
	top: 5%;
	display: flex;
	flex-direction: column;
	line-height: 0.9;
	font-family: Impact, 'Arial Black', system-ui, sans-serif;
	letter-spacing: 0.04em;
	transform: rotate(-4deg);
	pointer-events: none;
	user-select: none;
}
.title .t1,
.title .t2 {
	font-size: clamp(22px, 5.2vw, 52px);
	background: linear-gradient(#fff6c2, #ffb142 55%, #d63031);
	-webkit-background-clip: text;
	background-clip: text;
	color: transparent;
	filter: drop-shadow(3px 3px 0 #111) drop-shadow(0 0 8px rgba(255, 75, 224, 0.5));
}
.title .t2 {
	margin-left: 0.6em;
}
.title small {
	align-self: flex-end;
	margin-top: 2px;
	font-family: system-ui, sans-serif;
	font-size: clamp(9px, 1.3vw, 13px);
	font-style: italic;
	letter-spacing: 0.2em;
	color: #d8cfe8;
	opacity: 0.8;
}
.district {
	position: absolute;
	transform: translate(-50%, 0);
	padding: 1px 6px;
	border-radius: 4px;
	background: rgba(10, 8, 20, 0.6);
	color: #f2e8c8;
	font-size: clamp(8px, 1.1vw, 11px);
	font-weight: 600;
	letter-spacing: 0.05em;
	text-transform: uppercase;
	white-space: nowrap;
	pointer-events: none;
}
.map :global(.sign) {
	font: bold 4px system-ui, sans-serif;
	fill: #ffd84a;
	text-anchor: middle;
}
.map :global(.sign.small) {
	font-size: 3px;
}
.map .art {
	filter: drop-shadow(0 0.6px 0 rgba(0, 0, 0, 0.6));
}
.map .smoke {
	fill: #9a9a9a;
	opacity: 0.6;
	transform-box: fill-box;
	transform-origin: center;
	animation: smoke 3s linear infinite;
}
.map .smoke.late {
	animation-delay: -1.5s;
}
.map .blink {
	animation: blink 1.2s steps(2) infinite;
}
.map .glow {
	animation: pulse 2s ease-in-out infinite;
}
@keyframes smoke {
	from {
		transform: translate(0, 0) scale(0.6);
		opacity: 0.7;
	}
	to {
		transform: translate(2px, -6px) scale(1.4);
		opacity: 0;
	}
}
@keyframes blink {
	50% {
		opacity: 0;
	}
}
@keyframes pulse {
	50% {
		opacity: 0.4;
	}
}
.money {
	font-weight: bold;
	color: #c99a00;
	font-size: 1.3em;
}
button {
	padding: 8px 14px;
	border-radius: 6px;
	border: 1px solid #888;
	background: #f2f2f2;
	color: #111;
	cursor: pointer;
	font: inherit;
}
button:disabled {
	opacity: 0.45;
	cursor: not-allowed;
}
button.primary {
	background: #2d7d46;
	color: white;
	border-color: #1f5a31;
}
.map {
	position: relative;
	width: 100%;
	aspect-ratio: 2.2;
	border-radius: 12px;
	background: #3e3430;
	overflow: hidden;
}
.map svg {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}
.map path.road {
	fill: none;
	stroke: #e8d9a8;
	stroke-width: 1.2;
	stroke-dasharray: 2 1.5;
	vector-effect: non-scaling-stroke;
	stroke-width: 4px;
}
.map path.side {
	stroke: #c9a0a0;
	stroke-width: 3px;
}
.node {
	position: absolute;
	transform: translate(-50%, -50%);
	width: 46px;
	height: 46px;
	border-radius: 50%;
	padding: 0;
	font-weight: bold;
	background: #fff8dc;
	border: 3px solid #333;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	line-height: 1;
}
.node.half {
	width: 38px;
	height: 38px;
	background: #ffd6d6;
	border-color: #8a1f1f;
	font-size: 0.8em;
}
.node.done {
	background: #b7f0c0;
}
.node.sel {
	outline: 4px solid #ffd84a;
}
.node.locked {
	background: #999;
}
.node .stars {
	font-size: 9px;
	color: #c99a00;
}
.panel {
	margin-top: 12px;
	padding: 12px 16px;
	border: 1px solid #ccc;
	border-radius: 8px;
}
.panel h2 {
	margin: 0 0 4px;
}
.reset {
	margin-top: 24px;
	font-size: 0.8em;
}
.shop {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 12px;
}
.card {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 12px;
	border: 1px solid #ccc;
	border-radius: 8px;
}
.stage {
	position: relative;
	margin-top: 12px;
}
canvas {
	width: 100%;
	display: block;
	border-radius: 8px;
	background: #111;
}
.overlay {
	position: absolute;
	inset: 0;
	background: rgba(0, 0, 0, 0.7);
	color: white;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 10px;
	border-radius: 8px;
	text-align: center;
	padding: 16px;
}
.stars.big {
	color: #ffd84a;
}
.controls {
	display: flex;
	gap: 12px;
	align-items: center;
	margin-top: 10px;
}
.controls input {
	flex: 1;
	max-width: 260px;
	font-size: 1.6em;
	padding: 6px 12px;
	border-radius: 8px;
	border: 3px solid #555;
	font-family: ui-monospace, Menlo, monospace;
	transition: border-color 0.1s;
}
.controls input.busy {
	background: #eee;
}
.controls input.hit {
	border-color: #2d7d46;
}
.controls input.miss {
	border-color: #d63031;
	background: #ffd6d6;
}
.hint {
	color: #888;
	font-size: 0.9em;
	flex: 1;
}
kbd {
	border: 1px solid #aaa;
	border-radius: 3px;
	padding: 0 4px;
}
</style>

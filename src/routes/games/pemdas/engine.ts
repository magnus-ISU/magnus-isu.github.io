import { LEVELS, type LevelDef, ROBOTS, type RobotType, type Spawn } from './levels';
import { type Part, type Problem, pick } from './problems';

// ---------- Drop-in sprites ----------
// Put a PNG in static/games/pemdas/ and set its path here to replace the vector drawing.
// Images are drawn with their bottom-center at the robot's feet, sized to ~SPRITE_HEIGHT * scale.
export const SPRITES: Partial<Record<RobotType | 'crate', string>> = {
	// spider: '/games/pemdas/spider.png',
};
const SPRITE_HEIGHT = 90;
const images: Partial<Record<string, HTMLImageElement>> = {};
export function loadSprites() {
	for (const [k, src] of Object.entries(SPRITES)) {
		if (!src || images[k]) continue;
		const img = new Image();
		img.src = src;
		images[k] = img;
	}
}

// ---------- Constants ----------
export const W = 960;
export const H = 600;
const ROAD_TOP = 110;
const ROAD_BOTTOM = 530;
const FIRE_TIME = 1.5;
const PART_FIRE_TIME = 0.5;
const STAGGER_TIME = 2;
const BARRIER_P = 0.82;
const CRATE_INTERVAL = 25;
const CRATE_LIFE = 18;

export type ItemKey = 'dynamite' | 'emp' | 'barrier' | 'shield';
export const ITEMS: { key: ItemKey; hotkey: string; name: string; price: number; desc: string }[] =
	[
		{
			key: 'dynamite',
			hotkey: 'q',
			name: 'Dynamite',
			price: 60,
			desc: 'Blows up robots near the front robot (bosses immune)',
		},
		{ key: 'emp', hotkey: 'w', name: 'EMP', price: 40, desc: 'Freezes all robots for 5s' },
		{
			key: 'barrier',
			hotkey: 'e',
			name: 'Barrier',
			price: 50,
			desc: 'Wall holds robots back for 10s',
		},
		{
			key: 'shield',
			hotkey: 'r',
			name: 'Shield',
			price: 75,
			desc: 'Blocks the next hit, even a boss',
		},
	];

type Robot = {
	id: number;
	type: RobotType;
	problem: Problem;
	p: number;
	lane: number;
	drop: number; // 0..1 airdrop animation progress
	dying: boolean;
	seed: number;
};
type Crate = {
	id: number;
	problem: Problem;
	p: number;
	lane: number;
	drop: number;
	life: number;
	opening: boolean;
};
type Target =
	| { kind: 'robot'; robot: Robot }
	| { kind: 'part'; robot: Robot; part: Part }
	| { kind: 'crate'; crate: Crate };
type Effect = {
	x: number;
	y: number;
	t: number;
	dur: number;
	kind: 'boom' | 'big' | 'text' | 'emp';
	text?: string;
	color?: string;
};

export type Result = {
	won: boolean;
	endless: boolean;
	hp: number;
	maxHp: number;
	money: number;
	kills: number;
	wave: number;
	accuracy: number;
	avgSolve: number;
	items: Record<ItemKey, number>;
};

let nextId = 1;

export class Game {
	level: LevelDef;
	endless: boolean;
	robots: Robot[] = [];
	crates: Crate[] = [];
	effects: Effect[] = [];
	hp: number;
	maxHp: number;
	items: Record<ItemKey, number>;
	shield = 0;
	freezeT = 0;
	barrierT = 0;
	staggerT = 0;
	fire: { target: Target; t: number; dur: number } | null = null;
	time = 0;
	waveIdx = -1;
	waveStart = 0;
	queue: { at: number; spawn: Spawn }[] = [];
	crateT = CRATE_INTERVAL * 0.6;
	speedMul = 1;
	money = 0;
	kills = 0;
	shots = 0;
	correct = 0;
	solveTimes: number[] = [];
	readyAt = 0;
	shake = 0;
	done: Result | null = null;
	onEnd: (r: Result) => void;
	message = '';
	messageT = 0;

	constructor(
		level: LevelDef,
		endless: boolean,
		maxHp: number,
		items: Record<ItemKey, number>,
		onEnd: (r: Result) => void,
	) {
		this.level = level;
		this.endless = endless;
		this.maxHp = maxHp;
		this.hp = maxHp;
		this.items = { ...items };
		this.onEnd = onEnd;
		this.startWave();
	}

	get totalWaves() {
		return this.endless ? Infinity : this.level.waves.length;
	}

	startWave() {
		this.waveIdx++;
		this.waveStart = this.time;
		if (this.endless && this.waveIdx > 0) this.speedMul *= 1.07;
		const wave = this.level.waves[this.waveIdx % this.level.waves.length];
		const spawns: Spawn[] = [];
		for (const sp of wave) for (let i = 0; i < sp.count; i++) spawns.push(sp);
		spawns.sort(() => Math.random() - 0.5);
		// bosses drop first so their escorts surround them
		spawns.sort((a, b) => Number(ROBOTS[b.type].boss) - Number(ROBOTS[a.type].boss));
		let t = this.time + 0.5;
		for (const spawn of spawns) {
			this.queue.push({ at: t, spawn });
			t += 1 + Math.random() * 1.8;
		}
		this.flash(
			this.endless ? `Wave ${this.waveIdx + 1}` : `Wave ${this.waveIdx + 1} / ${this.totalWaves}`,
		);
	}

	flash(msg: string) {
		this.message = msg;
		this.messageT = 2.2;
	}

	spawnRobot(spawn: Spawn) {
		const boss = ROBOTS[spawn.type].boss;
		this.robots.push({
			id: nextId++,
			type: spawn.type,
			problem: spawn.gen(),
			// drop between the back and halfway down the road (bosses near the back)
			p: boss ? Math.random() * 0.15 : Math.random() * 0.5,
			lane: (Math.random() * 2 - 1) * (boss ? 0.4 : 0.85),
			drop: 0,
			dying: false,
			seed: Math.random() * 100,
		});
	}

	spawnCrate() {
		this.crates.push({
			id: nextId++,
			problem: this.level.crate(),
			p: 0.25 + Math.random() * 0.4,
			lane: (Math.random() * 2 - 1) * 0.9,
			drop: 0,
			life: CRATE_LIFE,
			opening: false,
		});
	}

	get busy() {
		return this.fire !== null || this.staggerT > 0 || this.done !== null;
	}

	/** Returns 'hit' | 'miss' | 'busy' */
	submit(raw: string): 'hit' | 'miss' | 'busy' {
		if (this.busy) return 'busy';
		const n = Number(raw.trim());
		if (raw.trim() === '' || Number.isNaN(n)) return 'busy';
		this.shots++;
		const targets: { t: Target; p: number }[] = [];
		for (const rb of this.robots) {
			if (rb.dying) continue;
			if (rb.problem.answer === n) targets.push({ t: { kind: 'robot', robot: rb }, p: rb.p });
			for (const part of rb.problem.parts ?? [])
				if (!part.revealed && part.answer === n)
					targets.push({ t: { kind: 'part', robot: rb, part }, p: rb.p - 0.001 });
		}
		for (const c of this.crates)
			if (!c.opening && c.problem.answer === n)
				targets.push({ t: { kind: 'crate', crate: c }, p: c.p });
		if (!targets.length) {
			this.staggerT = STAGGER_TIME;
			this.readyAt = this.time + STAGGER_TIME;
			this.flash('Jammed!');
			return 'miss';
		}
		targets.sort((a, b) => b.p - a.p);
		const target = targets[0].t;
		this.correct++;
		this.solveTimes.push(this.time - this.readyAt);
		if (target.kind === 'robot') target.robot.dying = true;
		if (target.kind === 'crate') target.crate.opening = true;
		if (target.kind === 'part') target.part.revealed = true; // reveal immediately so the shot isn't wasted
		this.fire = { target, t: 0, dur: target.kind === 'part' ? PART_FIRE_TIME : FIRE_TIME };
		return 'hit';
	}

	useItem(key: ItemKey) {
		if (this.done || this.items[key] <= 0) return;
		const alive = this.robots.filter((r) => !r.dying);
		if (key === 'dynamite') {
			if (!alive.length) return;
			const front = alive.reduce((a, b) => (a.p > b.p ? a : b));
			const pos = this.screen(front.p, front.lane);
			this.blast(pos.x, pos.y, 160);
		} else if (key === 'emp') {
			this.freezeT = 5;
			this.effects.push({ x: W / 2, y: H / 2, t: 0, dur: 0.8, kind: 'emp' });
		} else if (key === 'barrier') this.barrierT = 10;
		else if (key === 'shield') this.shield++;
		this.items[key]--;
	}

	blast(x: number, y: number, radius: number) {
		this.effects.push({ x, y, t: 0, dur: 0.9, kind: 'big' });
		this.shake = 0.4;
		for (const rb of this.robots) {
			if (ROBOTS[rb.type].boss) continue;
			const pos = this.screen(rb.p, rb.lane);
			if (Math.hypot(pos.x - x, pos.y - y) < radius * (0.6 + rb.p * 0.6)) this.kill(rb);
		}
	}

	kill(rb: Robot) {
		const i = this.robots.indexOf(rb);
		if (i < 0) return;
		this.robots.splice(i, 1);
		const pos = this.screen(rb.p, rb.lane);
		const bounty = ROBOTS[rb.type].bounty;
		this.money += bounty;
		this.kills++;
		this.effects.push({
			x: pos.x,
			y: pos.y - 30 * this.scale(rb.p),
			t: 0,
			dur: ROBOTS[rb.type].boss ? 1.2 : 0.6,
			kind: ROBOTS[rb.type].boss ? 'big' : 'boom',
		});
		this.effects.push({
			x: pos.x,
			y: pos.y - 80 * this.scale(rb.p),
			t: 0,
			dur: 1,
			kind: 'text',
			text: `+$${bounty}`,
			color: '#ffd84a',
		});
		if (this.fire && this.fire.target.kind !== 'crate' && this.fire.target.robot === rb)
			this.fire = null;
	}

	openCrate(c: Crate) {
		this.crates.splice(this.crates.indexOf(c), 1);
		const pos = this.screen(c.p, c.lane);
		const reward = pick(['hp', 'dynamite', 'emp'] as const);
		if (reward === 'hp') {
			this.hp = Math.min(this.maxHp, this.hp + 1);
			this.effects.push({
				x: pos.x,
				y: pos.y - 40,
				t: 0,
				dur: 1.2,
				kind: 'text',
				text: '+1 ♥',
				color: '#ff6b81',
			});
		} else if (reward === 'dynamite') {
			this.blast(pos.x, pos.y, 200);
			this.effects.push({
				x: pos.x,
				y: pos.y - 60,
				t: 0,
				dur: 1.2,
				kind: 'text',
				text: 'DYNAMITE!',
				color: '#ff9f43',
			});
		} else {
			this.freezeT = 5;
			this.effects.push({ x: W / 2, y: H / 2, t: 0, dur: 0.8, kind: 'emp' });
			this.effects.push({
				x: pos.x,
				y: pos.y - 40,
				t: 0,
				dur: 1.2,
				kind: 'text',
				text: 'EMP!',
				color: '#74b9ff',
			});
		}
	}

	update(dt: number) {
		if (this.done) return;
		this.time += dt;
		this.staggerT = Math.max(0, this.staggerT - dt);
		this.freezeT = Math.max(0, this.freezeT - dt);
		this.barrierT = Math.max(0, this.barrierT - dt);
		this.shake = Math.max(0, this.shake - dt);
		this.messageT = Math.max(0, this.messageT - dt);

		// spawning
		for (let i = this.queue.length - 1; i >= 0; i--)
			if (this.queue[i].at <= this.time) {
				this.spawnRobot(this.queue[i].spawn);
				this.queue.splice(i, 1);
			}

		// crates
		this.crateT -= dt;
		if (this.crateT <= 0) {
			this.crateT = CRATE_INTERVAL * (0.8 + Math.random() * 0.4);
			this.spawnCrate();
		}
		for (const c of [...this.crates]) {
			c.drop = Math.min(1, c.drop + dt / 1.5);
			if (!c.opening) c.life -= dt;
			if (c.life <= 0) this.crates.splice(this.crates.indexOf(c), 1);
		}

		// movement
		for (const rb of [...this.robots]) {
			rb.drop = Math.min(1, rb.drop + dt / 0.9);
			if (rb.dying || rb.drop < 1 || this.freezeT > 0) continue;
			const before = rb.p;
			rb.p += (dt / this.level.walkTime) * ROBOTS[rb.type].speed * this.speedMul;
			if (this.barrierT > 0 && before <= BARRIER_P && rb.p > BARRIER_P) rb.p = BARRIER_P;
			if (rb.p >= 1) this.hit(rb);
		}

		// firing
		if (this.fire) {
			this.fire.t += dt;
			if (this.fire.t >= this.fire.dur) {
				const tg = this.fire.target;
				this.fire = null;
				this.readyAt = this.time;
				if (tg.kind === 'robot') this.kill(tg.robot);
				else if (tg.kind === 'crate') this.openCrate(tg.crate);
			}
		}

		// effects
		for (const e of this.effects) e.t += dt;
		this.effects = this.effects.filter((e) => e.t < e.dur);

		// waves: next wave comes immediately on clear, or when time runs out
		const lastWave = !this.endless && this.waveIdx >= this.level.waves.length - 1;
		const cleared = this.queue.length === 0 && this.robots.length === 0;
		if (cleared && lastWave) return this.end(true);
		if (!lastWave && (cleared || this.time - this.waveStart >= this.level.waveTime))
			this.startWave();
	}

	hit(rb: Robot) {
		this.robots.splice(this.robots.indexOf(rb), 1);
		const pos = this.screen(1, rb.lane);
		this.effects.push({ x: pos.x, y: pos.y - 40, t: 0, dur: 0.8, kind: 'big' });
		this.shake = 0.5;
		if (this.shield > 0) {
			this.shield--;
			this.flash('Shield blocked!');
			return;
		}
		this.hp = Math.max(0, this.hp - ROBOTS[rb.type].damage);
		if (this.hp <= 0) this.end(false);
	}

	end(won: boolean) {
		const avg = this.solveTimes.length
			? this.solveTimes.reduce((a, b) => a + b, 0) / this.solveTimes.length
			: 0;
		this.done = {
			won,
			endless: this.endless,
			hp: this.hp,
			maxHp: this.maxHp,
			money: this.money,
			kills: this.kills,
			wave: this.waveIdx + 1,
			accuracy: this.shots ? this.correct / this.shots : 0,
			avgSolve: avg,
			items: this.items,
		};
		this.onEnd(this.done);
	}

	// ---------- geometry ----------
	scale(p: number) {
		return 0.45 + 0.7 * p;
	}
	halfWidth(p: number) {
		return 90 + 340 * p;
	}
	screen(p: number, lane: number) {
		return {
			x: W / 2 + lane * this.halfWidth(p) * 0.85,
			y: ROAD_TOP + (ROAD_BOTTOM - ROAD_TOP) * p,
		};
	}
}

// ================= Rendering =================

export function render(ctx: CanvasRenderingContext2D, g: Game) {
	ctx.save();
	if (g.shake > 0)
		ctx.translate((Math.random() - 0.5) * 14 * g.shake, (Math.random() - 0.5) * 14 * g.shake);
	drawBackground(ctx, g);

	if (g.barrierT > 0) drawBarrier(ctx, g);

	type Drawable = { p: number; draw: () => void };
	const list: Drawable[] = [];
	const blocks: LabelBlock[] = [];
	for (const c of g.crates) {
		list.push({ p: c.p, draw: () => drawCrate(ctx, g, c) });
		if (c.drop >= 1) blocks.push(crateBlock(ctx, g, c));
	}
	for (const rb of g.robots) {
		list.push({ p: rb.p, draw: () => drawRobotAt(ctx, g, rb) });
		blocks.push(robotBlock(ctx, g, rb));
	}
	list.sort((a, b) => a.p - b.p);
	for (const d of list) d.draw();
	drawLabels(ctx, g, blocks);

	drawEffects(ctx, g);
	drawGun(ctx, g);
	if (g.freezeT > 0) {
		ctx.fillStyle = `rgba(116,185,255,${0.12 + 0.05 * Math.sin(g.time * 10)})`;
		ctx.fillRect(0, 0, W, H);
	}
	ctx.restore();
	drawHud(ctx, g);
}

function drawBackground(ctx: CanvasRenderingContext2D, g: Game) {
	const sky = ctx.createLinearGradient(0, 0, 0, ROAD_TOP + 40);
	sky.addColorStop(0, '#1b1530');
	sky.addColorStop(1, '#5c3a4a');
	ctx.fillStyle = sky;
	ctx.fillRect(0, 0, W, H);
	// ruined skyline
	ctx.fillStyle = '#2a2033';
	let x = 0;
	let i = 0;
	while (x < W) {
		const w = 30 + ((i * 37) % 50);
		const h = 25 + ((i * 53) % 60);
		ctx.fillRect(x, ROAD_TOP - h + 10, w - 4, h);
		x += w;
		i++;
	}
	// ground
	const ground = ctx.createLinearGradient(0, ROAD_TOP, 0, H);
	ground.addColorStop(0, '#4a3b32');
	ground.addColorStop(1, '#6b5444');
	ctx.fillStyle = ground;
	ctx.fillRect(0, ROAD_TOP, W, H - ROAD_TOP);
	// road
	const tl = g.screen(0, -1.18),
		tr = g.screen(0, 1.18),
		bl = g.screen(1.15, -1.18),
		br = g.screen(1.15, 1.18);
	ctx.fillStyle = '#3a3a40';
	ctx.beginPath();
	ctx.moveTo(tl.x, tl.y);
	ctx.lineTo(tr.x, tr.y);
	ctx.lineTo(br.x, br.y);
	ctx.lineTo(bl.x, bl.y);
	ctx.fill();
	// edge lines
	ctx.strokeStyle = '#c9b458';
	ctx.lineWidth = 3;
	for (const side of [-1.12, 1.12]) {
		const a = g.screen(0, side),
			b = g.screen(1.15, side);
		ctx.beginPath();
		ctx.moveTo(a.x, a.y);
		ctx.lineTo(b.x, b.y);
		ctx.stroke();
	}
	// center dashes
	ctx.fillStyle = '#ddd';
	for (let p = 0; p < 1.1; p += 0.08) {
		const a = g.screen(p, 0),
			b = g.screen(p + 0.035, 0);
		const w = 2 + 4 * p;
		ctx.fillRect(a.x - w / 2, a.y, w, b.y - a.y);
	}
	// debris
	ctx.fillStyle = '#2b2b30';
	for (let k = 0; k < 14; k++) {
		const p = (k * 0.137) % 1;
		const side = k % 2 ? 1.35 + (k % 3) * 0.2 : -1.35 - (k % 3) * 0.2;
		const pos = g.screen(p, side);
		const s = g.scale(p);
		ctx.fillRect(pos.x - 12 * s, pos.y - 8 * s, 24 * s, 8 * s);
	}
	// sandbag line at the player
	ctx.fillStyle = '#8a7a5a';
	for (let k = 0; k < 12; k++) {
		ctx.beginPath();
		ctx.ellipse(60 + k * 77, ROAD_BOTTOM + 38, 42, 16, 0, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.strokeStyle = '#6a5a3a';
	ctx.lineWidth = 2;
	for (let k = 0; k < 12; k++) {
		ctx.beginPath();
		ctx.ellipse(60 + k * 77, ROAD_BOTTOM + 38, 42, 16, 0, 0, Math.PI * 2);
		ctx.stroke();
	}
}

function drawBarrier(ctx: CanvasRenderingContext2D, g: Game) {
	const a = g.screen(BARRIER_P, -1.15),
		b = g.screen(BARRIER_P, 1.15);
	const alpha = g.barrierT < 2 ? 0.4 + 0.4 * Math.sin(g.time * 20) : 0.8;
	ctx.fillStyle = `rgba(0,230,255,${alpha * 0.3})`;
	ctx.fillRect(a.x, a.y - 60, b.x - a.x, 60);
	ctx.strokeStyle = `rgba(120,240,255,${alpha})`;
	ctx.lineWidth = 3;
	for (let y = 0; y <= 60; y += 15) {
		ctx.beginPath();
		ctx.moveTo(a.x, a.y - y);
		ctx.lineTo(b.x, b.y - y);
		ctx.stroke();
	}
}

function dropOffset(drop: number) {
	return -420 * (1 - drop) ** 2;
}

function drawRobotAt(ctx: CanvasRenderingContext2D, g: Game, rb: Robot) {
	const pos = g.screen(rb.p, rb.lane);
	const s = g.scale(rb.p) * ROBOTS[rb.type].size;
	const y = pos.y + dropOffset(rb.drop);
	// shadow
	ctx.fillStyle = 'rgba(0,0,0,0.35)';
	ctx.beginPath();
	ctx.ellipse(pos.x, pos.y, 26 * s * (0.4 + 0.6 * rb.drop), 7 * s, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.save();
	ctx.translate(pos.x, y);
	if (rb.drop < 1) drawThruster(ctx, s);
	const walking = rb.drop >= 1 && !rb.dying && g.freezeT <= 0;
	const t = walking ? g.time * (rb.type === 'spider' ? 14 : 5) + rb.seed : rb.seed;
	if (rb.dying) {
		ctx.translate((Math.random() - 0.5) * 4, 0);
		ctx.globalAlpha = 0.6 + 0.4 * Math.sin(g.time * 40);
	}
	const img = images[rb.type];
	if (img?.complete && img.naturalWidth) {
		const h = SPRITE_HEIGHT * s;
		const w = (h * img.naturalWidth) / img.naturalHeight;
		ctx.drawImage(img, -w / 2, -h + Math.sin(t) * 2 * s, w, h);
	} else {
		ctx.scale(s, s);
		DRAW[rb.type](ctx, t);
	}
	ctx.restore();
}

function drawThruster(ctx: CanvasRenderingContext2D, s: number) {
	ctx.fillStyle = `rgba(255,${150 + Math.random() * 80},50,0.8)`;
	for (const dx of [-12, 12]) {
		ctx.beginPath();
		ctx.moveTo(dx * s - 6 * s, 0);
		ctx.lineTo(dx * s + 6 * s, 0);
		ctx.lineTo(dx * s, (20 + Math.random() * 14) * s);
		ctx.fill();
	}
}

// ---------- Robot vector art (origin = feet, units ≈ px at scale 1) ----------
type C2D = CanvasRenderingContext2D;
type Fill = string | CanvasGradient;
type Ramp = [string, string, string];
const INK = '#111318';

const rr = (ctx: C2D, x: number, y: number, w: number, h: number, r: number) => {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, r);
	ctx.fill();
};
function vgrad(ctx: C2D, y0: number, y1: number, stops: string[]) {
	const g = ctx.createLinearGradient(0, y0, 0, y1);
	for (const [i, c] of stops.entries()) g.addColorStop(i / (stops.length - 1), c);
	return g;
}
/** fill the current path and give it an ink outline */
function ink(ctx: C2D, fill: Fill, lw = 2) {
	ctx.fillStyle = fill;
	ctx.fill();
	if (lw) {
		ctx.lineJoin = 'round';
		ctx.lineWidth = lw;
		ctx.strokeStyle = INK;
		ctx.stroke();
	}
}
/** shaded, outlined armor plate with a specular edge */
function plate(ctx: C2D, x: number, y: number, w: number, h: number, r: number, c: Ramp, lw = 2) {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, r);
	ink(ctx, vgrad(ctx, y, y + h, c), lw);
	const inset = Math.max(r, 2.5);
	if (w > inset * 2 + 2) {
		ctx.strokeStyle = 'rgba(255,255,255,0.4)';
		ctx.lineWidth = 1.3;
		ctx.beginPath();
		ctx.moveTo(x + inset, y + 2.2);
		ctx.lineTo(x + w - inset, y + 2.2);
		ctx.stroke();
	}
}
function poly(ctx: C2D, pts: number[], fill: Fill, lw = 2) {
	ctx.beginPath();
	ctx.moveTo(pts[0], pts[1]);
	for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
	ctx.closePath();
	ink(ctx, fill, lw);
}
function circ(ctx: C2D, x: number, y: number, r: number, fill: Fill, lw = 2) {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ink(ctx, fill, lw);
}
/** outlined articulated limb through the given points */
function limb(ctx: C2D, pts: number[], w: number, color: string) {
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.beginPath();
	ctx.moveTo(pts[0], pts[1]);
	for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
	ctx.strokeStyle = INK;
	ctx.lineWidth = w + 4;
	ctx.stroke();
	ctx.strokeStyle = color;
	ctx.lineWidth = w;
	ctx.stroke();
	ctx.strokeStyle = 'rgba(255,255,255,0.22)';
	ctx.lineWidth = Math.max(1, w * 0.25);
	ctx.stroke();
	ctx.lineCap = 'butt';
}
function joint(ctx: C2D, x: number, y: number, r: number, c = '#3a3f47') {
	circ(ctx, x, y, r, c, 1.5);
	ctx.fillStyle = 'rgba(255,255,255,0.35)';
	ctx.beginPath();
	ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2);
	ctx.fill();
}
function rivets(ctx: C2D, pts: number[], r = 1.1) {
	for (let i = 0; i < pts.length; i += 2) {
		ctx.fillStyle = 'rgba(0,0,0,0.5)';
		ctx.beginPath();
		ctx.arc(pts[i], pts[i + 1], r, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = 'rgba(255,255,255,0.45)';
		ctx.beginPath();
		ctx.arc(pts[i] - r * 0.3, pts[i + 1] - r * 0.3, r * 0.45, 0, Math.PI * 2);
		ctx.fill();
	}
}
function hazard(ctx: C2D, x: number, y: number, w: number, h: number) {
	ctx.save();
	ctx.beginPath();
	ctx.rect(x, y, w, h);
	ctx.clip();
	ctx.fillStyle = '#ffc61a';
	ctx.fillRect(x, y, w, h);
	ctx.fillStyle = '#1a1a1a';
	for (let k = x - h; k < x + w; k += h * 1.8) {
		ctx.beginPath();
		ctx.moveTo(k, y + h);
		ctx.lineTo(k + h, y);
		ctx.lineTo(k + h * 1.9, y);
		ctx.lineTo(k + h * 0.9, y + h);
		ctx.fill();
	}
	ctx.restore();
	ctx.strokeStyle = INK;
	ctx.lineWidth = 1.5;
	ctx.strokeRect(x, y, w, h);
}
const eye = (ctx: C2D, x: number, y: number, r: number, c = '#ff3b3b') => {
	ctx.fillStyle = c;
	ctx.shadowColor = c;
	ctx.shadowBlur = 10;
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fill();
	ctx.shadowBlur = 0;
	ctx.fillStyle = 'rgba(255,255,255,0.85)';
	ctx.beginPath();
	ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2);
	ctx.fill();
};
/** dark visor with a glowing slit */
function visor(ctx: C2D, x: number, y: number, w: number, h: number, c: string) {
	plate(ctx, x, y, w, h, h / 2, ['#2a2d33', '#101115', '#000'], 1.5);
	ctx.fillStyle = c;
	ctx.shadowColor = c;
	ctx.shadowBlur = 8;
	rr(ctx, x + 2, y + h / 2 - 1.2, w - 4, 2.4, 1.2);
	ctx.shadowBlur = 0;
}

const GREY: Ramp = ['#c7ced8', '#7d8794', '#3e444d'];
const DARK: Ramp = ['#5d636d', '#2e3238', '#15171b'];

/** label anchor height above the feet for each robot, at scale 1 */
const HEAD: Record<RobotType, number> = {
	spider: 46,
	janitor: 76,
	trooper: 104,
	brute: 96,
	juggernaut: 100,
	titan: 150,
	overlord: 182,
};

const DRAW: Record<RobotType, (ctx: C2D, t: number) => void> = {
	spider(ctx, t) {
		// legs (behind body)
		for (let i = 0; i < 3; i++)
			for (const side of [-1, 1]) {
				const ph = Math.sin(t + i * 2.1 + (side > 0 ? Math.PI : 0));
				const lift = Math.max(0, ph) * 5;
				const hx = side * (5 + i * 3);
				const kx = side * (19 + i * 5);
				const fx = side * (25 + i * 7);
				limb(ctx, [hx, -20, kx, -36 + ph * 3, fx, -lift], 2.6, i === 1 ? '#5b636e' : '#7a8490');
				joint(ctx, kx, -36 + ph * 3, 2.2);
			}
		// abdomen
		ctx.beginPath();
		ctx.ellipse(0, -25, 15, 12, 0, 0, Math.PI * 2);
		ink(ctx, vgrad(ctx, -37, -13, GREY));
		hazard(ctx, -10, -31, 20, 3.5);
		// thorax / head
		ctx.beginPath();
		ctx.ellipse(0, -17, 11, 7, 0, 0, Math.PI * 2);
		ink(ctx, vgrad(ctx, -24, -10, DARK));
		eye(ctx, -5, -18, 2.4);
		eye(ctx, 5, -18, 2.4);
		eye(ctx, 0, -14.5, 1.7);
		// antennae
		const blink = Math.sin(t * 0.8) > 0.6;
		for (const side of [-1, 1]) {
			limb(ctx, [side * 4, -35, side * 7, -42], 1, '#999');
			eye(ctx, side * 7, -43, 1.5, blink ? '#ff3b3b' : '#702020');
		}
	},
	janitor(ctx, t) {
		const bob = Math.abs(Math.sin(t)) * 2;
		const sw = Math.sin(t) * 4;
		// mop
		limb(ctx, [20, -50 - bob, 30 + sw, -5], 2.2, '#b07a45');
		ctx.strokeStyle = '#e2dac2';
		ctx.lineWidth = 2;
		for (let k = 0; k < 7; k++) {
			ctx.beginPath();
			ctx.moveTo(23 + sw + k * 2.3, -6);
			ctx.lineTo(22 + sw + k * 2.6 + Math.sin(t + k) * 1.5, 0);
			ctx.stroke();
		}
		plate(ctx, 22 + sw, -9, 16, 4, 1.5, GREY, 1.5);
		// wheels
		for (const x of [-13, 13]) {
			circ(ctx, x, -7, 7, '#22252a');
			circ(ctx, x, -7, 3, '#8a929c', 1.5);
			ctx.strokeStyle = '#8a929c';
			ctx.lineWidth = 1.2;
			const a = t * (x < 0 ? 1 : 1.1);
			ctx.beginPath();
			ctx.moveTo(x + Math.cos(a) * 6, -7 + Math.sin(a) * 6);
			ctx.lineTo(x - Math.cos(a) * 6, -7 - Math.sin(a) * 6);
			ctx.stroke();
		}
		ctx.translate(0, -bob);
		plate(ctx, -22, -16, 44, 8, 3, DARK);
		// bucket body
		poly(
			ctx,
			[-20, -50, 20, -50, 17, -14, -17, -14],
			vgrad(ctx, -50, -14, ['#6ff0de', '#22a594', '#0f5c53']),
		);
		hazard(ctx, -18, -27, 36, 5);
		rivets(ctx, [-15, -44, 15, -44, -14, -19, 14, -19]);
		ctx.beginPath();
		ctx.ellipse(0, -50, 20, 3, 0, 0, Math.PI * 2);
		ink(ctx, '#0e4e46', 1.5);
		// left arm with spray bottle
		limb(ctx, [-17, -40, -25, -33, -25, -24], 3, '#9aa3ad');
		joint(ctx, -25, -33, 2.4);
		plate(ctx, -30, -26, 9, 12, 2, ['#ffe08a', '#f0b429', '#a06f0a'], 1.5);
		plate(ctx, -28, -30, 5, 4, 1, DARK, 1);
		// right arm on the mop
		limb(ctx, [17, -40, 25, -44, 21, -50], 3, '#9aa3ad');
		joint(ctx, 25, -44, 2.4);
		// glass dome head
		ctx.beginPath();
		ctx.arc(0, -50, 14, Math.PI, 0);
		ctx.closePath();
		ink(ctx, vgrad(ctx, -64, -50, ['rgba(220,245,255,0.95)', 'rgba(80,140,185,0.9)']));
		eye(ctx, Math.sin(t * 0.6) * 6, -55, 3.2, '#ffd84a');
		ctx.strokeStyle = 'rgba(255,255,255,0.8)';
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.arc(0, -50, 10, Math.PI * 1.15, Math.PI * 1.45);
		ctx.stroke();
		// beacon
		plate(ctx, -3.5, -68, 7, 5, 2, DARK, 1.5);
		eye(ctx, 0, -69, 2.8, Math.sin(t * 3) > 0 ? '#ff9f1a' : '#7a4a10');
	},
	trooper(ctx, t) {
		const l = Math.sin(t) * 6;
		const bob = Math.abs(Math.cos(t)) * 1.5;
		const legC = '#3f5b3a';
		for (const side of [-1, 1]) {
			const lift = Math.max(0, side * l);
			const ky = -18 - lift * 0.6;
			const fy = -3 - lift * 0.8;
			limb(ctx, [side * 7, -38, side * 9, ky, side * 8, fy], 6, legC);
			plate(ctx, side * 9 - 5, ky - 5, 10, 9, 3, ['#8fc27a', '#5c8a4f', '#2f4a2a'], 1.5);
			plate(ctx, side * 8 - 7, fy - 3, 14, 6, 2, DARK, 1.5);
		}
		ctx.translate(0, -bob);
		plate(ctx, -12, -44, 24, 9, 3, DARK);
		// torso
		poly(
			ctx,
			[-18, -80, 18, -80, 14, -42, -14, -42],
			vgrad(ctx, -80, -42, ['#9fd48a', '#5c8a4f', '#2a4426']),
		);
		plate(ctx, -11, -74, 22, 15, 4, ['#b5e09f', '#6c9f5c', '#3e6234']);
		ctx.beginPath();
		ctx.moveTo(0, -71);
		ctx.lineTo(4, -64);
		ctx.lineTo(0, -61);
		ctx.lineTo(-4, -64);
		ctx.closePath();
		ink(ctx, '#ffd84a', 1);
		plate(ctx, -14, -48, 28, 5, 1.5, DARK, 1.5);
		rivets(ctx, [-10, -77, 10, -77]);
		// left arm hanging
		limb(ctx, [-20, -74, -25, -60, -23, -48], 5, legC);
		joint(ctx, -25, -60, 3);
		circ(ctx, -23, -46, 3.6, '#2e3238', 1.5);
		// right arm with rifle
		limb(ctx, [20, -74, 25, -62, 14, -55], 5, legC);
		joint(ctx, 25, -62, 3);
		ctx.save();
		ctx.translate(14, -56);
		ctx.rotate(0.5);
		plate(ctx, -14, -3.5, 28, 7, 2, DARK, 1.5);
		plate(ctx, 13, -2, 12, 4, 1, GREY, 1.2);
		plate(ctx, -3, 3, 5, 8, 1, DARK, 1.2);
		ctx.restore();
		circ(ctx, 14, -55, 3.6, '#2e3238', 1.5);
		// shoulder pads
		for (const side of [-1, 1]) {
			ctx.beginPath();
			ctx.ellipse(side * 19, -77, 8, 6, 0, 0, Math.PI * 2);
			ink(ctx, vgrad(ctx, -83, -71, ['#b5e09f', '#5c8a4f', '#2a4426']));
		}
		// head
		plate(ctx, -4, -84, 8, 5, 1, DARK, 1.5);
		plate(ctx, -11, -100, 22, 18, 7, ['#a9da94', '#5c8a4f', '#2a4426']);
		visor(ctx, -9, -94, 18, 7, '#ff3b3b');
		plate(ctx, -6, -87, 12, 3, 1, DARK, 1);
		limb(ctx, [7, -99, 9, -108], 1.2, '#888');
		eye(ctx, 9, -109, 1.8, Math.sin(t * 0.9) > 0 ? '#ff3b3b' : '#702020');
	},
	brute(ctx, t) {
		const l = Math.sin(t) * 5;
		const legC = '#6e5120';
		for (const side of [-1, 1]) {
			const lift = Math.max(0, side * l);
			limb(ctx, [side * 12, -30, side * 16, -17 - lift * 0.6, side * 14, -5 - lift], 10, legC);
			joint(ctx, side * 16, -17 - lift * 0.6, 4.5);
			plate(ctx, side * 14 - 11, -9 - lift, 22, 9, 3, DARK);
		}
		const bob = Math.abs(Math.cos(t)) * 2;
		ctx.translate(0, -bob);
		// exhaust stacks + smoke
		for (const side of [-1, 1]) {
			plate(ctx, side * 20 - 4, -94, 8, 18, 2, GREY, 1.5);
			const k = (t * 0.6 + (side > 0 ? 0.5 : 0)) % 1;
			ctx.fillStyle = `rgba(90,90,90,${0.5 * (1 - k)})`;
			ctx.beginPath();
			ctx.arc(side * 20 + side * k * 6, -98 - k * 18, 3 + k * 5, 0, Math.PI * 2);
			ctx.fill();
		}
		// torso
		ctx.beginPath();
		ctx.roundRect(-30, -80, 60, 52, 14);
		ink(ctx, vgrad(ctx, -80, -28, ['#ffd47a', '#d99a2b', '#7a4a08']), 2.5);
		plate(ctx, -17, -64, 34, 18, 3, ['#3a3a3a', '#1e1e1e', '#0a0a0a']);
		ctx.strokeStyle = '#5a5a5a';
		ctx.lineWidth = 1.5;
		for (let i = 0; i < 4; i++) {
			ctx.beginPath();
			ctx.moveTo(-14, -60 + i * 4);
			ctx.lineTo(14, -60 + i * 4);
			ctx.stroke();
		}
		hazard(ctx, -24, -39, 48, 6);
		rivets(ctx, [-24, -74, 24, -74, -24, -44, 24, -44], 1.4);
		// sunk head with sweeping eye
		plate(ctx, -13, -92, 26, 16, 5, ['#f2b64a', '#c4861f', '#6a4208']);
		visor(ctx, -10, -87, 20, 6, '#ff3b3b');
		eye(ctx, Math.sin(t * 0.5) * 6, -84, 2.8);
		// arms
		for (const side of [-1, 1]) {
			const sw = side * l;
			circ(ctx, side * 30, -72, 11, vgrad(ctx, -83, -61, ['#ffd47a', '#d99a2b', '#7a4a08']));
			limb(ctx, [side * 33, -68, side * 43, -56 - sw * 0.5, side * 41, -42 - sw], 8, legC);
			joint(ctx, side * 43, -56 - sw * 0.5, 4.5);
			plate(ctx, side * 41 - 12, -44 - sw, 24, 20, 6, GREY, 2.5);
			ctx.strokeStyle = 'rgba(0,0,0,0.45)';
			ctx.lineWidth = 1.5;
			for (const dx of [-5, 0, 5]) {
				ctx.beginPath();
				ctx.moveTo(side * 41 + dx, -38 - sw);
				ctx.lineTo(side * 41 + dx, -27 - sw);
				ctx.stroke();
			}
		}
	},
	juggernaut(ctx, t) {
		// tread
		plate(ctx, -46, -26, 92, 26, 12, DARK, 2.5);
		ctx.fillStyle = '#4a4f57';
		const off = (t * 6) % 8;
		for (let x = -38 + off; x < 38; x += 8) ctx.fillRect(x, -26, 3, 3);
		for (let i = 0; i < 5; i++) {
			const x = -32 + i * 16;
			circ(ctx, x, -12, 7, vgrad(ctx, -19, -5, GREY), 1.5);
			circ(ctx, x, -12, 2.5, '#2e3238', 1);
			ctx.strokeStyle = INK;
			ctx.lineWidth = 1.2;
			ctx.beginPath();
			ctx.moveTo(x + Math.cos(t) * 6, -12 + Math.sin(t) * 6);
			ctx.lineTo(x - Math.cos(t) * 6, -12 - Math.sin(t) * 6);
			ctx.stroke();
		}
		const PURPLE: Ramp = ['#b88cf0', '#6b3fa0', '#2e1650'];
		// hull
		poly(ctx, [-40, -30, 40, -30, 34, -62, -34, -62], vgrad(ctx, -62, -30, PURPLE), 2.5);
		hazard(ctx, -30, -36, 60, 4);
		rivets(ctx, [-30, -56, -15, -56, 15, -56, 30, -56]);
		// core
		circ(ctx, 0, -48, 8, '#1a1022');
		eye(ctx, 0, -48, 5 + Math.sin(t * 2), '#4bf0ff');
		// shoulder cannon pods (muzzles facing the player)
		for (const side of [-1, 1]) {
			plate(ctx, side * 38 - 12, -76, 24, 18, 5, GREY, 2);
			for (const dy of [-71, -63]) {
				circ(ctx, side * 38 - 4, dy + 1.5, 3, '#0a0a0a', 1);
				circ(ctx, side * 38 + 4, dy + 1.5, 3, '#0a0a0a', 1);
			}
		}
		// turret
		plate(ctx, -24, -82, 48, 24, 8, PURPLE, 2.5);
		// head
		plate(ctx, -16, -98, 32, 18, 6, ['#c9a5f5', '#8455c2', '#3e2066']);
		visor(ctx, -12, -93, 24, 8, '#ff3b3b');
		eye(ctx, -6, -89, 2.8);
		eye(ctx, 6, -89, 2.8);
	},
	titan(ctx, t) {
		const l = Math.sin(t) * 6;
		const RED: Ramp = ['#ff7a6b', '#b33939', '#4e1010'];
		for (const side of [-1, 1]) {
			const lift = Math.max(0, side * l);
			const ky = -30 - lift * 0.6;
			limb(ctx, [side * 14, -58, side * 18, ky, side * 16, -8 - lift], 12, '#5a1e1e');
			plate(ctx, side * 18 - 9, ky - 7, 18, 13, 4, RED);
			plate(ctx, side * 16 - 14, -11 - lift, 28, 11, 4, DARK);
		}
		const bob = Math.abs(Math.cos(t)) * 2;
		ctx.translate(0, -bob);
		plate(ctx, -20, -64, 40, 12, 4, DARK);
		// torso
		poly(ctx, [-36, -112, 36, -112, 28, -60, -28, -60], vgrad(ctx, -112, -60, RED), 2.5);
		for (let i = 0; i < 2; i++)
			plate(ctx, -13, -74 + i * 7, 26, 6, 2, ['#8a2a2a', '#5a1616', '#2a0808'], 1.3);
		// reactor
		const pulse = 0.5 + 0.5 * Math.sin(t * 1.5);
		circ(ctx, 0, -92, 12, '#2a1010', 2);
		eye(ctx, 0, -92, 7 + pulse * 2, '#ffb142');
		rivets(ctx, [-28, -106, 28, -106, -9, -103, 9, -103], 1.4);
		// spiked pauldrons
		for (const side of [-1, 1]) {
			poly(
				ctx,
				[side * 44, -116, side * 50, -134, side * 54, -114],
				vgrad(ctx, -134, -114, GREY),
				1.5,
			);
			poly(
				ctx,
				[side * 26, -114, side * 54, -118, side * 60, -96, side * 36, -92],
				vgrad(ctx, -118, -92, RED),
				2.5,
			);
		}
		// arms with forearm cannons
		for (const side of [-1, 1]) {
			const sw = side * l;
			limb(ctx, [side * 48, -98, side * 54, -78 - sw * 0.4, side * 52, -62 - sw], 9, '#5a1e1e');
			joint(ctx, side * 54, -78 - sw * 0.4, 5);
			plate(ctx, side * 52 - 9, -70 - sw, 18, 28, 4, GREY);
			circ(ctx, side * 52, -44 - sw, 4.5, '#0a0a0a', 1.5);
			eye(ctx, side * 52, -44 - sw, 2, '#ff9f43');
		}
		// head
		plate(ctx, -16, -138, 32, 26, 7, RED);
		poly(ctx, [-4, -137, 0, -150, 4, -137], vgrad(ctx, -150, -137, GREY), 1.5);
		visor(ctx, -12, -130, 24, 8, '#ff3b3b');
		eye(ctx, -5, -126, 2.8);
		eye(ctx, 5, -126, 2.8);
		ctx.strokeStyle = 'rgba(0,0,0,0.5)';
		ctx.lineWidth = 1.3;
		for (const dx of [-6, -2, 2, 6]) {
			ctx.beginPath();
			ctx.moveTo(dx, -119);
			ctx.lineTo(dx, -114);
			ctx.stroke();
		}
	},
	overlord(ctx, t) {
		const hover = Math.sin(t * 0.7) * 4;
		const MAG = '#ff4be0';
		const NIGHT: Ramp = ['#56567a', '#2d2d40', '#101018'];
		// ground glow
		const glow = ctx.createRadialGradient(0, -2, 2, 0, -2, 50);
		glow.addColorStop(0, 'rgba(255,75,224,0.45)');
		glow.addColorStop(1, 'rgba(255,75,224,0)');
		ctx.fillStyle = glow;
		ctx.beginPath();
		ctx.ellipse(0, -2, 50, 12, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.translate(0, hover - 14);
		// cape
		const wave = Math.sin(t * 1.3) * 4;
		poly(
			ctx,
			[-40, -104, 40, -104, 62 + wave, -6, 30, 0, 0, -8, -30, 0, -62 - wave, -6],
			vgrad(ctx, -104, 0, ['#5a2a80', '#2a1640', '#0e061a']),
			2.5,
		);
		// hover jets
		for (const side of [-1, 1]) {
			ctx.fillStyle = `rgba(255,120,230,${0.6 + Math.random() * 0.3})`;
			ctx.beginPath();
			ctx.moveTo(side * 20 - 6, -10);
			ctx.lineTo(side * 20 + 6, -10);
			ctx.lineTo(side * 20, 6 + Math.random() * 8);
			ctx.fill();
			plate(ctx, side * 20 - 9, -24, 18, 14, 4, DARK);
		}
		poly(ctx, [-34, -42, 34, -42, 26, -16, -26, -16], vgrad(ctx, -42, -16, NIGHT), 2.5);
		// torso
		ctx.beginPath();
		ctx.roundRect(-42, -108, 84, 70, 16);
		ink(ctx, vgrad(ctx, -108, -38, NIGHT), 2.5);
		// circuit traces
		ctx.strokeStyle = MAG;
		ctx.shadowColor = MAG;
		ctx.shadowBlur = 6;
		ctx.lineWidth = 1.8;
		for (const side of [-1, 1]) {
			ctx.beginPath();
			ctx.moveTo(side * 10, -74);
			ctx.lineTo(side * 24, -74);
			ctx.lineTo(side * 30, -86);
			ctx.lineTo(side * 34, -86);
			ctx.moveTo(side * 8, -66);
			ctx.lineTo(side * 18, -56);
			ctx.lineTo(side * 32, -56);
			ctx.stroke();
		}
		ctx.shadowBlur = 0;
		// hex core
		const hex: number[] = [];
		for (let i = 0; i < 6; i++)
			hex.push(Math.cos((i * Math.PI) / 3) * 11, -72 + Math.sin((i * Math.PI) / 3) * 11);
		poly(ctx, hex, vgrad(ctx, -83, -61, ['#fff1a8', '#ffd84a', '#8a6008']), 2);
		eye(ctx, 0, -72, 7 + Math.sin(t * 2), MAG);
		// shoulder orbs + floating claws
		for (const side of [-1, 1]) {
			const sw = Math.sin(t + side) * 3;
			limb(ctx, [side * 50, -92, side * 60, -70 + sw, side * 56, -52 + sw], 7, '#2d2d40');
			joint(ctx, side * 60, -70 + sw, 4, '#3c2a55');
			for (const a of [-0.5, 0, 0.5])
				limb(ctx, [side * 56, -52 + sw, side * 56 + Math.sin(a) * 8, -44 + sw], 2, '#ffd84a');
			const orb = ctx.createRadialGradient(side * 46, -104, 2, side * 50, -100, 15);
			orb.addColorStop(0, '#7a5aa8');
			orb.addColorStop(1, '#1e1030');
			circ(ctx, side * 50, -100, 14, orb, 2.5);
			ctx.strokeStyle = '#ffd84a';
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.arc(side * 50, -100, 10, 0, Math.PI * 2);
			ctx.stroke();
			eye(ctx, side * 50, -100, 4, MAG);
		}
		// head
		plate(ctx, -20, -138, 40, 32, 10, NIGHT, 2.5);
		ctx.fillStyle = MAG;
		ctx.shadowColor = MAG;
		ctx.shadowBlur = 10;
		ctx.beginPath();
		ctx.moveTo(-15, -127);
		ctx.lineTo(0, -120);
		ctx.lineTo(15, -127);
		ctx.lineTo(15, -122);
		ctx.lineTo(0, -114);
		ctx.lineTo(-15, -122);
		ctx.closePath();
		ctx.fill();
		ctx.shadowBlur = 0;
		ctx.fillStyle = 'rgba(0,0,0,0.5)';
		rr(ctx, -8, -112, 16, 2, 1);
		// crown
		poly(
			ctx,
			[-22, -137, -25, -156, -12, -146, 0, -164, 12, -146, 25, -156, 22, -137],
			vgrad(ctx, -164, -137, ['#fff6c2', '#ffd84a', '#a8760a']),
			2,
		);
		eye(ctx, 0, -148, 2.6, MAG);
		// orbiting motes
		for (let k = 0; k < 2; k++) {
			const a = t * 1.2 + k * Math.PI;
			eye(ctx, Math.cos(a) * 66, -84 + Math.sin(a) * 12, 3.5, '#ff8cf0');
		}
	},
};

// ---------- Problem labels ----------
type LabelItem = {
	text: string;
	size: number;
	bg: string;
	fg: string;
	dx: number;
	dy: number;
	w: number;
	h: number;
};
type LabelBlock = {
	key: object;
	/** desired bottom-center of the main label */
	ax: number;
	ay: number;
	items: LabelItem[];
	/** bounds relative to the anchor */
	x0: number;
	y0: number;
	x1: number;
	y1: number;
	alpha: number;
	prio: number;
};
type Rect = [number, number, number, number];

const labelFont = (size: number) => `bold ${size}px ui-monospace, Menlo, monospace`;
function item(
	ctx: C2D,
	text: string,
	size: number,
	bg: string,
	fg: string,
	dx: number,
	dy: number,
): LabelItem {
	ctx.font = labelFont(size);
	return {
		text,
		size,
		bg,
		fg,
		dx,
		dy,
		w: ctx.measureText(text).width + size * 0.8,
		h: size * 1.35,
	};
}
function block(
	key: object,
	ax: number,
	ay: number,
	items: LabelItem[],
	alpha: number,
	prio: number,
): LabelBlock {
	return {
		key,
		ax,
		ay,
		items,
		alpha,
		prio,
		x0: Math.min(...items.map((i) => i.dx - i.w / 2)),
		x1: Math.max(...items.map((i) => i.dx + i.w / 2)),
		y0: Math.min(...items.map((i) => i.dy - i.h)),
		y1: Math.max(...items.map((i) => i.dy)),
	};
}

const LABEL_BG: Record<RobotType, string> = {
	spider: 'rgba(60,70,80,0.9)',
	janitor: 'rgba(20,110,100,0.9)',
	trooper: 'rgba(50,90,45,0.9)',
	brute: 'rgba(150,100,20,0.92)',
	juggernaut: 'rgba(90,50,140,0.95)',
	titan: 'rgba(150,40,40,0.95)',
	overlord: 'rgba(130,30,110,0.95)',
};

function robotBlock(ctx: C2D, g: Game, rb: Robot): LabelBlock {
	const pos = g.screen(rb.p, rb.lane);
	const s = g.scale(rb.p);
	const def = ROBOTS[rb.type];
	const ay = pos.y - HEAD[rb.type] * s * def.size;
	const fs = Math.round((def.boss ? 20 : 15) + 7 * s);
	const targeted = g.fire?.target.kind === 'robot' && g.fire.target.robot === rb;
	const items = [
		item(
			ctx,
			rb.problem.text,
			fs,
			targeted ? 'rgba(255,60,60,0.95)' : LABEL_BG[rb.type],
			'#fff',
			0,
			0,
		),
	];
	const parts = rb.problem.parts;
	if (parts && rb.drop >= 1) {
		const pfs = Math.round(11 + 4 * s);
		const cols = parts.length > 4 ? 3 : 2;
		const sub = parts.map((part) =>
			item(
				ctx,
				part.revealed ? `${part.answer}` : part.text,
				pfs,
				part.revealed ? 'rgba(40,160,80,0.95)' : 'rgba(20,20,30,0.88)',
				'#fff',
				0,
				0,
			),
		);
		const colW = Math.max(...sub.map((i) => i.w)) + 6;
		sub.forEach((it, i) => {
			it.dx = ((i % cols) - (cols - 1) / 2) * colW;
			it.dy = -items[0].h - 6 - Math.floor(i / cols) * (it.h + 4);
		});
		items.push(...sub);
	}
	return block(rb, pos.x, ay, items, 0.4 + 0.6 * rb.drop, rb.p);
}

function crateBlock(ctx: C2D, g: Game, c: Crate): LabelBlock {
	const pos = g.screen(c.p, c.lane);
	const s = g.scale(c.p);
	const bg = c.opening ? 'rgba(255,60,60,0.95)' : 'rgba(200,160,40,0.95)';
	return block(
		c,
		pos.x,
		pos.y - 42 * s,
		[item(ctx, c.problem.text, Math.round(14 + 6 * s), bg, '#111', 0, 0)],
		1,
		c.p,
	);
}

const LABEL_PAD = 3;
const LABEL_TOP = 6;
const LABEL_BOTTOM = H - 48;
const LABEL_SIDE = 6;
/** nudges to try when a label would be hidden, nearest first (vertical moves are cheaper) */
const NUDGES: [number, number][] = (() => {
	const c: [number, number, number][] = [];
	for (let dx = -384; dx <= 384; dx += 16)
		for (let dy = -480; dy <= 480; dy += 8) c.push([dx, dy, dx * dx * 2 + dy * dy]);
	return c.sort((a, b) => a[2] - b[2]).map(([dx, dy]) => [dx, dy]);
})();
const labelOffsets = new WeakMap<object, { x: number; y: number }>();
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const overlaps = (a: Rect, b: Rect) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

/**
 * Places every label so it's fully on-screen and not covered by another label or the HUD.
 * Front-most robots claim their natural spot first; others slide to the nearest free spot.
 */
function drawLabels(ctx: C2D, g: Game, blocks: LabelBlock[]) {
	const placed: Rect[] = [
		[0, 0, 44 + g.maxHp * 34 + (g.shield > 0 ? 60 : 0), 46],
		[W - 150, 0, W, 82],
	];
	blocks.sort((a, b) => b.prio - a.prio);
	const out: { b: LabelBlock; x: number; y: number }[] = [];
	for (const b of blocks) {
		const rect = (x: number, y: number): Rect => [
			x + b.x0 - LABEL_PAD,
			y + b.y0 - LABEL_PAD,
			x + b.x1 + LABEL_PAD,
			y + b.y1 + LABEL_PAD,
		];
		const onScreen = (x: number, y: number) =>
			x + b.x0 >= LABEL_SIDE &&
			x + b.x1 <= W - LABEL_SIDE &&
			y + b.y0 >= LABEL_TOP &&
			y + b.y1 <= LABEL_BOTTOM;
		const bx = clamp(b.ax, LABEL_SIDE - b.x0, W - LABEL_SIDE - b.x1);
		const by = clamp(b.ay, LABEL_TOP - b.y0, LABEL_BOTTOM - b.y1);
		let tx = bx;
		let ty = by;
		for (const [dx, dy] of NUDGES) {
			const x = bx + dx;
			const y = by + dy;
			if (!onScreen(x, y)) continue;
			const r = rect(x, y);
			if (placed.some((p) => overlaps(p, r))) continue;
			tx = x;
			ty = y;
			break;
		}
		placed.push(rect(tx, ty));
		// ease toward the new spot so labels glide instead of jumping
		let off = labelOffsets.get(b.key);
		if (!off) labelOffsets.set(b.key, (off = { x: tx - b.ax, y: ty - b.ay }));
		else {
			off.x += (tx - b.ax - off.x) * 0.2;
			off.y += (ty - b.ay - off.y) * 0.2;
		}
		out.push({ b, x: b.ax + off.x, y: b.ay + off.y });
	}
	// back-to-front so the most urgent labels draw on top
	for (const { b, x, y } of out.reverse()) {
		ctx.globalAlpha = b.alpha;
		if (Math.hypot(x - b.ax, y - b.ay) > 20) {
			const lx = clamp(b.ax, x + b.x0, x + b.x1);
			const ly = b.ay > y ? y + b.y1 : y + b.y0;
			ctx.strokeStyle = 'rgba(255,255,255,0.55)';
			ctx.lineWidth = 1.5;
			ctx.setLineDash([4, 3]);
			ctx.beginPath();
			ctx.moveTo(b.ax, b.ay);
			ctx.lineTo(lx, ly);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.fillStyle = 'rgba(255,255,255,0.8)';
			ctx.beginPath();
			ctx.arc(b.ax, b.ay, 2.5, 0, Math.PI * 2);
			ctx.fill();
		}
		for (const it of b.items) labelBox(ctx, it.text, x + it.dx, y + it.dy, it.size, it.bg, it.fg);
	}
	ctx.globalAlpha = 1;
}

function labelBox(
	ctx: C2D,
	text: string,
	x: number,
	y: number,
	size: number,
	bg: string,
	fg = '#fff',
) {
	ctx.font = labelFont(size);
	const w = ctx.measureText(text).width + size * 0.8;
	const h = size * 1.35;
	ctx.fillStyle = bg;
	ctx.beginPath();
	ctx.roundRect(x - w / 2, y - h, w, h, 5);
	ctx.fill();
	ctx.fillStyle = fg;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(text, x, y - h / 2 + 1);
}

function drawCrate(ctx: CanvasRenderingContext2D, g: Game, c: Crate) {
	const pos = g.screen(c.p, c.lane);
	const s = g.scale(c.p);
	const y = pos.y + dropOffset(c.drop) * 0.8;
	if (c.life < 4 && !c.opening && Math.floor(g.time * 6) % 2) return;
	ctx.save();
	ctx.translate(pos.x, y);
	ctx.scale(s, s);
	if (c.drop < 1) {
		// parachute
		ctx.strokeStyle = '#ccc';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(-18, -30);
		ctx.lineTo(-30, -80);
		ctx.moveTo(18, -30);
		ctx.lineTo(30, -80);
		ctx.stroke();
		ctx.fillStyle = '#e8e8e8';
		ctx.beginPath();
		ctx.arc(0, -80, 32, Math.PI, 0);
		ctx.fill();
	}
	const img = images.crate;
	if (img?.complete && img.naturalWidth) ctx.drawImage(img, -22, -40, 44, 40);
	else {
		ctx.fillStyle = '#8b6b3d';
		rr(ctx, -22, -34, 44, 34, 3);
		ctx.strokeStyle = '#5b4325';
		ctx.lineWidth = 3;
		ctx.strokeRect(-22, -34, 44, 34);
		ctx.beginPath();
		ctx.moveTo(-22, -34);
		ctx.lineTo(22, 0);
		ctx.moveTo(22, -34);
		ctx.lineTo(-22, 0);
		ctx.stroke();
		ctx.fillStyle = '#ffd84a';
		ctx.font = 'bold 16px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('?', 0, -12);
	}
	ctx.restore();
}

function drawGun(ctx: CanvasRenderingContext2D, g: Game) {
	const gx = W / 2,
		gy = H - 10;
	let angle = -Math.PI / 2;
	let tx = 0,
		ty = 0;
	if (g.fire) {
		const tg = g.fire.target;
		if (tg.kind === 'crate') {
			const p = g.screen(tg.crate.p, tg.crate.lane);
			tx = p.x;
			ty = p.y - 18 * g.scale(tg.crate.p);
		} else {
			const p = g.screen(tg.robot.p, tg.robot.lane);
			tx = p.x;
			ty = p.y - 45 * g.scale(tg.robot.p) * ROBOTS[tg.robot.type].size;
		}
		angle = Math.atan2(ty - gy, tx - gx);
	}
	const len = 90;
	const mx = gx + Math.cos(angle) * len,
		my = gy + Math.sin(angle) * len;
	if (g.fire && Math.floor(g.fire.t * 30) % 2 === 0) {
		// tracer + muzzle flash
		ctx.strokeStyle = 'rgba(255,230,120,0.9)';
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(mx, my);
		ctx.lineTo(tx + (Math.random() - 0.5) * 16, ty + (Math.random() - 0.5) * 16);
		ctx.stroke();
		ctx.fillStyle = '#ffe066';
		ctx.beginPath();
		ctx.arc(mx, my, 10 + Math.random() * 6, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = '#fff6';
		ctx.beginPath();
		ctx.arc(tx, ty, 8 + Math.random() * 8, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.save();
	ctx.translate(gx, gy);
	ctx.rotate(angle + Math.PI / 2);
	ctx.fillStyle = g.staggerT > 0 ? '#7a3a3a' : '#3b3f46';
	rr(ctx, -9, -len, 18, len, 4);
	ctx.fillStyle = '#23262b';
	rr(ctx, -12, -len, 24, 12, 3);
	ctx.restore();
	ctx.fillStyle = '#2b2e33';
	ctx.beginPath();
	ctx.arc(gx, gy + 10, 36, Math.PI, 0);
	ctx.fill();
}

function drawEffects(ctx: CanvasRenderingContext2D, g: Game) {
	for (const e of g.effects) {
		const k = e.t / e.dur;
		if (e.kind === 'boom' || e.kind === 'big') {
			const R = (e.kind === 'big' ? 90 : 40) * (0.3 + k);
			ctx.fillStyle = `rgba(255,${Math.round(200 - 150 * k)},50,${1 - k})`;
			ctx.beginPath();
			ctx.arc(e.x, e.y, R, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = `rgba(60,60,60,${0.6 * (1 - k)})`;
			ctx.beginPath();
			ctx.arc(e.x, e.y - R * 0.4, R * 0.7, 0, Math.PI * 2);
			ctx.fill();
		} else if (e.kind === 'emp') {
			ctx.strokeStyle = `rgba(116,185,255,${1 - k})`;
			ctx.lineWidth = 8;
			ctx.beginPath();
			ctx.arc(e.x, e.y, 700 * k, 0, Math.PI * 2);
			ctx.stroke();
		} else if (e.kind === 'text') {
			ctx.font = 'bold 22px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillStyle = e.color ?? '#fff';
			ctx.globalAlpha = 1 - k;
			ctx.fillText(e.text ?? '', e.x, e.y - 40 * k);
			ctx.globalAlpha = 1;
		}
	}
}

function drawHud(ctx: CanvasRenderingContext2D, g: Game) {
	// hearts
	for (let i = 0; i < g.maxHp; i++) drawHeart(ctx, 24 + i * 34, 26, i < g.hp);
	if (g.shield > 0) {
		ctx.fillStyle = '#74b9ff';
		ctx.font = 'bold 18px sans-serif';
		ctx.textAlign = 'left';
		ctx.fillText(`🛡×${g.shield}`, 24 + g.maxHp * 34, 32);
	}
	ctx.textAlign = 'right';
	ctx.font = 'bold 18px sans-serif';
	ctx.fillStyle = '#ffd84a';
	ctx.fillText(`$${g.money}`, W - 16, 30);
	ctx.fillStyle = '#fff';
	const waveTxt = g.endless ? `Wave ${g.waveIdx + 1}` : `Wave ${g.waveIdx + 1}/${g.totalWaves}`;
	ctx.fillText(waveTxt, W - 16, 54);
	if (!g.endless && g.waveIdx < g.level.waves.length - 1) {
		const left = Math.ceil(g.level.waveTime - (g.time - g.waveStart));
		ctx.fillStyle = left <= 5 ? '#ff7675' : '#bbb';
		ctx.font = '14px sans-serif';
		ctx.fillText(`next wave in ${left}s`, W - 16, 74);
	}
	// items
	ctx.textAlign = 'left';
	ITEMS.forEach((it, i) => {
		const x = 16 + i * 120,
			y = H - 40;
		ctx.fillStyle = g.items[it.key] > 0 ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)';
		ctx.beginPath();
		ctx.roundRect(x, y, 112, 28, 6);
		ctx.fill();
		ctx.fillStyle = g.items[it.key] > 0 ? '#fff' : '#777';
		ctx.font = 'bold 14px sans-serif';
		ctx.fillText(`[${it.hotkey.toUpperCase()}] ${it.name} ×${g.items[it.key]}`, x + 8, y + 19);
	});
	if (g.freezeT > 0) statusText(ctx, `EMP ${g.freezeT.toFixed(1)}s`, '#74b9ff', 0);
	if (g.barrierT > 0) statusText(ctx, `Barrier ${g.barrierT.toFixed(1)}s`, '#81ecec', 1);
	if (g.messageT > 0) {
		ctx.globalAlpha = Math.min(1, g.messageT);
		ctx.font = 'bold 36px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillStyle = '#fff';
		ctx.strokeStyle = '#000';
		ctx.lineWidth = 5;
		ctx.strokeText(g.message, W / 2, 70);
		ctx.fillText(g.message, W / 2, 70);
		ctx.globalAlpha = 1;
	}
}

function statusText(ctx: CanvasRenderingContext2D, text: string, color: string, row: number) {
	ctx.font = 'bold 16px sans-serif';
	ctx.textAlign = 'left';
	ctx.fillStyle = color;
	ctx.fillText(text, 16, 70 + row * 22);
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, full: boolean) {
	ctx.save();
	ctx.translate(x, y);
	ctx.fillStyle = full ? '#ff4d6d' : 'rgba(255,255,255,0.15)';
	ctx.strokeStyle = '#000';
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(0, 10);
	ctx.bezierCurveTo(-16, -2, -10, -14, 0, -6);
	ctx.bezierCurveTo(10, -14, 16, -2, 0, 10);
	ctx.fill();
	ctx.stroke();
	ctx.restore();
}

export { LEVELS };

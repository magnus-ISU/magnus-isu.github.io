import { type C2D, DARK, DRAW, eye, GREY, HEAD, plate, rr } from './art';
import { block, clamp, drawLabels, item, type LabelBlock, type Rect } from './labels';
import { type LevelDef, ROBOTS, type RobotType, type Spawn, themeOf } from './levels';
import { type Part, type Problem, pick } from './problems';
import type { ItemKey, UpgradeKey } from './save';
import { drawDistrict, drawIcon, drawSkyline, hash, THEMES } from './scenery';

// ---------- Tuning ----------
const FIRE_TIME = 2.5;
const PART_FIRE_TIME = 0.5;
/** 50% longer than a kill or a wasted volley */
const JAM_TIME = FIRE_TIME * 1.5;
/** seconds a pistol stays on one target before rotating to the next */
const GUN_SWITCH = 0.625;
const BARRIER_P = 0.82;
/** force field: how far in front of its robot the barrier stands, and the furthest forward it goes */
const BARRIER_GAP = 0.02;
const BARRIER_MAX = 0.95;
/** force field: seconds to fade out before jumping, and to fade back in */
const BARRIER_OUT = 1;
const BARRIER_IN = 0.5;
const EMP_TIME = 5;
const PULSE_BONUS = 3;
const CRATE_INTERVAL = 25;
const CRATE_LIFE = 18;
/** seconds of walking a shield knocks a boss back */
const SHIELD_PUSH = 15;
const WIN_DELAY = 1.4;
const LOSE_DELAY = 1.2;
/** attack animation length; damage lands at IMPACT of the way through */
const ATTACK_TIME: Record<RobotType, number> = {
	spider: 1.1,
	janitor: 1.3,
	trooper: 1.5,
	brute: 1.4,
	juggernaut: 1.8,
	titan: 2.2,
	overlord: 2.8,
};
const IMPACT = 0.6;
/** warning before an attack starts; answering it in this window stops the attack completely */
const WINDUP = 2;
/** how long a dynamited robot takes to fall apart (and can still be shot) */
const BLOWN_TIME = 1.6;

type Robot = {
	id: number;
	type: RobotType;
	problem: Problem;
	/** makes a fresh problem when a wrong answer lets this robot escape */
	gen: () => Problem;
	p: number;
	lane: number;
	/** 0..1 airdrop animation progress */
	drop: number;
	/** being shot at (stops walking) */
	targeted: boolean;
	seed: number;
	freezeT: number;
	/** each item affects a robot only once */
	emped: boolean;
	barrierId: number;
	shielded: boolean;
	attack: { t: number; hit: boolean } | null;
	/** seconds left in a dynamite death; it can still be shot (for its bounty) until then */
	blownT: number | null;
	/** when it touched down, for boss kill timing */
	landsAt: number;
};
export type CrateReward = 'hp' | 'dynamite' | 'emp';
type Crate = {
	id: number;
	problem: Problem;
	reward: CrateReward;
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
	kind: 'boom' | 'big' | 'text' | 'emp' | 'dirt' | 'shield';
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
	/** average answer time, excluding boss main problems on levels that track bosses separately */
	avgSolve: number;
	/** average seconds from a boss landing to its death (null when not tracked or none killed) */
	bossTime: number | null;
	items: Record<ItemKey, number>;
	/** achievement ids unlocked during this run */
	achievements: string[];
	/** took any damage (healing from crates doesn't undo this) */
	damaged: boolean;
	/** used any consumable */
	usedItems: boolean;
};

export const ACHIEVEMENTS: Record<string, string> = {
	mercy: 'Change of Heart',
};

export type Loadout = {
	maxHp: number;
	items: Record<ItemKey, number>;
	/** upgrades that are owned and switched on */
	upgrades: Partial<Record<UpgradeKey, boolean>>;
};

let nextId = 1;

export class Game {
	level: LevelDef;
	endless: boolean;
	theme: string;
	up: Partial<Record<UpgradeKey, boolean>>;
	/** field size in logical px (the panel below is drawn by the app) */
	W = 960;
	FH = 600;
	robots: Robot[] = [];
	crates: Crate[] = [];
	effects: Effect[] = [];
	hp: number;
	maxHp: number;
	items: Record<ItemKey, number>;
	shield = 0;
	barrierT = 0;
	barrierId = 0;
	/** where the barrier stands (the force field moves it) */
	barrierP = BARRIER_P;
	/** force field: the robot it's parked in front of */
	barrierFor: Robot | null = null;
	/** force field: seconds left fading out before it jumps */
	barrierOut = 0;
	/** 0..1 fade-in after it appears */
	barrierIn = 1;
	jamT = 0;
	jamDur = 1;
	groundT = 0;
	/** what each pistol (left, right) is shooting at, and when it may switch */
	gunAim: (Target | null)[] = [null, null];
	gunNext = [0, 0];
	/** empty patches of road a wasted volley hits */
	groundAim: { p: number; lane: number }[] = [];
	fire: { targets: Target[]; t: number; dur: number } | null = null;
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
	bossTimes: number[] = [];
	achievements: string[] = [];
	damaged = false;
	usedItems = false;
	/** mixed levels time boss kills separately; all-boss rematches just count answers */
	trackBoss: boolean;
	readyAt = 0;
	shake = 0;
	hurtT = 0;
	ending: { won: boolean; at: number } | null = null;
	result: Result | null = null;
	onEnd: (r: Result) => void;
	message = '';
	messageT = 0;

	constructor(level: LevelDef, endless: boolean, load: Loadout, onEnd: (r: Result) => void) {
		this.level = level;
		this.endless = endless;
		this.theme = themeOf(level);
		this.maxHp = load.maxHp;
		this.hp = load.maxHp;
		this.items = { ...load.items };
		this.up = { ...load.upgrades };
		this.onEnd = onEnd;
		this.trackBoss =
			!level.id.includes('.') && level.waves.some((w) => w.some((s) => ROBOTS[s.type].boss));
		this.startWave();
	}

	resize(W: number, FH: number) {
		this.W = W;
		this.FH = FH;
	}

	get totalWaves() {
		return this.endless ? Infinity : this.level.waves.length;
	}
	get lastWave() {
		return !this.endless && this.waveIdx >= this.level.waves.length - 1;
	}
	/** guns can't take input (jammed, or the level is over) */
	get blocked() {
		return this.jamT > 0 || this.ending !== null;
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
		const [lo, hi] = this.level.spawn ?? [0, 0.5];
		const p = boss ? Math.random() * 0.15 : lo + Math.random() * (hi - lo);
		// drop on the opposite side of the road from robots already nearby so they don't overlap
		let lean = 0;
		for (const r of this.robots)
			if (Math.abs(r.p - p) < 0.25) lean += r.lane * (ROBOTS[r.type].boss ? 3 : 1);
		const side = lean === 0 ? (Math.random() < 0.5 ? -1 : 1) : -Math.sign(lean);
		this.robots.push({
			id: nextId++,
			type: spawn.type,
			problem: spawn.gen(),
			gen: spawn.gen,
			p,
			lane: side * (boss ? 0.45 + Math.random() * 0.35 : 0.2 + Math.random() * 0.65),
			landsAt: this.time + 0.9,
			drop: 0,
			targeted: false,
			seed: Math.random() * 100,
			freezeT: 0,
			emped: false,
			barrierId: 0,
			shielded: false,
			attack: null,
			blownT: null,
		});
	}

	spawnCrate() {
		this.crates.push({
			id: nextId++,
			problem: this.level.crate(),
			reward: pick(['hp', 'dynamite', 'emp'] as const),
			p: 0.25 + Math.random() * 0.4,
			// always on the shoulder, off the road
			lane: (Math.random() < 0.5 ? -1 : 1) * (1.3 + Math.random() * 0.15),
			drop: 0,
			life: CRATE_LIFE,
			opening: false,
		});
	}

	killTime(t: Target) {
		return (t.kind === 'part' ? PART_FIRE_TIME : FIRE_TIME) * (this.up.antimatter ? 0.5 : 1);
	}

	/**
	 * A correct answer adds a target (splitting fire and restarting the kill timer for all of them).
	 * A wrong one jams the guns and lets every current target go.
	 */
	submit(raw: string): 'hit' | 'miss' | 'busy' {
		if (this.blocked) return 'busy';
		const n = Number(raw.trim());
		if (raw.trim() === '' || raw.trim() === '-' || Number.isNaN(n)) return 'busy';
		this.shots++;
		const found: { t: Target; p: number }[] = [];
		for (const rb of this.robots) {
			// attacking and blown-up robots can still be shot
			if (!rb.targeted && rb.problem.answer === n)
				found.push({ t: { kind: 'robot', robot: rb }, p: rb.p });
			if (this.up.scope && rb.drop >= 1 && !rb.attack && rb.blownT === null)
				for (const part of rb.problem.parts ?? [])
					if (!part.revealed && part.answer === n)
						found.push({ t: { kind: 'part', robot: rb, part }, p: rb.p - 0.001 });
		}
		for (const c of this.crates)
			if (!c.opening && c.drop >= 1 && c.problem.answer === n)
				found.push({ t: { kind: 'crate', crate: c }, p: c.p });
		const took = this.time - this.readyAt;
		this.readyAt = this.time;
		if (!found.length) {
			this.solveTimes.push(took);
			const escaped = this.fire?.targets.length ?? 0;
			// escaped targets get new problems, so the answers you already typed must be re-solved
			for (const t of this.fire?.targets ?? []) {
				if (t.kind === 'robot') {
					t.robot.targeted = false;
					t.robot.problem = t.robot.gen();
					// blown up, shot at, then spared by a wrong answer
					if (t.robot.blownT !== null) {
						t.robot.blownT = null;
						this.achieve('mercy');
					}
				}
				if (t.kind === 'part') t.part.revealed = false;
				if (t.kind === 'crate') {
					t.crate.opening = false;
					t.crate.problem = this.level.crate();
				}
			}
			this.fire = null;
			this.jam(JAM_TIME * (this.up.targeting ? 0.5 : 1));
			this.flash(escaped ? 'Jammed! Targets escaped' : 'Jammed!');
			return 'miss';
		}
		found.sort((a, b) => b.p - a.p);
		const target = found[0].t;
		this.correct++;
		const bossShot = target.kind === 'robot' && ROBOTS[target.robot.type].boss;
		if (!(this.trackBoss && bossShot)) this.solveTimes.push(took);
		if (target.kind === 'robot') target.robot.targeted = true;
		if (target.kind === 'crate') target.crate.opening = true;
		if (target.kind === 'part') target.part.revealed = true;
		if (!this.fire) this.fire = { targets: [], t: 0, dur: 0 };
		this.fire.targets.push(target);
		// the newest target always gets a pistol straight away (the one that's been on its target longest)
		if (this.fire.targets.length === 1) {
			this.gunAim = [target, target];
			this.gunNext = [this.time + GUN_SWITCH, this.time + GUN_SWITCH];
		} else {
			const i = this.gunNext[0] <= this.gunNext[1] ? 0 : 1;
			this.gunAim[i] = target;
			this.gunNext[i] = this.time + GUN_SWITCH;
		}
		this.fire.t = 0;
		this.fire.dur = Math.max(...this.fire.targets.map((t) => this.killTime(t)));
		this.sendReinforcements();
		return 'hit';
	}

	/** Backspace: finish off current targets instantly, or waste a volley into the ground. */
	backspace() {
		if (this.blocked) return;
		if (this.fire) {
			this.fire.t = this.fire.dur;
			return;
		}
		// a wasted volley takes as long as a normal kill (laser pointer halves it)
		const t = FIRE_TIME * (this.up.antimatter ? 0.5 : 1) * (this.up.laser ? 0.5 : 1);
		this.jam(t);
		this.groundT = t;
		this.groundAim = this.emptyGround();
	}

	/** two spots on the road ahead, one per side, as far from any robot or crate as possible */
	emptyGround() {
		const things = [...this.robots, ...this.crates].map((o) => this.screen(o.p, o.lane));
		const pick = (side: number) => {
			let best = { p: 0.6, lane: side * 0.5 };
			let bestD = -1;
			for (let p = 0.35; p <= 0.8; p += 0.05)
				for (let l = 0.15; l <= 0.95; l += 0.1) {
					const pos = this.screen(p, side * l);
					const d = Math.min(Infinity, ...things.map((t) => Math.hypot(t.x - pos.x, t.y - pos.y)));
					if (d > bestD) {
						bestD = d;
						best = { p, lane: side * l };
					}
				}
			return best;
		};
		return [pick(-1), pick(1)];
	}

	/** keep each pistol on a live target, rotating through targets every GUN_SWITCH seconds */
	aimGuns() {
		const targets = this.fire?.targets ?? [];
		if (!targets.length) {
			this.gunAim = [null, null];
			return;
		}
		for (const i of [0, 1]) {
			const cur = this.gunAim[i];
			if (cur && targets.includes(cur) && this.time < this.gunNext[i]) continue;
			let idx = cur ? (targets.indexOf(cur) + 1) % targets.length : 0;
			if (targets.length > 1 && targets[idx] === this.gunAim[1 - i])
				idx = (idx + 1) % targets.length;
			this.gunAim[i] = targets[idx];
			this.gunNext[i] = this.time + GUN_SWITCH;
		}
	}

	bountyOf(type: RobotType) {
		return this.level.bounty?.[type] ?? ROBOTS[type].bounty;
	}

	jam(t: number) {
		this.jamT = t;
		this.jamDur = t;
		this.readyAt = this.time + t;
	}

	/** If every robot on the field is being shot at, the next one drops in immediately. */
	sendReinforcements() {
		if (this.ending || !this.robots.length || !this.robots.every((r) => r.targeted)) return;
		if (this.queue.length) {
			this.queue.sort((a, b) => a.at - b.at);
			this.spawnRobot(this.queue.shift()!.spawn);
		} else if (!this.lastWave) this.startWave();
	}

	useItem(key: ItemKey): boolean {
		if (this.ending || this.items[key] <= 0) return false;
		if (key === 'dynamite') {
			const ok = this.robots.filter((r) => this.blastable(r));
			if (!ok.length) {
				this.flash('Nothing to blow up');
				return false;
			}
			const front = ok.reduce((a, b) => (a.p > b.p ? a : b));
			const pos = this.screen(front.p, front.lane);
			this.blast(pos.x, pos.y, 160);
		} else if (key === 'emp') {
			if (!this.emp()) {
				this.flash('No robots left to EMP');
				return false;
			}
		} else if (key === 'barrier') {
			this.barrierId++;
			this.barrierT = 10;
			this.barrierOut = 0;
			this.barrierIn = 0;
			this.barrierP = BARRIER_P;
			this.placeBarrier();
		} else if (key === 'shield') this.shield++;
		this.items[key]--;
		this.usedItems = true;
		return true;
	}

	/** the barrier is standing and blocks robots (not mid-jump) */
	get barrierUp() {
		return this.barrierT > 0 && this.barrierOut <= 0;
	}
	/** robots the current barrier may stop: walking, alive, and not held by an earlier barrier */
	holdable(rb: Robot) {
		return (
			!rb.attack && rb.blownT === null && (rb.barrierId === 0 || rb.barrierId === this.barrierId)
		);
	}
	/** force field: stand just in front of the closest robot it can hold (or stay put if none) */
	placeBarrier() {
		this.barrierFor = null;
		if (!this.up.forcefield) return;
		const ok = this.robots.filter((r) => this.holdable(r) && r.p < BARRIER_MAX);
		if (!ok.length) return;
		const front = ok.reduce((a, b) => (a.p > b.p ? a : b));
		this.barrierFor = front;
		this.barrierP = Math.min(BARRIER_MAX, front.p + BARRIER_GAP);
	}
	/** force field: jump (fade out, then in) once its robot dies or another robot gets in front */
	moveBarrier(dt: number) {
		if (this.barrierT <= 0) {
			this.barrierFor = null;
			this.barrierOut = 0;
			return;
		}
		this.barrierIn = Math.min(1, this.barrierIn + dt / BARRIER_IN);
		if (!this.up.forcefield) return;
		if (this.barrierOut > 0) {
			this.barrierOut -= dt;
			if (this.barrierOut <= 0) {
				this.barrierOut = 0;
				this.barrierIn = 0;
				this.placeBarrier();
			}
			return;
		}
		const gone = this.barrierFor !== null && !this.robots.includes(this.barrierFor);
		const ahead = this.robots.some(
			(r) => this.holdable(r) && r.p > this.barrierP && r.p < BARRIER_MAX,
		);
		const idle = this.barrierFor === null && this.robots.some((r) => this.holdable(r));
		if (gone || ahead || idle) this.barrierOut = BARRIER_OUT;
	}

	/** freeze every robot that hasn't been EMP'd before */
	emp() {
		const hit = this.robots.filter((r) => !r.emped && !r.attack);
		for (const r of hit) {
			r.emped = true;
			r.freezeT = EMP_TIME + (this.up.pulse ? PULSE_BONUS : 0);
		}
		if (hit.length)
			this.effects.push({ x: this.W / 2, y: this.FH / 2, t: 0, dur: 0.8, kind: 'emp' });
		return hit.length > 0;
	}

	/** dynamite skips bosses (and brutes without frag grenades), robots already being shot or blown up, and ones that already hit you */
	blastable(rb: Robot) {
		return (
			!ROBOTS[rb.type].boss &&
			(this.up.frag || rb.type !== 'brute') &&
			!rb.targeted &&
			rb.blownT === null &&
			!rb.attack?.hit
		);
	}

	blast(x: number, y: number, radius: number) {
		this.effects.push({ x, y, t: 0, dur: 0.9, kind: 'big' });
		this.shake = 0.4;
		const k = this.k;
		const dist = (rb: Robot) => {
			const pos = this.screen(rb.p, rb.lane);
			return Math.hypot(pos.x - x, pos.y - y);
		};
		let hit = this.robots.filter(
			(rb) => this.blastable(rb) && dist(rb) < radius * k * (0.6 + rb.p * 0.6),
		);
		// plain dynamite only gets the one robot it lands on; frag grenades get everyone nearby
		if (!this.up.frag && hit.length) hit = [hit.reduce((a, b) => (dist(a) <= dist(b) ? a : b))];
		for (const rb of hit) {
			// a dying robot: no bounty unless you shoot it before it falls apart
			rb.blownT = BLOWN_TIME;
			rb.attack = null;
		}
	}

	achieve(id: string) {
		if (this.achievements.includes(id)) return;
		this.achievements.push(id);
		this.flash(`🏆 ${ACHIEVEMENTS[id]}`);
	}

	kill(rb: Robot, bountyMul = 1) {
		const i = this.robots.indexOf(rb);
		if (i < 0) return;
		this.robots.splice(i, 1);
		const pos = this.screen(rb.p, rb.lane);
		const s = this.scale(rb.p) * ROBOTS[rb.type].size;
		const bounty = this.bountyOf(rb.type) * bountyMul;
		const boss = ROBOTS[rb.type].boss;
		this.money += bounty;
		this.kills++;
		if (boss && this.trackBoss) this.bossTimes.push(this.time - rb.landsAt);
		this.effects.push({
			x: pos.x,
			y: pos.y - 40 * s,
			t: 0,
			dur: boss ? 1.2 : 0.6,
			kind: boss ? 'big' : 'boom',
		});
		if (boss)
			for (let k = 0; k < 4; k++)
				this.effects.push({
					x: pos.x + (Math.random() - 0.5) * 80 * s,
					y: pos.y - Math.random() * 120 * s,
					t: -k * 0.15,
					dur: 0.7,
					kind: 'boom',
				});
		if (bounty)
			this.effects.push({
				x: pos.x,
				y: pos.y - 80 * s,
				t: 0,
				dur: 1,
				kind: 'text',
				text: `+$${bounty}`,
				color: '#ffd84a',
			});
		if (this.fire) {
			this.fire.targets = this.fire.targets.filter((t) => t.kind === 'crate' || t.robot !== rb);
			if (!this.fire.targets.length) this.fire = null;
		}
	}

	openCrate(c: Crate) {
		const i = this.crates.indexOf(c);
		if (i < 0) return;
		this.crates.splice(i, 1);
		const pos = this.screen(c.p, c.lane);
		const text = (text: string, color: string) =>
			this.effects.push({ x: pos.x, y: pos.y - 50, t: 0, dur: 1.2, kind: 'text', text, color });
		const reward = c.reward;
		if (reward === 'hp') {
			this.hp = Math.min(this.maxHp, this.hp + 1);
			text('+1 ♥', '#ff6b81');
		} else if (reward === 'dynamite') {
			// always lands on a robot: centered on the one nearest the crate
			const ok = this.robots.filter((r) => this.blastable(r));
			const dist = (r: Robot) => {
				const q = this.screen(r.p, r.lane);
				return Math.hypot(q.x - pos.x, q.y - pos.y);
			};
			const near = ok.length ? ok.reduce((a, b) => (dist(a) < dist(b) ? a : b)) : null;
			const at = near ? this.screen(near.p, near.lane) : pos;
			this.blast(at.x, at.y, 200);
			text('DYNAMITE!', '#ff9f43');
		} else {
			this.emp();
			text('EMP!', '#74b9ff');
		}
	}

	update(dt: number) {
		if (this.result) return;
		this.time += dt;
		this.jamT = Math.max(0, this.jamT - dt);
		this.groundT = Math.max(0, this.groundT - dt);
		this.barrierT = Math.max(0, this.barrierT - dt);
		this.moveBarrier(dt);
		this.shake = Math.max(0, this.shake - dt);
		this.hurtT = Math.max(0, this.hurtT - dt);
		this.messageT = Math.max(0, this.messageT - dt);

		if (!this.ending) {
			for (let i = this.queue.length - 1; i >= 0; i--)
				if (this.queue[i].at <= this.time) {
					this.spawnRobot(this.queue[i].spawn);
					this.queue.splice(i, 1);
				}
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
		}

		// everyone else holds still while a robot is hitting you
		const attacking = this.robots.some((r) => r.attack && r.attack.t < ATTACK_TIME[r.type]);
		for (const rb of [...this.robots]) {
			rb.drop = Math.min(1, rb.drop + dt / 0.9);
			if (rb.blownT !== null) {
				// falling apart; a robot being shot waits for the bullets (and its bounty)
				if (!rb.targeted && (rb.blownT -= dt) <= 0) this.kill(rb, 0);
				continue;
			}
			if (rb.attack) {
				// a robot you start shooting during its wind-up never gets to attack
				if (!(rb.targeted && rb.attack.t < 0)) rb.attack.t += dt;
				const dur = ATTACK_TIME[rb.type];
				if (!rb.attack.hit && rb.attack.t >= dur * IMPACT) this.impact(rb);
				const lingering = this.ending && !this.ending.won && rb.attack.t < dur + LOSE_DELAY;
				// stays put once done if you're shooting it, so typing its answer still pays
				if (rb.attack.t >= dur && !lingering && !rb.targeted)
					this.robots.splice(this.robots.indexOf(rb), 1);
				continue;
			}
			if (this.ending || rb.targeted || rb.drop < 1 || attacking) continue;
			if (rb.freezeT > 0) {
				rb.freezeT -= dt;
				continue;
			}
			const before = rb.p;
			rb.p += (dt / this.level.walkTime) * ROBOTS[rb.type].speed * this.speedMul;
			const held = rb.barrierId === 0 || rb.barrierId === this.barrierId;
			if (this.barrierUp && held && before <= this.barrierP && rb.p > this.barrierP) {
				rb.p = this.barrierP;
				rb.barrierId = this.barrierId;
			}
			if (rb.p >= 1) this.arrive(rb);
		}

		if (this.fire) {
			this.fire.t += dt;
			if (this.fire.t >= this.fire.dur) {
				const targets = this.fire.targets;
				this.fire = null;
				// multi-kills pay double for two robots, triple for three or more
				const n = targets.filter((t) => t.kind === 'robot').length;
				const mul = n >= 3 ? 3 : n;
				for (const t of targets) {
					if (t.kind === 'robot') this.kill(t.robot, Math.max(1, mul));
					else if (t.kind === 'crate') this.openCrate(t.crate);
				}
			}
		}
		this.aimGuns();

		for (const e of this.effects) e.t += dt;
		this.effects = this.effects.filter((e) => e.t < e.dur);

		if (!this.ending) {
			const cleared = this.queue.length === 0 && this.robots.length === 0;
			if (cleared && this.lastWave) this.ending = { won: true, at: this.time + WIN_DELAY };
			else if (!this.lastWave && (cleared || this.time - this.waveStart >= this.level.waveTime))
				this.startWave();
		}
		if (this.ending && this.time >= this.ending.at) {
			this.result = this.makeResult(this.ending.won);
			this.onEnd(this.result);
		}
	}

	arrive(rb: Robot) {
		rb.p = 1;
		if (this.shield > 0 && !rb.shielded) {
			this.shield--;
			rb.shielded = true;
			const pos = this.screen(1, rb.lane);
			this.effects.push({ x: pos.x, y: pos.y - 60 * this.k, t: 0, dur: 0.8, kind: 'shield' });
			this.shake = 0.3;
			if (this.up.reflect) this.repel(rb);
			if (ROBOTS[rb.type].boss) {
				rb.p = Math.max(
					0,
					1 - (SHIELD_PUSH * ROBOTS[rb.type].speed * this.speedMul) / this.level.walkTime,
				);
				this.flash('Shield! Boss knocked back');
			} else {
				this.kill(rb);
				this.flash('Shield blocked!');
			}
			return;
		}
		rb.attack = { t: -WINDUP, hit: false };
	}

	/** reflective shield: knock every other robot back (cancelling wind-ups) */
	repel(except: Robot) {
		for (const r of this.robots) {
			if (r === except || r.blownT !== null || r.drop < 1) continue;
			if (r.attack) {
				if (r.attack.t >= 0) continue;
				r.attack = null;
			}
			r.p = Math.max(
				0,
				r.p - (SHIELD_PUSH * ROBOTS[r.type].speed * this.speedMul) / this.level.walkTime,
			);
			const pos = this.screen(r.p, r.lane);
			this.effects.push({ x: pos.x, y: pos.y - 40 * this.k, t: 0, dur: 0.6, kind: 'shield' });
		}
	}

	impact(rb: Robot) {
		rb.attack!.hit = true;
		this.shake = ROBOTS[rb.type].boss ? 0.9 : 0.5;
		this.hurtT = 0.5;
		this.hp = Math.max(0, this.hp - ROBOTS[rb.type].damage);
		this.damaged = true;
		if (this.hp <= 0 && !this.ending) {
			const left = ATTACK_TIME[rb.type] * (1 - IMPACT);
			this.ending = { won: false, at: this.time + left + LOSE_DELAY };
			this.fire = null;
		}
	}

	makeResult(won: boolean): Result {
		const avg = this.solveTimes.length
			? this.solveTimes.reduce((a, b) => a + b, 0) / this.solveTimes.length
			: 0;
		return {
			won,
			endless: this.endless,
			hp: this.hp,
			maxHp: this.maxHp,
			money: this.money,
			kills: this.kills,
			wave: this.waveIdx + 1,
			accuracy: this.shots ? this.correct / this.shots : 0,
			avgSolve: avg,
			bossTime: this.bossTimes.length
				? this.bossTimes.reduce((a, b) => a + b, 0) / this.bossTimes.length
				: null,
			items: this.items,
			achievements: this.achievements,
			damaged: this.damaged,
			usedItems: this.usedItems,
		};
	}

	// ---------- geometry ----------
	get k() {
		// portrait screens are narrow, so let robots grow a bit past the road's natural width
		return Math.min(this.W / (this.W < this.FH ? 760 : 960), this.FH / 540);
	}
	get roadTop() {
		return this.FH * 0.2;
	}
	get roadBottom() {
		return this.FH * 0.86;
	}
	scale(p: number) {
		return (0.45 + 0.7 * p) * this.k;
	}
	halfWidth(p: number) {
		return (90 + 340 * p) * Math.max(this.k, (this.W / 960) * 0.9);
	}
	screen(p: number, lane: number) {
		return {
			x: this.W / 2 + lane * this.halfWidth(p) * 0.85,
			y: this.roadTop + (this.roadBottom - this.roadTop) * p,
		};
	}
	/** pistol pivots, left and right */
	guns() {
		const gap = Math.min(150 * this.k, this.W * 0.2);
		return [
			{ x: this.W / 2 - gap, y: this.FH + 6 },
			{ x: this.W / 2 + gap, y: this.FH + 6 },
		];
	}
	aimPoint(t: Target) {
		if (t.kind === 'crate') {
			const p = this.screen(t.crate.p, t.crate.lane);
			return { x: p.x, y: p.y - 18 * this.scale(t.crate.p) };
		}
		const p = this.screen(t.robot.p, t.robot.lane);
		return {
			x: p.x,
			y: p.y - HEAD[t.robot.type] * 0.5 * this.scale(t.robot.p) * ROBOTS[t.robot.type].size,
		};
	}
}

// ================= Rendering =================

export function render(ctx: C2D, g: Game) {
	const { W, FH } = g;
	ctx.save();
	ctx.beginPath();
	ctx.rect(0, 0, W, FH);
	ctx.clip();
	if (g.shake > 0)
		ctx.translate((Math.random() - 0.5) * 16 * g.shake, (Math.random() - 0.5) * 16 * g.shake);
	drawScene(ctx, g);
	const list: { p: number; draw: () => void }[] = [];
	// in the depth sort the barrier sits just in front of the robots it holds, behind any that got past
	if (g.barrierT > 0) list.push({ p: g.barrierP + 1e-6, draw: () => drawBarrier(ctx, g) });
	const blocks: LabelBlock[] = [];
	for (const c of g.crates) {
		list.push({ p: c.p, draw: () => drawCrate(ctx, g, c) });
		if (c.drop >= 1) blocks.push(crateBlock(ctx, g, c));
	}
	for (const rb of g.robots) {
		list.push({ p: rb.attack ? 2 : rb.p, draw: () => drawRobotAt(ctx, g, rb) });
		blocks.push(robotBlock(ctx, g, rb));
	}
	list.sort((a, b) => a.p - b.p);
	for (const d of list) d.draw();
	const lk = labelK(g);
	drawMessage(ctx, g, lk);
	drawLabels(ctx, blocks, { w: W, top: 6, bottom: FH - 60 * g.k }, hudRects(g, lk));
	drawEffects(ctx, g);
	for (const rb of g.robots) if (rb.attack) drawAttack(ctx, g, rb);
	drawGuns(ctx, g);
	if (g.hurtT > 0) {
		const v = ctx.createRadialGradient(
			W / 2,
			FH / 2,
			Math.min(W, FH) * 0.3,
			W / 2,
			FH / 2,
			Math.max(W, FH) * 0.7,
		);
		v.addColorStop(0, 'rgba(255,0,0,0)');
		v.addColorStop(1, `rgba(255,0,0,${g.hurtT})`);
		ctx.fillStyle = v;
		ctx.fillRect(0, 0, W, FH);
	}
	ctx.restore();
	drawHud(ctx, g, lk);
}

const labelK = (g: Game) => clamp(g.k, 0.85, 1.4);

function drawScene(ctx: C2D, g: Game) {
	const { W, FH, k } = g;
	const th = THEMES[g.theme] ?? THEMES['1'];
	const hz = g.roadTop;
	const sky = ctx.createLinearGradient(0, 0, 0, hz);
	sky.addColorStop(0, th.sky[0]);
	sky.addColorStop(1, th.sky[1]);
	ctx.fillStyle = sky;
	ctx.fillRect(0, 0, W, hz + 2);
	ctx.fillStyle = 'rgba(255,255,255,0.7)';
	for (let i = 0; i < 40; i++) {
		const y = hash(i + 3) * hz * 0.6;
		ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(g.time * 0.7 + i));
		ctx.fillRect(hash(i) * W, y, 1.5, 1.5);
	}
	ctx.globalAlpha = 1;
	drawSkyline(ctx, th, W, hz + 4, k, g.time);
	const ground = ctx.createLinearGradient(0, hz, 0, FH);
	ground.addColorStop(0, th.ground[0]);
	ground.addColorStop(1, th.ground[1]);
	ctx.fillStyle = ground;
	ctx.fillRect(0, hz, W, FH - hz);
	// road
	const tl = g.screen(0, -1.18);
	const tr = g.screen(0, 1.18);
	const bl = g.screen(1.3, -1.18);
	const br = g.screen(1.3, 1.18);
	ctx.fillStyle = th.road;
	ctx.beginPath();
	ctx.moveTo(tl.x, tl.y);
	ctx.lineTo(tr.x, tr.y);
	ctx.lineTo(br.x, br.y);
	ctx.lineTo(bl.x, bl.y);
	ctx.fill();
	ctx.strokeStyle = th.edge;
	ctx.lineWidth = 3 * k;
	for (const side of [-1.12, 1.12]) {
		const a = g.screen(0, side);
		const b = g.screen(1.3, side);
		ctx.beginPath();
		ctx.moveTo(a.x, a.y);
		ctx.lineTo(b.x, b.y);
		ctx.stroke();
	}
	ctx.fillStyle = 'rgba(230,230,230,0.8)';
	for (let p = 0; p < 1.3; p += 0.08) {
		const a = g.screen(p, 0);
		const b = g.screen(p + 0.035, 0);
		const w = (2 + 4 * p) * k;
		ctx.fillRect(a.x - w / 2, a.y, w, b.y - a.y);
	}
	// district buildings lining the road, back to front
	for (const [i, p] of [0.0, 0.1, 0.22, 0.36, 0.52, 0.7, 0.92].entries())
		for (const side of [-1, 1]) {
			const pos = g.screen(p, side * (1.55 + hash(i * 2 + side) * 0.5));
			const s = g.scale(p) * 4.2;
			ctx.save();
			ctx.translate(pos.x, pos.y);
			ctx.scale(side < 0 ? -s : s, s);
			ctx.fillStyle = 'rgba(0,0,0,0.3)';
			ctx.beginPath();
			ctx.ellipse(0, 0, 16, 2.5, 0, 0, Math.PI * 2);
			ctx.fill();
			drawDistrict(ctx, g.theme, g.time + i);
			ctx.restore();
		}
	if (g.level.id.includes('.')) {
		// rematches happen at night under red alert
		ctx.fillStyle = `rgba(120,0,30,${0.18 + 0.05 * Math.sin(g.time * 2)})`;
		ctx.fillRect(0, 0, W, FH);
	}
	// sandbag wall in front of the guns
	const bag = 70 * k;
	for (let x = -bag / 2; x < W + bag; x += bag * 0.95) {
		ctx.beginPath();
		ctx.ellipse(x, FH - 8 * k, bag * 0.55, 18 * k, 0, 0, Math.PI * 2);
		ctx.fillStyle = '#8a7a5a';
		ctx.fill();
		ctx.strokeStyle = '#5a4a2a';
		ctx.lineWidth = 2;
		ctx.stroke();
	}
}

function drawBarrier(ctx: C2D, g: Game) {
	const a = g.screen(g.barrierP, -1.15);
	const b = g.screen(g.barrierP, 1.15);
	const h = 60 * g.k * (g.scale(g.barrierP) / g.scale(BARRIER_P));
	const fade = g.barrierOut > 0 ? g.barrierOut / BARRIER_OUT : g.barrierIn;
	const alpha = (g.barrierT < 2 ? 0.4 + 0.4 * Math.sin(g.time * 20) : 0.8) * fade;
	ctx.fillStyle = `rgba(0,230,255,${alpha * 0.3})`;
	ctx.fillRect(a.x, a.y - h, b.x - a.x, h);
	ctx.strokeStyle = `rgba(120,240,255,${alpha})`;
	ctx.lineWidth = 3;
	for (let y = 0; y <= h; y += h / 4) {
		ctx.beginPath();
		ctx.moveTo(a.x, a.y - y);
		ctx.lineTo(b.x, b.y - y);
		ctx.stroke();
	}
}

const dropOffset = (g: Game, drop: number) => -420 * g.k * (1 - drop) ** 2;

/** body pose during an attack: offset (in robot units) and extra scale */
function attackPose(type: RobotType, f: number) {
	const up = clamp((f - 0.25) / (IMPACT - 0.25), 0, 1);
	switch (type) {
		case 'spider':
			// crouch, then pounce at the camera
			return { dx: 0, dy: f < 0.25 ? 4 : -Math.sin(up * Math.PI) * 60, sc: 1 + up * 2.2, rot: 0 };
		case 'janitor':
			return { dx: 0, dy: 0, sc: 1 + up * 0.4, rot: Math.sin(f * Math.PI * 2) * 0.35 };
		case 'trooper':
			return { dx: Math.sin(f * 50) * (f > 0.3 ? 1 : 0), dy: 0, sc: 1 + up * 0.2, rot: 0 };
		case 'brute':
			// wind up then lunge
			return {
				dx: 0,
				dy: f < 0.3 ? 3 : 0,
				sc: f < 0.3 ? 1 - f * 0.4 : 0.88 + up * 1.4,
				rot: f < 0.3 ? -f : 0,
			};
		case 'juggernaut':
			return {
				dx: 0,
				dy: Math.max(0, Math.sin(f * 30)) * (f > 0.4 && f < 0.7 ? 3 : 0),
				sc: 1,
				rot: 0,
			};
		case 'titan':
			return { dx: 0, dy: 0, sc: 1 + up * 0.15, rot: 0 };
		default:
			return { dx: 0, dy: -up * 10, sc: 1 + up * 0.1, rot: 0 };
	}
}

function drawRobotAt(ctx: C2D, g: Game, rb: Robot) {
	const pos = g.screen(rb.p, rb.lane);
	let s = g.scale(rb.p) * ROBOTS[rb.type].size;
	const y = pos.y + dropOffset(g, rb.drop);
	ctx.fillStyle = 'rgba(0,0,0,0.35)';
	ctx.beginPath();
	ctx.ellipse(pos.x, pos.y, 26 * s * (0.4 + 0.6 * rb.drop), 7 * s, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.save();
	ctx.translate(pos.x, y);
	if (rb.drop < 1) drawThruster(ctx, s);
	const frozen = rb.freezeT > 0;
	const walking = rb.drop >= 1 && !rb.targeted && !frozen && !g.ending;
	const t = walking || rb.attack ? g.time * (rb.type === 'spider' ? 14 : 5) + rb.seed : rb.seed;
	if (rb.attack) {
		const f = animFrac(rb);
		const pose = attackPose(rb.type, f);
		ctx.translate(pose.dx * s, pose.dy * s);
		ctx.rotate(pose.rot);
		s *= pose.sc;
		if (rb.type === 'spider' && f > IMPACT && !rb.targeted)
			ctx.globalAlpha = clamp(1 - (f - IMPACT) * 3, 0, 1);
	}
	if (rb.blownT !== null) {
		// staggering, sparking wreck
		const k = 1 - rb.blownT / BLOWN_TIME;
		ctx.translate((Math.random() - 0.5) * 6 * s, 0);
		ctx.rotate(Math.sin(rb.seed) * 0.35 * k);
		ctx.filter = `brightness(${1 - 0.5 * k}) sepia(${0.6 * k})`;
	}
	if (rb.targeted) {
		ctx.translate((Math.random() - 0.5) * 4, 0);
		ctx.globalAlpha = 0.6 + 0.4 * Math.sin(g.time * 40);
	}
	ctx.scale(s, s);
	DRAW[rb.type](ctx, t);
	ctx.restore();
	if (rb.blownT !== null) {
		const h = HEAD[rb.type] * s;
		for (let i = 0; i < 4; i++) {
			const fx = pos.x + (hash(rb.id + i) - 0.5) * 40 * s;
			const fy = pos.y - hash(rb.id * 3 + i) * h;
			const r = (5 + Math.random() * 7) * s;
			ctx.fillStyle = `rgba(255,${120 + Math.random() * 100},40,0.8)`;
			ctx.beginPath();
			ctx.arc(fx, fy - Math.random() * 6 * s, r, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.fillStyle = 'rgba(60,60,60,0.5)';
		ctx.beginPath();
		ctx.arc(pos.x, pos.y - h - 10 * s - ((g.time * 20) % (20 * s)), 12 * s, 0, Math.PI * 2);
		ctx.fill();
	}
	if (frozen) {
		// crackling EMP arcs
		ctx.strokeStyle = `rgba(140,200,255,${0.5 + Math.random() * 0.5})`;
		ctx.lineWidth = 1.5;
		const h = HEAD[rb.type] * s;
		for (let i = 0; i < 3; i++) {
			ctx.beginPath();
			let x = pos.x + (Math.random() - 0.5) * 50 * s;
			let yy = pos.y - Math.random() * h;
			ctx.moveTo(x, yy);
			for (let j = 0; j < 4; j++)
				ctx.lineTo((x += (Math.random() - 0.5) * 16 * s), (yy += (Math.random() - 0.5) * 16 * s));
			ctx.stroke();
		}
		ctx.fillStyle = 'rgba(116,185,255,0.18)';
		ctx.beginPath();
		ctx.ellipse(pos.x, pos.y - h / 2, 40 * s, h / 2 + 6, 0, 0, Math.PI * 2);
		ctx.fill();
	}
}

function drawThruster(ctx: C2D, s: number) {
	ctx.fillStyle = `rgba(255,${150 + Math.random() * 80},50,0.8)`;
	for (const dx of [-12, 12]) {
		ctx.beginPath();
		ctx.moveTo(dx * s - 6 * s, 0);
		ctx.lineTo(dx * s + 6 * s, 0);
		ctx.lineTo(dx * s, (20 + Math.random() * 14) * s);
		ctx.fill();
	}
}

function crack(ctx: C2D, x: number, y: number, r: number, seed: number) {
	ctx.strokeStyle = 'rgba(230,240,255,0.85)';
	ctx.lineWidth = 2;
	for (let i = 0; i < 7; i++) {
		const a = (i / 7) * Math.PI * 2 + hash(seed + i);
		let px = x;
		let py = y;
		ctx.beginPath();
		ctx.moveTo(px, py);
		for (let j = 1; j <= 3; j++) {
			const d = (r / 3) * j * (0.7 + hash(seed + i * 3 + j) * 0.6);
			px = x + Math.cos(a + (hash(seed + j + i) - 0.5) * 0.5) * d;
			py = y + Math.sin(a + (hash(seed + j + i) - 0.5) * 0.5) * d;
			ctx.lineTo(px, py);
		}
		ctx.stroke();
	}
	ctx.beginPath();
	ctx.arc(x, y, r * 0.18, 0, Math.PI * 2);
	ctx.stroke();
}

/**
 * How far through its attack animation a robot looks (0..1). The run-up to the hit is stretched
 * over the wind-up window, so the attack starts moving right away but lands WINDUP seconds later.
 */
function animFrac(rb: Robot) {
	const dur = ATTACK_TIME[rb.type];
	const t = rb.attack!.t;
	if (t >= IMPACT * dur) return Math.min(1, t / dur);
	return (IMPACT * (t + WINDUP)) / (WINDUP + IMPACT * dur);
}

/** the per-robot attack effects that fly at the player */
function drawAttack(ctx: C2D, g: Game, rb: Robot) {
	const { W, FH } = g;
	const dur = ATTACK_TIME[rb.type];
	const f = animFrac(rb);
	if (f >= 1) return;
	const after = f >= IMPACT;
	const pos = g.screen(1, rb.lane);
	const s = g.scale(1) * ROBOTS[rb.type].size;
	const up = clamp((f - 0.25) / (IMPACT - 0.25), 0, 1);
	const fade = after ? clamp(1 - (f - IMPACT) / (1 - IMPACT), 0, 1) : 1;
	const cx = W / 2;
	const cy = FH * 0.6;
	ctx.save();
	switch (rb.type) {
		case 'spider':
			if (after) {
				ctx.globalAlpha = fade;
				ctx.fillStyle = '#e8e8f0';
				for (const side of [-1, 1])
					for (let i = 0; i < 4; i++) {
						const x = cx + side * (40 + i * 34) * g.k;
						ctx.beginPath();
						ctx.moveTo(x - 10 * g.k, cy - 90 * g.k + i * 8);
						ctx.lineTo(x + 10 * g.k, cy - 90 * g.k + i * 8);
						ctx.lineTo(x, cy - 40 * g.k + i * 8);
						ctx.fill();
					}
				crack(ctx, cx, cy, 120 * g.k, rb.id);
			}
			break;
		case 'janitor': {
			if (f > 0.35) {
				// a wave of dirty mop water sloshes over the screen
				const w = clamp((f - 0.35) / 0.35, 0, 1);
				ctx.globalAlpha = 0.75 * fade;
				ctx.fillStyle = '#5fb8c8';
				ctx.beginPath();
				ctx.moveTo(pos.x, pos.y - 30 * s);
				ctx.quadraticCurveTo(cx, FH * (1 - w), W * w + pos.x * (1 - w), FH);
				ctx.lineTo(0, FH);
				ctx.quadraticCurveTo(0, FH * (1 - w * 0.6), pos.x, pos.y - 30 * s);
				ctx.fill();
				ctx.fillStyle = 'rgba(255,255,255,0.8)';
				for (let i = 0; i < 18; i++) {
					const bx = hash(rb.id + i) * W;
					const by = FH - hash(rb.id + i * 7) * FH * w;
					ctx.beginPath();
					ctx.arc(bx, by, (4 + hash(i) * 10) * g.k, 0, Math.PI * 2);
					ctx.fill();
				}
			}
			break;
		}
		case 'trooper': {
			const shots = [0.32, 0.42, 0.52, 0.6, 0.66, 0.72];
			const gun = { x: pos.x + 26 * s, y: pos.y - 50 * s };
			for (const [i, at] of shots.entries()) {
				const hx = cx + (hash(rb.id + i) - 0.5) * W * 0.6;
				const hy = FH * (0.4 + hash(rb.id + i * 3) * 0.45);
				if (f >= at && f < at + 0.05) {
					ctx.fillStyle = '#ffe066';
					ctx.beginPath();
					ctx.arc(gun.x, gun.y, 14 * s, 0, Math.PI * 2);
					ctx.fill();
					ctx.strokeStyle = 'rgba(255,230,120,0.9)';
					ctx.lineWidth = 3;
					ctx.beginPath();
					ctx.moveTo(gun.x, gun.y);
					ctx.lineTo(hx, hy);
					ctx.stroke();
				}
				if (f >= at + 0.03) {
					ctx.globalAlpha = fade;
					crack(ctx, hx, hy, 50 * g.k, rb.id + i * 11);
					ctx.fillStyle = '#111';
					ctx.beginPath();
					ctx.arc(hx, hy, 6 * g.k, 0, Math.PI * 2);
					ctx.fill();
					ctx.globalAlpha = 1;
				}
			}
			break;
		}
		case 'brute':
			if (f > 0.3) {
				// giant fist flying at the camera
				const u = clamp((f - 0.3) / (IMPACT - 0.3), 0, 1);
				const fx = pos.x + (cx - pos.x) * u;
				const fy = pos.y - 50 * s + (cy - (pos.y - 50 * s)) * u;
				const fs = (0.4 + u * u * 6) * g.k;
				ctx.globalAlpha = fade;
				ctx.save();
				ctx.translate(fx, fy);
				ctx.scale(fs, fs);
				plate(ctx, -30, -24, 60, 48, 14, GREY, 3);
				ctx.strokeStyle = 'rgba(0,0,0,0.45)';
				ctx.lineWidth = 3;
				for (const dx of [-15, 0, 15]) {
					ctx.beginPath();
					ctx.moveTo(dx, -20);
					ctx.lineTo(dx, 4);
					ctx.stroke();
				}
				ctx.restore();
				if (after) crack(ctx, cx, cy, 220 * g.k, rb.id);
			}
			break;
		case 'juggernaut':
			for (const side of [-1, 1]) {
				const from = { x: pos.x + side * 38 * s, y: pos.y - 67 * s };
				const to = { x: cx + side * W * 0.22, y: FH * 0.85 };
				const launch = 0.35 + (side > 0 ? 0.08 : 0);
				const u = clamp((f - launch) / (IMPACT - launch), 0, 1);
				if (f >= launch && u < 1) {
					const x = from.x + (to.x - from.x) * u;
					const y = from.y + (to.y - from.y) * u - Math.sin(u * Math.PI) * 60 * g.k;
					ctx.fillStyle = '#222';
					ctx.beginPath();
					ctx.arc(x, y, (4 + u * 26) * g.k, 0, Math.PI * 2);
					ctx.fill();
				}
				if (u >= 1) {
					const k2 = clamp((f - IMPACT) / 0.3, 0, 1);
					const R = (60 + 120 * k2) * g.k;
					ctx.fillStyle = `rgba(255,${Math.round(200 - 150 * k2)},50,${1 - k2})`;
					ctx.beginPath();
					ctx.arc(to.x, to.y, R, 0, Math.PI * 2);
					ctx.fill();
				}
			}
			break;
		case 'titan':
			for (const side of [-1, 1]) {
				const from = { x: pos.x + side * 52 * s, y: pos.y - 44 * s };
				if (!after) {
					eye(ctx, from.x, from.y, (3 + up * 14) * g.k, '#ffb142');
				} else {
					const to = { x: cx + side * 60 * g.k, y: FH };
					ctx.globalAlpha = fade;
					ctx.strokeStyle = '#ffb142';
					ctx.shadowColor = '#ff7a00';
					ctx.shadowBlur = 30;
					ctx.lineCap = 'round';
					ctx.lineWidth = 40 * g.k;
					ctx.beginPath();
					ctx.moveTo(from.x, from.y);
					ctx.lineTo(to.x, to.y);
					ctx.stroke();
					ctx.strokeStyle = '#fff3c0';
					ctx.lineWidth = 14 * g.k;
					ctx.stroke();
					ctx.shadowBlur = 0;
					ctx.lineCap = 'butt';
				}
			}
			if (after) {
				ctx.globalAlpha = 0.5 * fade;
				ctx.fillStyle = '#ff9f43';
				ctx.fillRect(0, 0, W, FH);
			}
			break;
		case 'overlord': {
			const core = { x: pos.x, y: pos.y - 86 * s };
			if (!after) {
				// motes converge on the core while it charges
				for (let i = 0; i < 16; i++) {
					const a = hash(i) * Math.PI * 2 + g.time;
					const d = (1 - ((up * 3 + hash(i + 9)) % 1)) * 200 * g.k;
					eye(ctx, core.x + Math.cos(a) * d, core.y + Math.sin(a) * d, 3 * g.k, '#ff8cf0');
				}
				eye(ctx, core.x, core.y, (6 + up * 30) * g.k, '#ff4be0');
			} else {
				ctx.globalAlpha = fade;
				const grad = ctx.createLinearGradient(core.x, core.y, cx, FH);
				grad.addColorStop(0, '#ffffff');
				grad.addColorStop(1, '#ff4be0');
				ctx.fillStyle = grad;
				ctx.shadowColor = '#ff4be0';
				ctx.shadowBlur = 40;
				ctx.beginPath();
				ctx.moveTo(core.x - 20 * s, core.y);
				ctx.lineTo(core.x + 20 * s, core.y);
				ctx.lineTo(W * 0.95, FH);
				ctx.lineTo(W * 0.05, FH);
				ctx.fill();
				ctx.shadowBlur = 0;
				ctx.globalAlpha = 0.85 * fade;
				ctx.fillStyle = '#ffe0fa';
				ctx.fillRect(0, 0, W, FH);
			}
			break;
		}
	}
	ctx.restore();
}

function drawCrate(ctx: C2D, g: Game, c: Crate) {
	const pos = g.screen(c.p, c.lane);
	const s = g.scale(c.p);
	const y = pos.y + dropOffset(g, c.drop) * 0.8;
	if (c.life < 4 && !c.opening && Math.floor(g.time * 6) % 2) return;
	ctx.save();
	ctx.translate(pos.x, y);
	ctx.scale(s, s);
	if (c.drop < 1) {
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
	plate(ctx, -22, -34, 44, 34, 3, ['#c49a5a', '#8b6b3d', '#4b3315'], 2.5);
	ctx.strokeStyle = '#4b3315';
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.moveTo(-20, -32);
	ctx.lineTo(20, -2);
	ctx.moveTo(20, -32);
	ctx.lineTo(-20, -2);
	ctx.stroke();
	// show what's inside so nobody grabs dynamite by accident
	ctx.fillStyle = 'rgba(0,0,0,0.45)';
	ctx.beginPath();
	ctx.arc(0, -17, 16, 0, Math.PI * 2);
	ctx.fill();
	drawIcon(ctx, c.reward, 0, -17, 28, g.time);
	ctx.restore();
}

// ---------- labels ----------
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
	const lk = labelK(g);
	const def = ROBOTS[rb.type];
	const ay = pos.y - HEAD[rb.type] * s * def.size;
	const fs = Math.round(((def.boss ? 20 : 15) + (7 * s) / g.k) * lk);
	const items = [
		item(
			ctx,
			rb.problem.text,
			fs,
			rb.targeted ? 'rgba(255,60,60,0.95)' : LABEL_BG[rb.type],
			'#fff',
			0,
			0,
		),
	];
	const parts = rb.problem.parts;
	if (parts && rb.drop >= 1 && g.up.scope) {
		const pfs = Math.round((11 + (4 * s) / g.k) * lk);
		const cols = parts.length > 4 ? 3 : 2;
		const sub = parts.map((part) =>
			item(
				ctx,
				part.revealed ? `${part.answer}` : part.text,
				pfs,
				part.revealed ? 'rgba(40,160,80,0.95)' : 'rgba(60,10,10,0.88)',
				part.revealed ? '#fff' : '#ff9a9a',
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
	return block(rb, pos.x, ay, items, 1, rb.p);
}

function crateBlock(ctx: C2D, g: Game, c: Crate): LabelBlock {
	const pos = g.screen(c.p, c.lane);
	const s = g.scale(c.p);
	const bg = c.opening ? 'rgba(255,60,60,0.95)' : 'rgba(200,160,40,0.95)';
	const fs = Math.round((14 + (6 * s) / g.k) * labelK(g));
	const main = item(ctx, c.problem.text, fs, bg, '#111', 0, 0);
	return block(c, pos.x, pos.y - 42 * s, [main], 1, c.p);
}

// ---------- guns ----------
function drawPistol(
	ctx: C2D,
	g: Game,
	x: number,
	y: number,
	angle: number,
	mirror: boolean,
	firing: boolean,
) {
	const k = g.k * 1.1;
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(angle + Math.PI / 2);
	ctx.scale(mirror ? -k : k, k);
	const recoil = firing ? Math.random() * 6 : 0;
	ctx.translate(0, recoil);
	const jam = g.jamT > 0 && g.groundT <= 0;
	// arm + hand
	plate(ctx, -14, -10, 28, 70, 10, ['#4a5a7a', '#2e3a52', '#151c2a'], 2.5);
	plate(ctx, -16, -34, 32, 30, 10, ['#e0b48a', '#b5835a', '#6a4528'], 2.5);
	// pistol
	plate(
		ctx,
		-9,
		-110,
		18,
		80,
		4,
		jam ? ['#c06a6a', '#7a3a3a', '#3a1010'] : ['#8a929e', '#3b3f46', '#16181c'],
		2.5,
	);
	plate(ctx, -6, -118, 12, 10, 2, DARK, 2);
	ctx.fillStyle = 'rgba(255,255,255,0.15)';
	for (let i = 0; i < 5; i++) rr(ctx, -6, -100 + i * 10, 12, 3, 1);
	eye(ctx, 0, -104, 2.2, g.up.laser ? '#ff3b3b' : '#5a5a5a');
	if (jam) {
		ctx.globalAlpha = 0.5;
		ctx.fillStyle = '#888';
		const k2 = (g.time * 1.5) % 1;
		ctx.beginPath();
		ctx.arc(4, -120 - k2 * 40, 6 + k2 * 10, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = 1;
	}
	ctx.restore();
}

function drawGuns(ctx: C2D, g: Game) {
	const guns = g.guns();
	const len = 128 * g.k * 1.1;
	guns.forEach((gun, i) => {
		const target = g.fire ? g.gunAim[i] : null;
		let aim: { x: number; y: number } | null = null;
		if (target) aim = g.aimPoint(target);
		else if (g.groundT > 0 && g.groundAim[i]) aim = g.screen(g.groundAim[i].p, g.groundAim[i].lane);
		const angle = aim
			? Math.atan2(aim.y - gun.y, aim.x - gun.x)
			: -Math.PI / 2 + (i ? 0.12 : -0.12);
		const mx = gun.x + Math.cos(angle) * len;
		const my = gun.y + Math.sin(angle) * len;
		const firing = aim !== null && Math.floor(g.time * 30 + i * 0.5) % 2 === 0;
		if (aim && firing) {
			ctx.strokeStyle = 'rgba(255,230,120,0.9)';
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(mx, my);
			ctx.lineTo(aim.x + (Math.random() - 0.5) * 16, aim.y + (Math.random() - 0.5) * 16);
			ctx.stroke();
			ctx.fillStyle = '#ffe066';
			ctx.beginPath();
			ctx.arc(mx, my, (10 + Math.random() * 6) * g.k, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = g.groundT > 0 ? 'rgba(120,90,60,0.8)' : '#fff6';
			ctx.beginPath();
			ctx.arc(
				aim.x + (Math.random() - 0.5) * 20,
				aim.y,
				(8 + Math.random() * 8) * g.k,
				0,
				Math.PI * 2,
			);
			ctx.fill();
		}
		drawPistol(ctx, g, gun.x, gun.y, angle, i === 0, aim !== null);
	});
}

// ---------- effects + HUD ----------
function drawEffects(ctx: C2D, g: Game) {
	for (const e of g.effects) {
		if (e.t < 0) continue;
		const k = e.t / e.dur;
		if (e.kind === 'boom' || e.kind === 'big') {
			const R = (e.kind === 'big' ? 90 : 40) * (0.3 + k) * g.k;
			ctx.fillStyle = `rgba(255,${Math.round(200 - 150 * k)},50,${1 - k})`;
			ctx.beginPath();
			ctx.arc(e.x, e.y, R, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = `rgba(60,60,60,${0.6 * (1 - k)})`;
			ctx.beginPath();
			ctx.arc(e.x, e.y - R * 0.4, R * 0.7, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = `rgba(80,80,90,${1 - k})`;
			for (let i = 0; i < 6; i++) {
				const a = (i / 6) * Math.PI * 2 + e.x;
				ctx.fillRect(
					e.x + Math.cos(a) * R * 1.2 * k,
					e.y + Math.sin(a) * R * k - 30 * k * k,
					6 * g.k,
					4 * g.k,
				);
			}
		} else if (e.kind === 'emp') {
			ctx.strokeStyle = `rgba(116,185,255,${1 - k})`;
			ctx.lineWidth = 8;
			ctx.beginPath();
			ctx.arc(e.x, e.y, Math.max(g.W, g.FH) * k, 0, Math.PI * 2);
			ctx.stroke();
		} else if (e.kind === 'shield') {
			ctx.strokeStyle = `rgba(116,185,255,${1 - k})`;
			ctx.fillStyle = `rgba(116,185,255,${0.3 * (1 - k)})`;
			ctx.lineWidth = 5;
			ctx.beginPath();
			ctx.arc(e.x, e.y, (60 + 80 * k) * g.k, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
		} else if (e.kind === 'text') {
			ctx.font = `bold ${Math.round(22 * labelK(g))}px sans-serif`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'alphabetic';
			ctx.fillStyle = e.color ?? '#fff';
			ctx.globalAlpha = 1 - k;
			ctx.fillText(e.text ?? '', e.x, e.y - 40 * k);
			ctx.globalAlpha = 1;
		}
	}
}

function hudRects(g: Game, lk: number): Rect[] {
	return [
		[0, 0, (44 + g.maxHp * 34 + 70) * lk, 46 * lk],
		[g.W - 170 * lk, 0, g.W, 84 * lk],
	];
}

function drawHud(ctx: C2D, g: Game, lk: number) {
	const { W } = g;
	ctx.save();
	ctx.scale(lk, lk);
	const w = W / lk;
	for (let i = 0; i < g.maxHp; i++) drawHeart(ctx, 24 + i * 34, 26, i < g.hp);
	ctx.textBaseline = 'alphabetic';
	if (g.shield > 0) {
		ctx.fillStyle = '#74b9ff';
		ctx.font = 'bold 18px sans-serif';
		ctx.textAlign = 'left';
		ctx.fillText(`🛡×${g.shield}`, 24 + g.maxHp * 34, 32);
	}
	ctx.textAlign = 'right';
	ctx.font = 'bold 18px sans-serif';
	ctx.fillStyle = '#ffd84a';
	ctx.fillText(`$${g.money}`, w - 16, 30);
	ctx.fillStyle = '#fff';
	ctx.fillText(
		g.endless ? `Wave ${g.waveIdx + 1}` : `Wave ${g.waveIdx + 1}/${g.totalWaves}`,
		w - 16,
		54,
	);
	if (!g.endless && !g.lastWave) {
		const left = Math.max(0, Math.ceil(g.level.waveTime - (g.time - g.waveStart)));
		ctx.fillStyle = left <= 5 ? '#ff7675' : '#bbb';
		ctx.font = '14px sans-serif';
		ctx.fillText(`next wave in ${left}s`, w - 16, 74);
	}
	ctx.textAlign = 'left';
	ctx.font = 'bold 16px sans-serif';
	if (g.barrierT > 0) {
		ctx.fillStyle = '#81ecec';
		ctx.fillText(`Barrier ${g.barrierT.toFixed(1)}s`, 16, 70);
	}
	ctx.restore();
}

/** banner text ("Wave 2 / 3", "Jammed!"); drawn under the problem labels so it never hides them */
function drawMessage(ctx: C2D, g: Game, lk: number) {
	if (g.messageT <= 0) return;
	ctx.save();
	ctx.scale(lk, lk);
	ctx.globalAlpha = Math.min(1, g.messageT);
	ctx.font = 'bold 34px sans-serif';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'alphabetic';
	ctx.fillStyle = '#fff';
	ctx.strokeStyle = '#000';
	ctx.lineWidth = 5;
	ctx.strokeText(g.message, g.W / lk / 2, 110);
	ctx.fillText(g.message, g.W / lk / 2, 110);
	ctx.restore();
}

function drawHeart(ctx: C2D, x: number, y: number, full: boolean) {
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

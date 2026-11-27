import { type C2D, DRAW, plate } from './art';
import { ACHIEVEMENTS, Game, type Result, render } from './engine';
import { isRematch, LEVELS, type LevelDef, type PaletteKey, themeOf } from './levels';
import { inputTex } from './mathin';
import {
	ARMOR,
	type Attempt,
	attemptScore,
	BASE_HP,
	freshSave,
	ITEM_CAP,
	ITEM_UPGRADES,
	ITEMS,
	loadSave,
	maxHpOf,
	persist,
	type Save,
	saveHooks,
	UPGRADES,
	type Upgrade,
} from './save';
import { drawDistrict, drawIcon, hash, type IconKey, THEMES } from './scenery';
import { type DriveStatus, pemdasSync } from './sync';
import { loadTex, texHost } from './tex';

type Rect = { x: number; y: number; w: number; h: number };
type Hit = Rect & { down?: () => void; hold?: boolean; poly?: number[] };
type Screen = 'title' | 'shop' | 'game';

/** the logical canvas's shorter side; everything is laid out in these units */
export const LOGICAL_MIN = 680;
const QUIT_HOLD = 3;
/** holding backspace this long turns it into a quit (overlay appears) */
const QUIT_SHOW = 1;
const byId = (id: string) => LEVELS.find((l) => l.id === id);
/** shown on the map badge and in the info panel */
const badgeOf = (lv: LevelDef) => lv.badge ?? lv.id;
/** neighborhood name (rematches use their parent's) */
const districtOf = (lv: LevelDef): string =>
	lv.district ?? (lv.requires?.[0] ? districtOf(byId(lv.requires[0])!) : '');
/** every level upstream of this one */
function ancestors(lv: LevelDef, out = new Set<LevelDef>()) {
	for (const id of lv.requires ?? []) {
		const p = byId(id);
		if (p && !out.has(p)) {
			out.add(p);
			ancestors(p, out);
		}
	}
	return out;
}
/** big faint names over parts of the map */
const REGIONS: { name: string; at: [number, number] }[] = [
	{ name: 'THE CITY', at: [3, -0.95] },
	{ name: 'TOY TOWN', at: [-3, -3.3] },
	{ name: 'THE ACADEMY', at: [-0.4, 4.1] },
];

const inRect = (r: Rect, x: number, y: number) =>
	x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
function inPoly(pts: number[], x: number, y: number) {
	let inside = false;
	for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
		const [xi, yi, xj, yj] = [pts[i], pts[i + 1], pts[j], pts[j + 1]];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}

// ---------- text helpers ----------
const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
function text(
	ctx: C2D,
	s: string,
	x: number,
	y: number,
	size: number,
	color: string,
	align: CanvasTextAlign = 'left',
	weight = 'bold',
	font = FONT,
) {
	ctx.font = `${weight} ${size}px ${font}`;
	ctx.fillStyle = color;
	ctx.textAlign = align;
	ctx.textBaseline = 'middle';
	ctx.fillText(s, x, y);
}
function wrap(ctx: C2D, s: string, maxW: number, size: number, weight = 'normal') {
	ctx.font = `${weight} ${size}px ${FONT}`;
	const lines: string[] = [];
	let line = '';
	for (const word of s.split(' ')) {
		const next = line ? `${line} ${word}` : word;
		if (ctx.measureText(next).width > maxW && line) {
			lines.push(line);
			line = word;
		} else line = next;
	}
	if (line) lines.push(line);
	return lines;
}
function roundRect(
	ctx: C2D,
	r: Rect,
	rad: number,
	fill: string | CanvasGradient,
	stroke?: string,
	lw = 2,
) {
	ctx.beginPath();
	ctx.roundRect(r.x, r.y, r.w, r.h, rad);
	ctx.fillStyle = fill;
	ctx.fill();
	if (stroke) {
		ctx.strokeStyle = stroke;
		ctx.lineWidth = lw;
		ctx.stroke();
	}
}
/** the largest size up to `max` (and at least `min`) at which `s` fits in `maxW` on one line */
function fitSize(ctx: C2D, s: string, maxW: number, max: number, min = 7, weight = 'bold') {
	ctx.font = `${weight} ${max}px ${FONT}`;
	const w = ctx.measureText(s).width;
	return Math.max(min, w > maxW && w > 0 ? (max * maxW) / w : max);
}
/** wrap `s` at the largest size up to `max` whose lines fit a `maxW` x `maxH` box (cut off below `min`) */
function fitWrap(ctx: C2D, s: string, maxW: number, maxH: number, max: number, min = 7, lh = 1.25) {
	let size = max;
	let lines = wrap(ctx, s, maxW, size);
	const over = () =>
		lines.length * size * lh > maxH || lines.some((l) => ctx.measureText(l).width > maxW);
	while (size > min && over()) {
		size = Math.max(min, size - 0.5);
		lines = wrap(ctx, s, maxW, size);
	}
	return { size, lines: lines.slice(0, Math.max(0, Math.floor(maxH / (size * lh)))) };
}
const NUMPAD_KEY = 'pemdas-numpad';
/** template keys over the keypad on LaTeX levels; □ marks a box to fill */
const PALETTE: Record<PaletteKey, { label: string; ins: string }> = {
	frac: { label: 'a/b', ins: '\\frac{□}{□}' },
	sqrt: { label: '√', ins: '\\sqrt{□}' },
	pi: { label: 'π', ins: '\\pi ' },
	i: { label: 'i', ins: 'i' },
	x: { label: 'x', ins: 'x' },
	pow: { label: 'xⁿ', ins: '^{□}' },
	paren: { label: '( )', ins: '(□)' },
	plus: { label: '+', ins: '+' },
	comma: { label: ',', ins: ', ' },
	vec2: { label: '(a,b)', ins: '(□, □)' },
	vec3: { label: '(a,b,c)', ins: '(□, □, □)' },
	mat2: { label: '2×2', ins: '\\begin{pmatrix}□&□\\\\□&□\\end{pmatrix}' },
	mat3: {
		label: '3×3',
		ins: '\\begin{pmatrix}□&□&□\\\\□&□&□\\\\□&□&□\\end{pmatrix}',
	},
};
const starStr = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);

export class App {
	W = 1000;
	H = LOGICAL_MIN;
	save: Save;
	screen: Screen = 'title';
	selected: LevelDef = LEVELS[0];
	game: Game | null = null;
	input = '';
	/** where typing goes in `input` (LaTeX levels); a □ right here is the box being filled */
	cursor = 0;
	feedback: { kind: 'hit' | 'miss' | 'blocked'; t: number } | null = null;
	hits: Hit[] = [];
	time = 0;
	shownMoney: number;
	gains: { amount: number; t: number }[] = [];
	quitT = 0;
	escHeld = false;
	quitPointer: number | null = null;
	pressed: { r: Rect; t: number } | null = null;
	confirmReset = 0;
	newBest = false;
	shopMsg = 'Welcome to Robo-Mart! Everything is salvaged.';
	/** when the shop's neon sign next flickers */
	signNext = 5 + Math.random() * 25;
	/** in-game keypad laid out like a numpad (789 on top) instead of a phone (123 on top); per device */
	numpad = (() => {
		try {
			return localStorage.getItem(NUMPAD_KEY) === '1';
		} catch {
			return false;
		}
	})();
	onExit: () => void;
	dt = 0;
	/** level map: camera centre (node units), whether it eases toward the selection, and drag-panning */
	cam: { x: number; y: number } | null = null;
	camFollow = true;
	drag: { id: number; x: number; y: number; cx: number; cy: number; moved: boolean } | null = null;
	mapR: Rect = { x: 0, y: 0, w: 0, h: 0 };

	constructor(onExit: () => void) {
		this.save = loadSave();
		this.shownMoney = this.save.money;
		this.onExit = onExit;
		saveHooks.changed = () => pemdasSync.changed();
		pemdasSync.start(
			() => this.save,
			(s) => {
				this.save = s;
				// money from another device counts up like a level reward
				this.shownMoney = Math.min(this.shownMoney, s.money);
			},
		);
	}

	/** Google Drive sync, styled like Dungeon World's button */
	driveButton(ctx: C2D, r: Rect) {
		const sync = pemdasSync;
		const LABELS: Partial<Record<DriveStatus, string>> = {
			off: 'Sync with Google Drive',
			auth: 'Sign in to Drive again',
			syncing: 'Syncing…',
			saving: 'Saving…',
			offline: 'Offline — saved here',
			error: 'Sync error — retry',
		};
		const COLORS: Record<DriveStatus, string> = {
			off: '#3a3d44',
			auth: '#a04040',
			error: '#a04040',
			offline: '#5a5a5a',
			saving: '#8a7a3a',
			syncing: '#b8942e',
			synced: '#b8942e',
		};
		const status = sync.status;
		const label = LABELS[status] ?? (sync.account ? `Drive ✓ ${sync.account}` : 'Drive ✓');
		const xw = sync.enabled ? 28 : 0;
		this.button(ctx, { ...r, w: r.w - xw - (xw ? 4 : 0) }, label, {
			size: 12,
			color: COLORS[status],
			down: () => void sync.syncNow(),
		});
		if (xw)
			this.button(ctx, { x: r.x + r.w - xw, y: r.y, w: xw, h: r.h }, '✕', {
				size: 13,
				down: () => sync.disconnect(),
			});
	}

	resize(W: number, H: number) {
		this.W = W;
		this.H = H;
	}
	get landscape() {
		return this.W >= this.H * 1.05;
	}

	// ---------- state helpers ----------
	unlocked(lv: LevelDef) {
		return (
			!lv.requires?.length ||
			lv.requires.some((id) => (this.save.stars[id] ?? 0) > 0) ||
			!!this.save.unlocked?.[lv.id]
		);
	}
	/** a locked level needs a double tap to select (and then can be played early) */
	lastTap: { lv: LevelDef; t: number } | null = null;
	pick(lv: LevelDef) {
		if (this.unlocked(lv) || (this.lastTap?.lv === lv && this.time - this.lastTap.t < 0.45))
			this.select(lv);
		this.lastTap = { lv, t: this.time };
	}
	select(lv: LevelDef) {
		this.selected = lv;
		this.camFollow = true;
	}
	beaten(lv: LevelDef) {
		return (this.save.stars[lv.id] ?? 0) > 0;
	}
	/** the shop opens once any level is beaten */
	get shopOpen() {
		return Object.values(this.save.stars).some((n) => n > 0);
	}

	start(lv: LevelDef, endless: boolean) {
		const upgrades = Object.fromEntries(Object.entries(this.save.upgrades).filter(([, on]) => on));
		this.game = new Game(
			lv,
			endless,
			{ maxHp: maxHpOf(this.save), items: this.save.items, upgrades },
			(r) => this.finish(r),
		);
		this.selected = lv;
		this.input = '';
		this.cursor = 0;
		// typeset problems: LaTeX levels, and Academy levels with whole-number answers
		if (lv.latex || lv.crate().tex) void loadTex();
		this.quitT = 0;
		this.newBest = false;
		this.screen = 'game';
	}

	finish(r: Result) {
		const lv = this.selected;
		let stars = 0;
		const money = r.money;
		const wasOpen = new Set(LEVELS.filter((l) => this.unlocked(l)));
		// playing a level early: a loss changes nothing (no money or records),
		// a win also opens every level upstream of it
		const early = !r.endless && !wasOpen.has(lv);
		if (early && !r.won) {
			this.save.items = { ...r.items };
			persist(this.save);
			this.game = null;
			this.screen = 'title';
			return;
		}
		if (!r.endless && r.won) {
			// 3 stars = flawless: no damage taken and no wrong answers
			// any damage = 1 star; rematches also drop to 1 star for using a consumable.
			// Otherwise a wrong answer costs the third star.
			const rematch = isRematch(lv);
			stars = r.damaged || (rematch && r.usedItems) ? 1 : r.accuracy >= 1 ? 3 : 2;
			this.save.stars[lv.id] = Math.max(stars, this.save.stars[lv.id] ?? 0);
		}
		if (r.endless)
			this.save.endlessBest[lv.id] = Math.max(r.wave, this.save.endlessBest[lv.id] ?? 0);
		const attempt: Attempt = {
			won: r.won,
			stars,
			hp: r.hp,
			maxHp: r.maxHp,
			accuracy: r.accuracy,
			avgSolve: r.avgSolve,
			bossTime: r.bossTime,
			kills: r.kills,
			money,
			wave: r.wave,
		};
		const key = r.endless ? `${lv.id}:endless` : lv.id;
		const rec = this.save.records[key];
		this.newBest =
			!rec?.best || attemptScore(attempt, r.endless) > attemptScore(rec.best, r.endless);
		this.save.records[key] = { last: attempt, best: this.newBest ? attempt : rec?.best };
		// beating a level jumps to the one it unlocked (main levels before rematches), carrying this run's stats
		const fresh = LEVELS.filter((l) => !wasOpen.has(l) && this.unlocked(l));
		const next = fresh.find((l) => !isRematch(l)) ?? fresh[0];
		if (early) {
			this.save.unlocked ??= {};
			for (const l of [lv, ...ancestors(lv)]) this.save.unlocked[l.id] = true;
		}
		if (next) {
			this.select(next);
			this.newBest = false;
			if (!this.save.records[next.id])
				this.save.records[next.id] = { last: { ...attempt, from: lv.id } };
		}
		this.save.money += money;
		if (money > 0) this.gains.push({ amount: money, t: 0 });
		this.save.items = { ...r.items };
		for (const a of r.achievements) this.save.achievements[a] = true;
		persist(this.save);
		this.game = null;
		this.screen = 'title';
	}

	quit() {
		const g = this.game;
		if (!g || g.result) return;
		g.result = g.makeResult(false);
		this.finish(g.result);
	}

	type(ch: string) {
		const g = this.game;
		if (!g) return;
		if (g.blocked) {
			this.feedback = { kind: 'blocked', t: 0.3 };
			return;
		}
		if (g.level.latex) return this.insert(ch);
		if (ch === '-' && this.input !== '') return;
		if (this.input.length < 8) this.input += ch;
	}
	/** LaTeX levels: put text (or a template) at the cursor, filling the box there if there is one */
	insert(s: string) {
		if (this.input.length + s.length > 120) return;
		const at = this.cursor;
		const fill = this.input[at] === '□' ? 1 : 0;
		this.input = this.input.slice(0, at) + s + this.input.slice(at + fill);
		// a template puts the cursor on its first box; anything else leaves it just after
		const box = s.indexOf('□');
		this.cursor = box >= 0 ? at + box : at + s.length;
	}
	/** jump to the next empty box (wrapping around), or to the end once they're all filled */
	nextSlot() {
		const after = this.input.indexOf('□', this.cursor + 1);
		const first = this.input.indexOf('□');
		this.cursor = after >= 0 ? after : first >= 0 ? first : this.input.length;
	}
	submit() {
		const g = this.game;
		if (!g) return;
		const res = g.submit(this.input);
		if (res === 'busy') return;
		if (res === 'unreadable') {
			this.feedback = { kind: 'blocked', t: 0.35 };
			return;
		}
		this.feedback = { kind: res, t: 0.35 };
		this.input = '';
		this.cursor = 0;
	}
	/** Backspace / X: does nothing with nothing typed; otherwise clears it (and may waste a volley) */
	backspace() {
		const g = this.game;
		if (!g || g.blocked || this.input === '') return;
		g.backspace();
		this.input = '';
		this.cursor = 0;
	}

	// ---------- input ----------
	keyDown(code: string, repeat: boolean, key = ''): boolean {
		if (this.screen === 'game') {
			if (code === 'Escape') {
				this.escHeld = true;
				return true;
			}
			if (repeat) return true;
			const it = ITEMS.find((i) => i.code === code);
			if (it) this.game?.useItem(it.key);
			else if (this.game?.level.latex) {
				// LaTeX levels take any typed character; Enter fires, Tab jumps to the next box
				if (code === 'Enter' || code === 'NumpadEnter') this.submit();
				else if (code === 'Tab') this.nextSlot();
				else if (code === 'Backspace' || code === 'Delete') this.backspace();
				else if (key.length === 1) this.type(key);
				else return false;
			} else if (/^(Digit|Numpad)\d$/.test(code)) this.type(code.slice(-1));
			else if (code === 'Minus' || code === 'NumpadSubtract') this.type('-');
			else if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') this.submit();
			else if (code === 'Backspace' || code === 'Delete') this.backspace();
			else return false;
			return true;
		}
		if (this.screen === 'title' && (code === 'Enter' || code === 'NumpadEnter')) {
			this.start(this.selected, false);
			return true;
		}
		const dirs: Record<string, [number, number]> = {
			ArrowRight: [1, 0],
			ArrowLeft: [-1, 0],
			ArrowUp: [0, -1],
			ArrowDown: [0, 1],
		};
		if (this.screen === 'title' && dirs[code]) {
			// the nearest open level in that direction (straight ahead beats off to the side)
			const [dx, dy] = dirs[code];
			const [sx, sy] = this.selected.node;
			let best: LevelDef | null = null;
			let bestD = Infinity;
			for (const l of LEVELS) {
				if (l === this.selected || !this.unlocked(l)) continue;
				const ox = l.node[0] - sx;
				const oy = l.node[1] - sy;
				const ahead = ox * dx + oy * dy;
				if (ahead <= 0.05) continue;
				const d = ahead + Math.abs(ox * dy - oy * dx) * 2;
				if (d < bestD) {
					bestD = d;
					best = l;
				}
			}
			if (best) this.select(best);
			return true;
		}
		if (this.screen === 'shop' && (code === 'Escape' || code === 'Backspace')) {
			this.screen = 'title';
			return true;
		}
		return false;
	}
	keyUp(code: string) {
		if (code === 'Escape') this.escHeld = false;
	}
	pointerDown(x: number, y: number, id: number) {
		if (this.screen === 'title' && inRect(this.mapR, x, y) && this.cam)
			this.drag = { id, x, y, cx: this.cam.x, cy: this.cam.y, moved: false };
		for (let i = this.hits.length - 1; i >= 0; i--) {
			const h = this.hits[i];
			if (h.poly ? inPoly(h.poly, x, y) : inRect(h, x, y)) {
				if (h.hold) this.quitPointer = id;
				if (!h.poly) this.pressed = { r: h, t: 0.12 };
				h.down?.();
				return;
			}
		}
	}
	pointerMove(x: number, y: number, id: number) {
		const d = this.drag;
		if (!d || d.id !== id || !this.cam) return;
		if (!d.moved && Math.hypot(x - d.x, y - d.y) < 8) return;
		d.moved = true;
		this.camFollow = false;
		const U = this.nodeUnit(this.mapR);
		this.cam = { x: d.cx - (x - d.x) / U, y: d.cy - (y - d.y) / U };
	}
	wheel(dx: number, dy: number) {
		if (this.screen !== 'title' || !this.cam) return;
		this.camFollow = false;
		const U = this.nodeUnit(this.mapR);
		this.cam = { x: this.cam.x + dx / U, y: this.cam.y + dy / U };
	}
	pointerUp(id: number) {
		if (this.drag?.id === id) this.drag = null;
		if (this.quitPointer === id) {
			this.quitPointer = null;
			// a short press on the backspace/quit key is a backspace
			if (this.quitT < QUIT_SHOW && !this.escHeld) this.backspace();
		}
	}

	// ---------- frame ----------
	frame(ctx: C2D, dt: number) {
		this.time += dt;
		this.dt = dt;
		if (this.feedback && (this.feedback.t -= dt) <= 0) this.feedback = null;
		if (this.pressed && (this.pressed.t -= dt) <= 0) this.pressed = null;
		this.confirmReset = Math.max(0, this.confirmReset - dt);
		// count money up toward the real total
		if (this.shownMoney < this.save.money) {
			const rate = Math.max(40, (this.save.money - this.shownMoney) * 1.8);
			this.shownMoney = Math.min(this.save.money, this.shownMoney + rate * dt);
		} else this.shownMoney = this.save.money;
		for (const gn of this.gains) gn.t += dt;
		this.gains = this.gains.filter((gn) => gn.t < 2.2);

		this.hits = [];
		texHost.layer?.begin();
		ctx.clearRect(0, 0, this.W, this.H);
		if (this.screen === 'game' && this.game) {
			const holding = this.escHeld || this.quitPointer !== null;
			this.quitT = holding ? this.quitT + dt : 0;
			if (this.quitT >= QUIT_HOLD) return this.quit();
			this.game.update(dt);
			if (this.game) this.drawGame(ctx, this.game);
		} else if (this.screen === 'shop') this.drawShop(ctx);
		else {
			this.screen = 'title';
			this.drawTitle(ctx);
		}
		texHost.layer?.end();
	}

	button(
		ctx: C2D,
		r: Rect,
		label: string,
		opts: {
			color?: string;
			disabled?: boolean;
			size?: number;
			icon?: IconKey;
			down?: () => void;
			hold?: boolean;
			sub?: string;
		} = {},
	) {
		const pressed = this.pressed && this.pressed.r.x === r.x && this.pressed.r.y === r.y;
		const base = opts.disabled ? '#3a3d44' : (opts.color ?? '#4a5262');
		const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
		g.addColorStop(0, pressed ? '#222' : lighten(base));
		g.addColorStop(1, base);
		ctx.save();
		ctx.shadowColor = 'rgba(0,0,0,0.5)';
		ctx.shadowOffsetY = pressed ? 0 : 3;
		roundRect(ctx, r, Math.min(12, r.h / 3), g, '#0c0d10', 2.5);
		ctx.restore();
		// labels shrink rather than spill out of narrow buttons
		const size = fitSize(ctx, label, r.w - 8, opts.size ?? Math.min(24, r.h * 0.42));
		const fg = opts.disabled ? '#8a8d94' : '#fff';
		if (opts.icon) {
			const is = Math.min(r.h * 0.6, r.w * 0.4);
			drawIcon(
				ctx,
				opts.icon,
				r.x + r.w / 2,
				r.y + r.h / 2 - (label ? size * 0.6 : 0),
				is,
				this.time,
			);
			if (label) text(ctx, label, r.x + r.w / 2, r.y + r.h - size * 0.8, size * 0.7, fg, 'center');
		} else {
			text(
				ctx,
				label,
				r.x + r.w / 2,
				r.y + r.h / 2 - (opts.sub ? size * 0.35 : 0),
				size,
				fg,
				'center',
			);
			if (opts.sub)
				text(
					ctx,
					opts.sub,
					r.x + r.w / 2,
					r.y + r.h / 2 + size * 0.6,
					size * 0.55,
					fg,
					'center',
					'normal',
				);
		}
		if (!opts.disabled && (opts.down || opts.hold))
			this.hits.push({ ...r, down: opts.down, hold: opts.hold });
	}

	// ================= game screen =================
	drawGame(ctx: C2D, g: Game) {
		const { W, H } = this;
		// LaTeX levels need room for the template keys over the keypad
		const PH = Math.round(
			this.landscape
				? Math.max(150, H * (g.level.latex ? 0.37 : 0.27))
				: H * (g.level.latex ? 0.44 : 0.4),
		);
		const FH = H - PH;
		g.resize(W, FH);
		render(ctx, g);
		this.drawPanel(ctx, g, FH, PH);
		if (this.quitT >= QUIT_SHOW) {
			ctx.fillStyle = 'rgba(0,0,0,0.5)';
			ctx.fillRect(0, 0, W, FH);
			const cx = W / 2;
			const cy = FH / 2;
			ctx.strokeStyle = '#444';
			ctx.lineWidth = 10;
			ctx.beginPath();
			ctx.arc(cx, cy, 50, 0, Math.PI * 2);
			ctx.stroke();
			ctx.strokeStyle = '#ff5a5a';
			ctx.beginPath();
			ctx.arc(cx, cy, 50, -Math.PI / 2, -Math.PI / 2 + (this.quitT / QUIT_HOLD) * Math.PI * 2);
			ctx.stroke();
			text(ctx, `${Math.ceil(QUIT_HOLD - this.quitT)}`, cx, cy, 36, '#fff', 'center');
			text(ctx, 'Keep holding to quit', cx, cy + 80, 22, '#fff', 'center');
		}
	}

	drawPanel(ctx: C2D, g: Game, y0: number, PH: number) {
		const { W } = this;
		const bg = ctx.createLinearGradient(0, y0, 0, y0 + PH);
		bg.addColorStop(0, '#2c313a');
		bg.addColorStop(1, '#16191e');
		ctx.fillStyle = bg;
		ctx.fillRect(0, y0, W, PH);
		ctx.fillStyle = '#ffc61a';
		ctx.fillRect(0, y0, W, 4);
		ctx.fillStyle = '#1a1a1a';
		for (let x = 0; x < W; x += 24) ctx.fillRect(x, y0, 10, 4);
		const pad = 10;
		let itemsR: Rect;
		let keysR: Rect;
		let ansR: Rect;
		if (this.landscape) {
			const side = Math.min(W * 0.3, 360);
			itemsR = { x: pad, y: y0 + pad + 4, w: side, h: PH - 2 * pad - 4 };
			keysR = { x: W - pad - side, y: y0 + pad + 4, w: side, h: PH - 2 * pad - 4 };
			const cx0 = itemsR.x + side + pad;
			const cw = keysR.x - pad - cx0;
			ansR = {
				x: cx0 + cw * 0.08,
				y: y0 + pad + 4 + PH * 0.12,
				w: cw * 0.84,
				h: PH * 0.38,
			};
		} else {
			const rowH = PH * 0.19;
			ansR = { x: pad, y: y0 + pad + 4, w: W - 2 * pad, h: rowH - pad };
			itemsR = { x: pad, y: y0 + rowH + pad, w: W - 2 * pad, h: rowH - pad };
			keysR = { x: pad, y: y0 + 2 * rowH + pad, w: W - 2 * pad, h: PH - 2 * rowH - 2 * pad };
		}
		this.drawAnswer(ctx, g, ansR);

		// items
		const cols = this.landscape ? 2 : 4;
		const rows = this.landscape ? 2 : 1;
		const gw = (itemsR.w - (cols - 1) * 8) / cols;
		const gh = (itemsR.h - (rows - 1) * 8) / rows;
		ITEMS.forEach((it, i) => {
			const r = {
				x: itemsR.x + (i % cols) * (gw + 8),
				y: itemsR.y + Math.floor(i / cols) * (gh + 8),
				w: gw,
				h: gh,
			};
			const n = g.items[it.key];
			this.button(ctx, r, '', {
				disabled: n <= 0 || g.ending !== null,
				down: () => g.useItem(it.key),
			});
			const is = Math.min(r.h * 0.6, r.w * 0.3);
			ctx.globalAlpha = n > 0 ? 1 : 0.4;
			drawIcon(ctx, it.key, r.x + is * 0.7 + 4, r.y + r.h / 2, is, this.time);
			const tx = r.x + is * 1.4 + 8;
			const fs = Math.min(17, r.h * 0.26, (r.w - is * 1.4) / 6);
			text(ctx, it.name, tx, r.y + r.h * 0.36, fs, '#fff');
			text(ctx, `×${n}  [${it.label}]`, tx, r.y + r.h * 0.68, fs * 0.85, '#bbb', 'left', 'normal');
			ctx.globalAlpha = 1;
		});

		// LaTeX levels: a row (or two) of template keys over the keypad, then → to the next box
		const pal = g.level.latex?.palette;
		if (pal) {
			const keys = [...pal.map((k) => PALETTE[k]), { label: '→', ins: '' }];
			const rows = keys.length > 7 ? 2 : 1;
			const per = Math.ceil(keys.length / rows);
			const ph = Math.min(44, (keysR.h - 6 * (3 + rows)) / (4 + rows * 0.8)) * 0.8;
			const pw = (keysR.w - (per - 1) * 5) / per;
			keys.forEach((k, i) => {
				const r = {
					x: keysR.x + (i % per) * (pw + 5),
					y: keysR.y + Math.floor(i / per) * (ph + 5),
					w: pw,
					h: ph,
				};
				this.button(ctx, r, k.label, {
					color: k.ins ? '#3a4a6a' : '#6a5a2a',
					size: Math.min(18, ph * 0.5),
					down: () => (k.ins ? this.type(k.ins) : this.nextSlot()),
				});
			});
			const used = rows * (ph + 5) + 3;
			keysR = { ...keysR, y: keysR.y + used, h: keysR.h - used };
		}
		// keypad: digits in a phone grid, a tall FIRE key on the right
		const kw = (keysR.w - 3 * 6) / 4;
		const kh = (keysR.h - 3 * 6) / 4;
		const key = (
			c: number,
			r: number,
			label: string,
			down: (() => void) | undefined,
			color?: string,
			h = 1,
			extra: { icon?: IconKey; hold?: boolean } = {},
		) =>
			this.button(
				ctx,
				{ x: keysR.x + c * (kw + 6), y: keysR.y + r * (kh + 6), w: kw, h: kh * h + (h - 1) * 6 },
				label,
				{
					down,
					color,
					size: Math.min(28, kh * 0.5),
					...extra,
				},
			);
		for (let d = 1; d <= 9; d++) {
			const row = Math.floor((d - 1) / 3);
			key((d - 1) % 3, this.numpad ? 2 - row : row, `${d}`, () => this.type(`${d}`));
		}
		key(0, 3, '−', () => this.type('-'));
		key(1, 3, '0', () => this.type('0'));
		// tap: backspace (fires on release); hold: quit
		key(2, 3, '', undefined, '#8a2a2a', 1, { icon: 'quit', hold: true });
		key(3, 0, 'FIRE', () => this.submit(), '#2d7d46', 4);
	}

	drawAnswer(ctx: C2D, g: Game, r: Rect) {
		const fb = this.feedback?.kind;
		const border =
			fb === 'hit' ? '#3ad66a' : fb === 'miss' || fb === 'blocked' ? '#ff4a4a' : '#555b66';
		roundRect(ctx, r, 10, fb === 'miss' ? '#3a1414' : '#0b0d10', border, 4);
		const size = Math.min(r.h * 0.6, 44);
		if (g.locked && g.fire) {
			// locked-in volley: guns busy until it lands
			text(ctx, 'FIRING', r.x + r.w / 2, r.y + r.h * 0.42, size * 0.6, '#ffd84a', 'center');
			roundRect(ctx, { x: r.x + 12, y: r.y + r.h * 0.72, w: r.w - 24, h: 8 }, 4, '#333');
			roundRect(
				ctx,
				{
					x: r.x + 12,
					y: r.y + r.h * 0.72,
					w: (r.w - 24) * Math.min(1, g.fire.t / g.fire.dur),
					h: 8,
				},
				4,
				'#ffd84a',
			);
		} else if (g.jamT > 0) {
			const label = g.groundT > 0 ? 'WASTED VOLLEY' : 'JAMMED';
			text(ctx, label, r.x + r.w / 2, r.y + r.h * 0.42, size * 0.6, '#ff7a6a', 'center');
			roundRect(ctx, { x: r.x + 12, y: r.y + r.h * 0.72, w: r.w - 24, h: 8 }, 4, '#333');
			roundRect(
				ctx,
				{ x: r.x + 12, y: r.y + r.h * 0.72, w: (r.w - 24) * (1 - g.jamT / g.jamDur), h: 8 },
				4,
				'#ff7a6a',
			);
		} else if (this.input && g.level.latex && texHost.layer?.ready) {
			// typeset as it's typed, shrunk to fit the box
			const layer = texHost.layer;
			const tex = inputTex(this.input, this.cursor);
			const m = layer.measure(tex, size * 0.8);
			const fit = m ? Math.min(1, (r.w - 24) / m.w, (r.h - 10) / m.h) : 1;
			layer.place(tex, r.x + r.w / 2, r.y + r.h / 2, size * 0.8 * fit, '#fff');
		} else if (this.input) {
			text(
				ctx,
				this.input,
				r.x + r.w / 2,
				r.y + r.h / 2,
				size,
				'#fff',
				'center',
				'bold',
				'ui-monospace, Menlo, monospace',
			);
		} else {
			const n = g.fire?.targets.length ?? 0;
			text(
				ctx,
				n ? `firing at ${n} — keep answering!` : 'type an answer',
				r.x + r.w / 2,
				r.y + r.h / 2,
				size * 0.42,
				'#777',
				'center',
				'normal',
			);
		}
		if (Math.floor(this.time * 2) % 2 && !g.blocked && this.input && !g.level.latex) {
			ctx.font = `bold ${size}px ui-monospace, Menlo, monospace`;
			const w = ctx.measureText(this.input).width;
			ctx.fillStyle = '#fff';
			ctx.fillRect(r.x + r.w / 2 + w / 2 + 3, r.y + r.h * 0.25, 3, r.h * 0.5);
		}
	}

	// ================= title screen =================
	topBar(ctx: C2D, title: 'logo' | string) {
		const { W } = this;
		const TB = this.landscape ? 86 : 96;
		const bg = ctx.createLinearGradient(0, 0, 0, TB);
		bg.addColorStop(0, '#1d1428');
		bg.addColorStop(1, '#120c18');
		ctx.fillStyle = bg;
		ctx.fillRect(0, 0, W, TB);
		if (title === 'logo') {
			this.drawLogo(ctx, 16, TB / 2, Math.min(TB * 0.46, W * 0.06));
			// hidden achievements only appear once earned
			const got = Object.keys(this.save.achievements ?? {}).filter((a) => ACHIEVEMENTS[a]);
			if (got.length)
				text(ctx, got.map((a) => `🏆 ${ACHIEVEMENTS[a]}`).join('  '), 18, TB - 10, 12, '#ffd84a');
		} else
			text(
				ctx,
				title,
				20,
				TB / 2,
				34,
				'#ffd84a',
				'left',
				'bold',
				'Impact, Arial Black, sans-serif',
			);
		// money, counting up after a level
		const mx = W - 20;
		const money = `$${Math.floor(this.shownMoney)}`;
		ctx.font = `bold 30px ${FONT}`;
		const mw = ctx.measureText(money).width;
		const btnW = 120;
		const moneyRight = mx - btnW - 16;
		text(ctx, money, moneyRight, TB / 2, 30, '#ffd84a', 'right');
		ctx.fillStyle = '#ffd84a';
		ctx.beginPath();
		ctx.arc(moneyRight - mw - 18, TB / 2, 11, 0, Math.PI * 2);
		ctx.fill();
		text(ctx, '$', moneyRight - mw - 18, TB / 2 + 1, 14, '#8a6008', 'center');
		for (const gn of this.gains) {
			ctx.globalAlpha = Math.min(1, 2.2 - gn.t);
			text(ctx, `+$${gn.amount}`, moneyRight, TB / 2 + 30 - gn.t * 14, 20, '#7aff9a', 'right');
			ctx.globalAlpha = 1;
		}
		const r = { x: mx - btnW, y: TB * 0.18, w: btnW, h: TB * 0.64 };
		if (title === 'logo')
			this.button(ctx, r, this.shopOpen ? 'Shop' : 'Locked', {
				icon: this.shopOpen ? 'shop' : 'lock',
				disabled: !this.shopOpen,
				color: '#7a4a1a',
				size: 22,
				down: () => (this.screen = 'shop'),
			});
		else this.button(ctx, r, 'Back', { color: '#4a5262', down: () => (this.screen = 'title') });
		if (title === 'logo' && !this.shopOpen)
			text(ctx, 'beat any level', r.x + r.w / 2, TB - 4, 11, '#aaa', 'center', 'normal');
		return TB;
	}

	drawLogo(ctx: C2D, x: number, cy: number, size: number) {
		ctx.save();
		ctx.translate(x, cy);
		ctx.rotate(-0.04);
		ctx.font = `${size}px Impact, 'Arial Black', sans-serif`;
		ctx.textBaseline = 'middle';
		ctx.textAlign = 'left';
		const w = ctx.measureText('PEMDAS BLASTER').width;
		const g = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
		g.addColorStop(0, '#fff6c2');
		g.addColorStop(0.55, '#ffb142');
		g.addColorStop(1, '#d63031');
		ctx.fillStyle = '#111';
		ctx.fillText('PEMDAS BLASTER', 3, 3);
		ctx.shadowColor = 'rgba(255,75,224,0.6)';
		ctx.shadowBlur = 12;
		ctx.fillStyle = g;
		ctx.fillText('PEMDAS BLASTER', 0, 0);
		ctx.shadowBlur = 0;
		text(ctx, 'clone', w, size * 0.62, Math.max(11, size * 0.3), '#d8cfe8', 'right', 'italic 600');
		ctx.restore();
	}

	drawTitle(ctx: C2D) {
		const { W, H } = this;
		const bg = ctx.createLinearGradient(0, 0, 0, H);
		bg.addColorStop(0, '#140f26');
		bg.addColorStop(1, '#2a1a2a');
		ctx.fillStyle = bg;
		ctx.fillRect(0, 0, W, H);
		const TB = this.topBar(ctx, 'logo');
		const pad = 12;
		let map: Rect;
		let info: Rect;
		if (this.landscape) {
			map = { x: pad, y: TB + pad, w: W * 0.64 - pad * 1.5, h: H - TB - pad * 2 };
			info = { x: map.x + map.w + pad, y: map.y, w: W - map.w - pad * 3, h: map.h };
		} else {
			map = { x: pad, y: TB + pad, w: W - pad * 2, h: (H - TB) * 0.56 };
			info = { x: pad, y: map.y + map.h + pad, w: W - pad * 2, h: H - map.y - map.h - pad * 2 };
		}
		this.drawMap(ctx, map);
		this.drawInfo(ctx, info);
	}

	/** px per node unit on the map */
	nodeUnit(map: Rect) {
		return Math.max(66, Math.min(110, Math.min(map.w, map.h) / 4));
	}

	drawMap(ctx: C2D, map: Rect) {
		this.mapR = map;
		roundRect(ctx, { x: map.x - 4, y: map.y - 4, w: map.w + 8, h: map.h + 8 }, 14, '#0c0910');
		const U = this.nodeUnit(map);
		// camera: eases toward the selected level unless the player has panned away
		const [tx, ty] = this.selected.node;
		if (!this.cam) this.cam = { x: tx, y: ty };
		if (this.camFollow) {
			const e = Math.min(1, this.dt * 6);
			this.cam.x += (tx - this.cam.x) * e;
			this.cam.y += (ty - this.cam.y) * e;
		}
		const xs = LEVELS.map((l) => l.node[0]);
		const ys = LEVELS.map((l) => l.node[1]);
		const lim = (v: number, lo: number, hi: number, half: number) =>
			hi - lo + 1.2 < half * 2
				? (lo + hi) / 2
				: Math.max(lo - 0.6 + half, Math.min(hi + 0.6 - half, v));
		this.cam.x = lim(this.cam.x, Math.min(...xs), Math.max(...xs), map.w / 2 / U);
		this.cam.y = lim(this.cam.y, Math.min(...ys), Math.max(...ys) + 0.3, map.h / 2 / U);
		const cam = this.cam;
		const P = (n: [number, number]) => ({
			x: map.x + map.w / 2 + (n[0] - cam.x) * U,
			y: map.y + map.h / 2 + (n[1] - cam.y) * U,
		});
		const visible = (p: { x: number; y: number }, m = 0) =>
			p.x > map.x - m && p.x < map.x + map.w + m && p.y > map.y - m && p.y < map.y + map.h + m;

		ctx.save();
		ctx.beginPath();
		ctx.roundRect(map.x, map.y, map.w, map.h, 12);
		ctx.clip();
		const bg = ctx.createLinearGradient(0, map.y, 0, map.y + map.h);
		bg.addColorStop(0, '#1b1426');
		bg.addColorStop(1, '#120d1a');
		ctx.fillStyle = bg;
		ctx.fillRect(map.x, map.y, map.w, map.h);
		// faint grid that pans with the map
		ctx.fillStyle = 'rgba(255,255,255,0.05)';
		const o = P([0, 0]);
		const step = U / 2;
		for (let gx = ((o.x - map.x) % step) + map.x; gx < map.x + map.w; gx += step)
			for (let gy = ((o.y - map.y) % step) + map.y; gy < map.y + map.h; gy += step)
				ctx.fillRect(gx - 1, gy - 1, 2, 2);
		for (const rg of REGIONS) {
			const p = P(rg.at);
			if (visible(p, 300))
				text(ctx, rg.name, p.x, p.y, Math.min(30, U * 0.3), 'rgba(242,232,200,0.16)', 'center');
		}
		// roads between levels
		for (const lv of LEVELS)
			for (const id of lv.requires ?? []) {
				const from = byId(id);
				if (!from) continue;
				const a = P(from.node);
				const b = P(lv.node);
				const open = this.unlocked(lv);
				ctx.lineCap = 'round';
				ctx.strokeStyle = isRematch(lv) ? '#2a2030' : '#2e2638';
				ctx.lineWidth = U * (isRematch(lv) ? 0.06 : 0.12);
				ctx.beginPath();
				ctx.moveTo(a.x, a.y);
				ctx.lineTo(b.x, b.y);
				ctx.stroke();
				ctx.strokeStyle = open ? 'rgba(255,216,74,0.75)' : 'rgba(120,110,140,0.4)';
				ctx.lineWidth = 2;
				ctx.setLineDash([6, 6]);
				ctx.stroke();
				ctx.setLineDash([]);
			}
		// levels
		for (const lv of LEVELS) {
			const p = P(lv.node);
			if (!visible(p, U)) continue;
			const open = this.unlocked(lv);
			const rem = isRematch(lv);
			const r = U * (rem ? 0.15 : 0.21);
			if (!rem) {
				// the district's landmark peeks out above its badge
				const sc = (U * 0.62) / 34;
				ctx.save();
				ctx.globalAlpha = open ? 1 : 0.35;
				ctx.translate(p.x, p.y - r * 0.95);
				ctx.scale(sc, sc);
				drawDistrict(ctx, themeOf(lv), this.time);
				ctx.restore();
			}
			if (this.selected === lv) {
				ctx.beginPath();
				ctx.arc(p.x, p.y, r + 6, 0, Math.PI * 2);
				ctx.strokeStyle = `rgba(255,216,74,${0.6 + 0.4 * Math.sin(this.time * 4)})`;
				ctx.lineWidth = 3;
				ctx.stroke();
			}
			this.badge(ctx, p.x, p.y, r, lv, open, rem ? '#ffb0b0' : '#fff8dc');
			if (!open) drawIcon(ctx, 'lock', p.x + r * 0.75, p.y - r * 0.75, r * 0.9, this.time);
			const st = this.save.stars[lv.id] ?? 0;
			const ny = p.y + r + (st ? 20 : 9);
			const name = rem ? 'Rematch' : lv.name;
			const fs = fitSize(ctx, name, U * 0.98, Math.min(13, U * 0.14), 8);
			text(ctx, name, p.x, ny, fs, open ? '#f2e8c8' : '#7a7484', 'center');
			if (visible(p))
				this.hits.push({
					x: p.x - r - 4,
					y: p.y - r - 4,
					w: 2 * r + 8,
					h: 2 * r + 8,
					down: () => this.pick(lv),
				});
		}
		ctx.restore();
	}

	badge(ctx: C2D, x: number, y: number, r: number, lv: LevelDef, open: boolean, color: string) {
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.fillStyle = !open ? '#555' : this.beaten(lv) ? '#9ff0a8' : color;
		ctx.fill();
		ctx.lineWidth = this.selected === lv ? 4 : 3;
		ctx.strokeStyle = this.selected === lv ? '#ffd84a' : '#222';
		ctx.stroke();
		const b = badgeOf(lv);
		text(
			ctx,
			b,
			x,
			y + 1,
			fitSize(ctx, b, r * 1.7, r * (b.length > 1 ? 0.8 : 0.95)),
			'#222',
			'center',
		);
		const st = this.save.stars[lv.id] ?? 0;
		if (st) text(ctx, '★'.repeat(st), x, y + r + 9, 13, '#ffd84a', 'center');
	}

	drawInfo(ctx: C2D, r: Rect) {
		roundRect(ctx, r, 14, 'rgba(16,12,24,0.92)', '#3a3048', 2);
		const lv = this.selected;
		const th = THEMES[themeOf(lv)] ?? THEMES['1'];
		const x = r.x + 18;
		const w = r.w - 36;
		let y = r.y + 30;
		const big = Math.min(28, w / 14);
		const title = `Level ${badgeOf(lv)}: ${lv.name}`;
		text(ctx, title, x, y, fitSize(ctx, title, w, big), '#fff');
		y += big * 1.1;
		text(
			ctx,
			`${districtOf(lv)}${isRematch(lv) ? ' · Rematch' : ''}`.toUpperCase(),
			x,
			y,
			13,
			th.edge,
		);
		y += 22;
		for (const line of wrap(ctx, lv.desc, w, 16)) {
			text(ctx, line, x, y, 16, '#ccc', 'left', 'normal');
			y += 21;
		}
		y += 6;
		const rec = this.save.records[lv.id];
		const attempt = (label: string, a: Attempt | undefined, hi: boolean) => {
			const h = a ? 78 : 58;
			roundRect(
				ctx,
				{ x: x - 6, y, w: w + 12, h },
				8,
				hi ? 'rgba(255,216,74,0.12)' : 'rgba(255,255,255,0.05)',
				hi ? '#ffd84a' : undefined,
			);
			text(ctx, label, x + 4, y + 16, 12, '#aaa');
			if (!a) text(ctx, '—', x + 4, y + 38, 16, '#666');
			else {
				text(
					ctx,
					`${starStr(a.stars)}  ${a.won ? 'Cleared' : 'Destroyed'}`,
					x + 4,
					y + 38,
					18,
					a.won ? '#ffd84a' : '#ff7675',
				);
				const boss = a.bossTime != null ? ` · boss ${a.bossTime.toFixed(1)}s` : '';
				const stats = `${Math.round(a.accuracy * 100)}% acc · ${a.avgSolve.toFixed(1)}s/ans${boss} · ${a.kills} kills · $${a.money}`;
				text(ctx, stats, x + 4, y + 62, Math.min(14, w / 24), '#ccc', 'left', 'normal');
			}
			y += h + 8;
		};
		const from = rec?.last.from ? LEVELS.find((l) => l.id === rec.last.from) : undefined;
		attempt(
			from
				? `LAST ATTEMPT (on ${from.name})`
				: this.newBest && rec
					? 'LAST ATTEMPT — NEW BEST!'
					: 'LAST ATTEMPT',
			rec?.last,
			this.newBest && !!rec,
		);
		attempt('BEST ATTEMPT', rec?.best, false);
		const eb = this.save.endlessBest[lv.id];
		if (eb) {
			text(ctx, `Endless best: wave ${eb}`, x, y + 4, 15, '#9ad');
			y += 22;
		}
		const bh = Math.min(64, Math.max(44, r.y + r.h - y - 94));
		const by = Math.min(r.y + r.h - bh - 78, Math.max(y + 4, r.y + r.h - bh - 78));
		const open = this.unlocked(lv);
		this.button(ctx, { x, y: by, w: w * 0.6, h: bh }, open ? 'PLAY' : 'PLAY EARLY', {
			color: open ? '#2d7d46' : '#7a5a1a',
			size: 26,
			sub: open ? 'Enter' : 'win to unlock · loss pays $0',
			down: () => this.start(lv, false),
		});
		this.button(ctx, { x: x + w * 0.63, y: by, w: w * 0.37, h: bh }, 'Endless', {
			color: '#5a3a8a',
			disabled: !this.beaten(lv),
			size: 18,
			sub: this.beaten(lv) ? undefined : 'beat it first',
			down: () => this.start(lv, true),
		});
		const sy = r.y + r.h - 38;
		this.driveButton(ctx, { x, y: sy - 34, w, h: 28 });
		this.button(
			ctx,
			{ x, y: sy, w: w - 158, h: 28 },
			this.numpad ? 'Keypad: 789 on top' : 'Keypad: 123 on top',
			{
				size: 13,
				down: () => {
					this.numpad = !this.numpad;
					try {
						localStorage.setItem(NUMPAD_KEY, this.numpad ? '1' : '0');
					} catch {}
				},
			},
		);
		this.button(
			ctx,
			{ x: x + w - 150, y: sy, w: 150, h: 28 },
			this.confirmReset > 0 ? 'Tap again to erase' : 'Reset progress',
			{
				size: 13,
				color: this.confirmReset > 0 ? '#8a2a2a' : '#3a3d44',
				down: () => {
					if (this.confirmReset > 0) {
						this.save = freshSave();
						persist(this.save);
						this.shownMoney = 0;
						this.select(LEVELS[0]);
						this.confirmReset = 0;
					} else this.confirmReset = 3;
				},
			},
		);
	}

	// ================= shop =================
	drawShop(ctx: C2D) {
		const { W, H } = this;
		ctx.fillStyle = '#1a1218';
		ctx.fillRect(0, 0, W, H);
		const TB = this.topBar(ctx, 'ROBO-MART');
		const scene: Rect = this.landscape
			? { x: 0, y: TB, w: W * 0.3, h: H - TB }
			: { x: 0, y: TB, w: W, h: (H - TB) * 0.24 };
		this.drawShopScene(ctx, scene);
		const area: Rect = this.landscape
			? { x: scene.w + 12, y: TB + 12, w: W - scene.w - 24, h: H - TB - 24 }
			: { x: 12, y: TB + scene.h + 12, w: W - 24, h: H - TB - scene.h - 24 };
		type Card = {
			icon: IconKey;
			/** drawn over the icon (armor shows its HP) */
			badge?: string;
			/** how many you're carrying (consumables) */
			count?: number;
			name: string;
			desc: string;
			status: string;
			/** price button text; omitted for owned toggles */
			label?: string;
			ok: boolean;
			/** owned toggles: true = active (highlighted), false = off (greyed) */
			on?: boolean;
			locked?: boolean;
			accent: string;
			act: () => void;
		};
		const s = this.save;
		const cards: Card[] = [];
		for (const it of ITEMS) {
			const n = s.items[it.key];
			cards.push({
				icon: it.key,
				name: it.name,
				desc: it.desc,
				status: `Owned ${n}/${ITEM_CAP}`,
				count: n,
				label: n >= ITEM_CAP ? 'FULL' : `$${it.price}`,
				ok: n < ITEM_CAP && s.money >= it.price,
				accent: '#ffd84a',
				act: () => {
					if (n >= ITEM_CAP) return (this.shopMsg = "You can't carry any more of those.");
					if (s.money < it.price)
						return (this.shopMsg = `${it.name} costs $${it.price}. Come back richer.`);
					s.money -= it.price;
					s.items[it.key]++;
					this.shopMsg = `One ${it.name}, coming up!`;
				},
			});
		}
		const upgradeCards = (list: Upgrade[], kind: string, accent: string) => {
			for (const u of list) {
				const owned = u.key in s.upgrades;
				const on = !!s.upgrades[u.key];
				cards.push({
					icon: u.key,
					name: u.name,
					desc: u.desc,
					status: owned ? (on ? 'Active · tap to turn off' : 'Off · tap to turn on') : kind,
					label: owned ? undefined : `$${u.price}`,
					ok: s.money >= u.price,
					on: owned ? on : undefined,
					accent,
					act: () => {
						if (owned) {
							s.upgrades[u.key] = !on;
							return (this.shopMsg = `${u.name} switched ${on ? 'off' : 'on'}.`);
						}
						if (s.money < u.price)
							return (this.shopMsg = `The ${u.name} is $${u.price}. No haggling.`);
						s.money -= u.price;
						s.upgrades[u.key] = true;
						this.shopMsg = `${u.name} installed!`;
					},
				});
			}
		};
		upgradeCards(ITEM_UPGRADES, 'Item upgrade', '#ffb142');
		// armor: bought left to right, one worn at a time
		ARMOR.forEach((a, i) => {
			const owned = i < s.armor.owned;
			const locked = i > s.armor.owned;
			const on = s.armor.on === i;
			cards.push({
				icon: 'hp',
				badge: `${a.hp}`,
				name: a.name,
				desc: a.desc,
				status: locked
					? 'Buy the armor to the left first'
					: owned
						? on
							? `Worn · ${a.hp} HP`
							: 'Tap to wear'
						: `${a.hp} HP`,
				label: owned ? undefined : `$${a.price}`,
				ok: !locked && s.money >= a.price,
				on: owned ? on : undefined,
				locked,
				accent: '#ff6b81',
				act: () => {
					if (owned) {
						s.armor.on = on ? -1 : i;
						return (this.shopMsg = on
							? `${a.name} off. Living dangerously (${BASE_HP} HP).`
							: `${a.name} on: ${a.hp} HP.`);
					}
					if (locked) return (this.shopMsg = `Buy the ${ARMOR[i - 1].name} first.`);
					if (s.money < a.price) return (this.shopMsg = `The ${a.name} costs $${a.price}.`);
					s.money -= a.price;
					s.armor = { owned: i + 1, on: i };
					this.shopMsg = `${a.name} fitted. ${a.hp} HP!`;
				},
			});
		});
		upgradeCards(UPGRADES, 'Weapon upgrade', '#74e0ff');
		// 4 rows of 4: consumables, item upgrades, armor, weapon upgrades
		const cols = 4;
		const rows = Math.ceil(cards.length / cols);
		const gap = 8;
		const cw = (area.w - gap * (cols - 1)) / cols;
		const ch = Math.min(this.landscape ? 170 : 260, (area.h - gap * (rows - 1)) / rows);
		const tall = cw < 200;
		cards.forEach((c, i) => {
			const r = {
				x: area.x + (i % cols) * (cw + gap),
				y: area.y + Math.floor(i / cols) * (ch + gap),
				w: cw,
				h: ch,
			};
			const dim = c.on === false || c.locked;
			const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
			g.addColorStop(0, c.on ? '#4a3a52' : '#3a3240');
			g.addColorStop(1, '#221c28');
			ctx.save();
			if (c.on) {
				ctx.shadowColor = c.accent;
				ctx.shadowBlur = 14;
			}
			roundRect(ctx, r, 10, g, c.accent, c.on ? 4 : 2);
			ctx.restore();
			ctx.globalAlpha = dim ? 0.4 : 1;
			const dfs = Math.max(10, Math.min(13, ch * 0.09));
			const btnH = 28;
			let tx: number;
			let tw: number;
			let ty: number;
			const is = tall ? Math.min(cw * 0.4, ch * 0.24, 56) : Math.min(ch * 0.45, cw * 0.22, 60);
			const ix = tall ? r.x + r.w / 2 : r.x + 10 + is / 2;
			const iy = tall ? r.y + 10 + is / 2 : r.y + ch / 2 - 8;
			// only owned antimatter shimmers, and dynamite's fuse stays still in the shop
			const still = c.icon === 'dynamite' || (c.icon === 'antimatter' && c.on === undefined);
			drawIcon(ctx, c.icon, ix, iy, is, still ? 0 : this.time);
			if (c.badge) text(ctx, c.badge, ix, iy, is * 0.36, '#fff', 'center');
			if (c.count !== undefined) {
				const bx = ix + is * 0.5;
				const by0 = iy - is * 0.45;
				const br = Math.max(10, is * 0.22);
				ctx.beginPath();
				ctx.arc(bx, by0, br, 0, Math.PI * 2);
				ctx.fillStyle = c.count ? '#ffd84a' : '#555';
				ctx.fill();
				ctx.strokeStyle = '#111';
				ctx.lineWidth = 2;
				ctx.stroke();
				text(ctx, `${c.count}`, bx, by0 + 1, br * 1.2, '#111', 'center');
			}
			if (tall) {
				tx = r.x + 8;
				tw = r.w - 16;
				ty = r.y + is + 18;
			} else {
				tx = r.x + is + 20;
				tw = r.w - is - 28;
				ty = r.y + 10;
			}
			// everything shrinks to fit rather than overflowing or disappearing
			const fs = fitSize(ctx, c.name, tw, Math.min(17, ch * 0.13));
			text(ctx, c.name, tx, ty + fs / 2, fs, '#fff');
			const room = r.y + ch - btnH - 14 - (ty + fs + 6);
			const { size: ds, lines } = fitWrap(ctx, c.desc, tw, room, dfs);
			for (const [j, l] of lines.entries())
				text(ctx, l, tx, ty + fs + 8 + j * ds * 1.25 + ds / 2, ds, '#bbb', 'left', 'normal');
			const by = r.y + ch - btnH - 8;
			if (c.label) {
				const bw = Math.min(90, tw * (tall ? 1 : 0.45));
				const bx = r.x + r.w - bw - 8;
				this.button(ctx, { x: bx, y: by, w: bw, h: btnH }, c.label, {
					color: c.ok ? '#2d7d46' : '#3a3d44',
					size: 14,
				});
				if (!tall) {
					const ss = fitSize(ctx, c.status, bx - 6 - tx, dfs, 7, 'normal');
					text(ctx, c.status, tx, by + btnH / 2, ss, '#999', 'left', 'normal');
				}
			} else {
				const weight = c.on ? 'bold' : 'normal';
				const ss = fitSize(ctx, c.status, tw, dfs, 7, weight);
				text(ctx, c.status, tx, by + btnH / 2, ss, c.on ? c.accent : '#999', 'left', weight);
			}
			ctx.globalAlpha = 1;
			this.hits.push({
				...r,
				down: () => {
					c.act();
					persist(s);
				},
			});
		});
	}

	drawShopScene(ctx: C2D, r: Rect) {
		ctx.save();
		ctx.beginPath();
		ctx.rect(r.x, r.y, r.w, r.h);
		ctx.clip();
		const wall = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
		wall.addColorStop(0, '#4a2e3a');
		wall.addColorStop(1, '#22141c');
		ctx.fillStyle = wall;
		ctx.fillRect(r.x, r.y, r.w, r.h);
		// bricks
		ctx.strokeStyle = 'rgba(0,0,0,0.25)';
		ctx.lineWidth = 1;
		for (let y = r.y, row = 0; y < r.y + r.h; y += 18, row++)
			for (let x = r.x - (row % 2) * 20; x < r.x + r.w; x += 40) ctx.strokeRect(x, y, 40, 18);
		// neon sign
		// one brief flicker every 5-30 seconds
		if (this.time > this.signNext + 0.35) this.signNext = this.time + 5 + Math.random() * 25;
		const ft = this.time - this.signNext;
		const flick = ft >= 0 && Math.floor(ft / 0.07) % 2 === 0 ? 0.3 : 1;
		const signSize = Math.min(28, r.w / 8, r.h / 5);
		ctx.shadowColor = '#ff4be0';
		ctx.shadowBlur = 16 * flick;
		text(
			ctx,
			'ROBO-MART',
			r.x + r.w / 2,
			r.y + signSize * 1.1,
			signSize,
			`rgba(255,140,240,${flick})`,
			'center',
			'bold',
			'Impact, sans-serif',
		);
		ctx.shadowBlur = 0;
		const counterY = r.y + r.h * 0.72;
		// shelves full of salvaged parts
		const shelfTop = r.y + signSize * 2.2;
		for (let s = 0; s < 3; s++) {
			const sy = shelfTop + s * (counterY - shelfTop) * 0.3 + 26;
			if (sy > counterY - 20) break;
			ctx.fillStyle = '#6a4a30';
			ctx.fillRect(r.x + 8, sy, r.w - 16, 5);
			for (let i = 0; i < 6; i++) {
				const ix = r.x + 22 + i * ((r.w - 44) / 5);
				const kind = Math.floor(hash(s * 9 + i) * 4);
				if (kind === 0) {
					ctx.fillStyle = '#9aa3ad';
					ctx.beginPath();
					ctx.arc(ix, sy - 9, 8, 0, Math.PI * 2);
					ctx.fill();
					ctx.fillStyle = '#22141c';
					ctx.beginPath();
					ctx.arc(ix, sy - 9, 3, 0, Math.PI * 2);
					ctx.fill();
				} else if (kind === 1) drawIcon(ctx, 'dynamite', ix, sy - 12, 22, 0);
				else if (kind === 2) drawIcon(ctx, 'emp', ix, sy - 11, 20, this.time);
				else plate(ctx, ix - 7, sy - 18, 14, 18, 3, ['#ffd84a', '#c9a02a', '#6a5008'], 1.5);
			}
		}
		// shopkeeper (a retired janitor bot in a top hat)
		const ks = Math.min(r.h / 260, r.w / 120);
		ctx.save();
		ctx.translate(r.x + r.w * 0.5, counterY + 18 * ks);
		ctx.scale(ks, ks);
		DRAW.janitor(ctx, this.time * 2);
		ctx.fillStyle = '#15121a';
		ctx.fillRect(-11, -84, 22, 16);
		ctx.fillRect(-16, -70, 32, 4);
		ctx.fillStyle = '#d63031';
		ctx.fillRect(-11, -73, 22, 3);
		ctx.restore();
		// counter
		const cg = ctx.createLinearGradient(0, counterY, 0, r.y + r.h);
		cg.addColorStop(0, '#9a6a40');
		cg.addColorStop(1, '#4a2e18');
		ctx.fillStyle = cg;
		ctx.fillRect(r.x, counterY, r.w, r.y + r.h - counterY);
		ctx.fillStyle = '#c49a6a';
		ctx.fillRect(r.x, counterY, r.w, 6);
		ctx.restore();
		// speech bubble
		const bw = Math.min(r.w - 20, 300);
		const top = this.landscape ? counterY + 20 : r.y + 8;
		const fit = fitWrap(ctx, this.shopMsg, bw - 20, r.y + r.h - 8 - top - 16, 14, 8, 1.3);
		const fs = fit.size;
		const lines = fit.lines;
		const bh = lines.length * fs * 1.3 + 16;
		const bx = this.landscape ? r.x + 10 : r.x + r.w - bw - 10;
		const by = this.landscape ? counterY + 20 : r.y + r.h - bh - 8;
		roundRect(ctx, { x: bx, y: by, w: bw, h: bh }, 10, '#fff8e8', '#222', 2);
		for (const [i, l] of lines.entries())
			text(ctx, l, bx + 10, by + 8 + fs * 0.65 + i * fs * 1.3, fs, '#222', 'left', 'normal');
	}
}

function lighten(hex: string) {
	const n = Number.parseInt(hex.slice(1), 16);
	const c = (v: number) => Math.min(255, Math.round(v + (255 - v) * 0.25));
	return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

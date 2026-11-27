// ---------- Problem labels: placed so they stay on-screen and never cover each other ----------
import { texHost } from './tex';

type C2D = CanvasRenderingContext2D;
export type LabelItem = {
	text: string;
	/** typeset with KaTeX over the canvas when the layer is up (`text` is the canvas fallback) */
	tex?: string;
	size: number;
	bg: string;
	fg: string;
	dx: number;
	dy: number;
	w: number;
	h: number;
};
export type LabelBlock = {
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
export type Rect = [number, number, number, number];

export const labelFont = (size: number) => `bold ${size}px ui-monospace, Menlo, monospace`;
export function item(
	ctx: C2D,
	text: string,
	size: number,
	bg: string,
	fg: string,
	dx: number,
	dy: number,
	tex?: string,
): LabelItem {
	const m = tex ? texHost.layer?.measure(tex, size) : null;
	if (m)
		return {
			text,
			tex,
			size,
			bg,
			fg,
			dx,
			dy,
			w: m.w + size * 0.8,
			h: Math.max(size * 1.35, m.h + size * 0.4),
		};
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
export function block(
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

const LABEL_PAD = 3;
const LABEL_SIDE = 6;
/** nudges to try when a label would be hidden, nearest first (vertical moves are cheaper) */
const NUDGES: [number, number][] = (() => {
	const c: [number, number, number][] = [];
	for (let dx = -384; dx <= 384; dx += 16)
		for (let dy = -480; dy <= 480; dy += 8) c.push([dx, dy, dx * dx * 2 + dy * dy]);
	return c.sort((a, b) => a[2] - b[2]).map(([dx, dy]) => [dx, dy]);
})();
const labelOffsets = new WeakMap<object, { x: number; y: number }>();
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const overlaps = (a: Rect, b: Rect) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

/**
 * Places every label so it's fully inside the area and not covered by another label or an obstacle (HUD).
 * Highest-priority (front-most) blocks claim their natural spot first; others slide to the nearest free spot.
 */
export function drawLabels(
	ctx: C2D,
	blocks: LabelBlock[],
	area: { w: number; top: number; bottom: number },
	obstacles: Rect[],
) {
	const W = area.w;
	const LABEL_TOP = area.top;
	const LABEL_BOTTOM = area.bottom;
	const placed: Rect[] = [...obstacles];
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
		for (const it of b.items) {
			const layer = it.tex ? texHost.layer : null;
			if (layer?.ready) {
				// the box on the canvas, the formula in the layer above it
				const bx = x + it.dx;
				const by = y + it.dy;
				ctx.fillStyle = it.bg;
				ctx.beginPath();
				ctx.roundRect(bx - it.w / 2, by - it.h, it.w, it.h, 5);
				ctx.fill();
				layer.place(it.tex!, bx, by - it.h / 2, it.size, it.fg, ctx.globalAlpha);
			} else labelBox(ctx, it.text, x + it.dx, y + it.dy, it.size, it.bg, it.fg);
		}
	}
	ctx.globalAlpha = 1;
}

export function labelBox(
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

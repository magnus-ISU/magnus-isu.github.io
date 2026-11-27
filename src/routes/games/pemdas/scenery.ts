import { type C2D, circ, eye, GREY, INK, ink, plate, poly, rr, vgrad } from './art';
import type { ItemKey, UpgradeKey } from './save';

// ---------- tiny drawing helpers (SVG-ish units) ----------
const paths = new Map<string, Path2D>();
function path(ctx: C2D, d: string, c: string) {
	let p = paths.get(d);
	if (!p) paths.set(d, (p = new Path2D(d)));
	ctx.fillStyle = c;
	ctx.fill(p);
}
function box(ctx: C2D, x: number, y: number, w: number, h: number, c: string) {
	ctx.fillStyle = c;
	ctx.fillRect(x, y, w, h);
}
function dot(ctx: C2D, x: number, y: number, r: number, c: string) {
	ctx.fillStyle = c;
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fill();
}
function txt(ctx: C2D, s: string, x: number, y: number, size: number, c: string) {
	ctx.fillStyle = c;
	ctx.font = `bold ${size}px system-ui, sans-serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'alphabetic';
	ctx.fillText(s, x, y);
}
function smoke(ctx: C2D, x: number, y: number, r: number, t: number, phase: number, c = '#9a9a9a') {
	const k = (t / 3 + phase) % 1;
	ctx.globalAlpha = 0.7 * (1 - k);
	dot(ctx, x + 2 * k, y - 6 * k, r * (0.6 + 0.8 * k), c);
	ctx.globalAlpha = 1;
}
/** deterministic pseudo-random in [0,1) */
export const hash = (i: number) => {
	const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
};

/**
 * A district's landmark cluster, ~28 units wide and up to ~34 tall, origin at bottom-center.
 * Used on the level-select map and as roadside scenery in-game.
 */
export function drawDistrict(ctx: C2D, id: string, t: number) {
	const Y = '#ffd84a';
	switch (id) {
		case '1':
			dot(ctx, -12, -3.5, 3.2, '#3f7a3a');
			box(ctx, -9, -8, 8, 8, '#e8d3a8');
			path(ctx, 'M-10 -8 L-5 -13 L0 -8Z', '#b5523b');
			box(ctx, -7, -6, 2, 2, Y);
			box(ctx, -4, -4, 2, 4, '#6b4a2a');
			box(ctx, 2, -10, 8, 10, '#d9c7e8');
			path(ctx, 'M1 -10 L6 -15 L11 -10Z', '#4a6fa5');
			box(ctx, 3.5, -8, 2, 2, Y);
			box(ctx, 6.5, -8, 2, 2, Y);
			box(ctx, 5, -4, 2, 4, '#6b4a2a');
			dot(ctx, 13, -4, 2.6, '#4f8a44');
			break;
		case '2':
			[-6.5, 5.5].forEach((sx, i) => {
				box(ctx, sx - 5, -5, 10, 5, '#8b6b3d');
				box(ctx, sx - 5, -12, 0.6, 7, '#5b4325');
				box(ctx, sx + 4.4, -12, 0.6, 7, '#5b4325');
				for (let k = 0; k < 5; k++)
					path(
						ctx,
						`M${sx - 5 + k * 2} -13 h2 v3 a1 1 0 0 1 -2 0Z`,
						k % 2 ? '#fff' : i ? '#2d7d46' : '#d63031',
					);
				dot(ctx, sx - 2.5, -6, 1.1, '#ff7043');
				dot(ctx, sx, -6, 1.1, Y);
				dot(ctx, sx + 2.5, -6, 1.1, '#8bc34a');
			});
			txt(ctx, '× /', 0, -15, 4, Y);
			break;
		case '3':
			box(ctx, -13, -8, 9, 8, '#a8876a');
			path(ctx, 'M-11.5 -1 v-3 a1 1 0 0 1 2 0 v3z M-7.5 -1 v-3 a1 1 0 0 1 2 0 v3z', '#3a2a20');
			box(ctx, -3, -19, 6, 19, '#c9a27a');
			path(ctx, 'M-4 -19 L0 -25 L4 -19Z', '#7a3a2a');
			dot(ctx, 0, -15, 2.2, '#3a2a20');
			dot(ctx, 0, -15, 1.8, '#fff8dc');
			ctx.strokeStyle = '#3a2a20';
			ctx.lineWidth = 0.35;
			ctx.beginPath();
			ctx.moveTo(0, -15);
			ctx.lineTo(Math.sin(t * 0.5) * 1.4, -15 - Math.cos(t * 0.5) * 1.4);
			ctx.moveTo(0, -15);
			ctx.lineTo(1, -15);
			ctx.stroke();
			path(ctx, 'M-1.2 0 v-4 a1.2 1.2 0 0 1 2.4 0 v4z', '#3a2a20');
			box(ctx, 4, -10, 9, 10, '#b8967a');
			txt(ctx, '( )', 8.5, -3.5, 3, Y);
			break;
		case '4':
			box(ctx, -12, -2, 24, 2, '#bfb69e');
			box(ctx, -11, -4, 22, 2, '#d6cdb4');
			for (const cx of [-8.5, -4.25, 0, 4.25, 8.5]) box(ctx, cx - 0.9, -12, 1.8, 8, '#eee7d4');
			box(ctx, -11, -13, 22, 1.5, '#d6cdb4');
			path(ctx, 'M-12 -13 L0 -19 L12 -13Z', '#e0d6bc');
			txt(ctx, '$', 0, -14, 3, '#2d7d46');
			txt(ctx, '+', 14, -2, 4, Y);
			break;
		case '5':
			box(ctx, -11, -8, 20, 8, '#7a6a5a');
			path(ctx, 'M-11 -8 V-12 L-6 -8 V-12 L-1 -8 V-12 L4 -8 V-12 L9 -8Z', '#5a4a3a');
			for (const wx of [-9, -5, -1, 3]) box(ctx, wx, -5.5, 2.4, 2, '#ffb142');
			box(ctx, 9.5, -19, 2.6, 19, '#8a4a3a');
			box(ctx, 13, -15, 2, 15, '#7a3a2a');
			smoke(ctx, 10.8, -21, 2.2, t, 0);
			smoke(ctx, 14, -17, 1.6, t, 0.5);
			break;
		case '6':
			box(ctx, -14, -0.8, 28, 0.5, '#999');
			box(ctx, -14, -0.1, 28, 0.5, '#999');
			box(ctx, -12, -6.5, 9, 5, '#a33');
			box(ctx, -2, -6.5, 9, 5, '#2f6f8f');
			for (const wx of [-10.5, -4.5, -0.5, 5.5]) dot(ctx, wx, -1.2, 1, '#222');
			ctx.strokeStyle = '#555';
			ctx.lineWidth = 0.6;
			ctx.beginPath();
			ctx.moveTo(9, 0);
			ctx.lineTo(10, -9);
			ctx.moveTo(14, 0);
			ctx.lineTo(13, -9);
			ctx.stroke();
			ctx.fillStyle = '#6b8f9a';
			rr(ctx, 8.5, -15, 6, 6, 1);
			path(ctx, 'M8 -15 L11.5 -18 L15 -15Z', '#4a6a75');
			break;
		case '7':
			for (const [x, h, w] of [
				[-11, 12, 4],
				[-6, 19, 5],
				[0, 15, 4.5],
				[5.5, 22, 5],
				[11, 10, 4],
			]) {
				box(ctx, x - w / 2, -h, w, h, '#3d4a66');
				for (let wy = -h + 0.5; wy < -1; wy += 2)
					for (let wx = x - w / 2 + 0.4; wx < x + w / 2 - 0.6; wx += 1.6)
						if (hash(wx * 7 + wy * 13) < 0.75) box(ctx, wx, wy, 0.7, 0.9, 'rgba(255,216,74,0.75)');
			}
			box(ctx, 5.3, -26, 0.4, 4, '#aaa');
			if (Math.sin(t * 5) > 0) dot(ctx, 5.5, -26.3, 0.6, '#ff3b3b');
			break;
		case '8':
			path(ctx, 'M-13 0 Q-9.5 -6 -12 -13 L-4 -13 Q-6.5 -6 -3 0Z', '#9aa3ad');
			path(ctx, 'M-3 0 Q1 -7 -1.5 -16 L7 -16 Q4.5 -7 8.5 0Z', '#b5bdc6');
			smoke(ctx, -8, -15, 2.2, t, 0, '#ddd');
			smoke(ctx, 2.8, -18, 2.6, t, 0.5, '#ddd');
			path(ctx, 'M12 -19 L9 -11 L12 -11 L9.5 -3 L15 -13 L12 -13 L14 -19Z', Y);
			txt(ctx, 'x²', -16, -14, 3, Y);
			break;
		case '9':
			box(ctx, -13, -9, 26, 9, '#2d2d40');
			for (const cx of [-13, -9, -5, 3, 7, 11]) box(ctx, cx, -11, 2, 2, '#2d2d40');
			box(ctx, -4.5, -21, 9, 21, '#3a3a55');
			path(ctx, 'M-5.5 -21 L0 -30 L5.5 -21Z', '#1e1e2a');
			path(ctx, 'M-2 0 v-4 a2 2 0 0 1 4 0 v4z', '#0e0e16');
			ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 3);
			eye(ctx, 0, -15, 2, '#ff4be0');
			ctx.globalAlpha = 1;
			box(ctx, -0.2, -34, 0.4, 4, '#888');
			if (Math.sin(t * 4) > 0) dot(ctx, 0, -34.3, 0.7, '#ff4be0');
			break;
		case 'toy': {
			// toy town: a slide, stacked letter blocks and a balloon
			box(ctx, -13, -14, 2, 14, '#e0457a');
			box(ctx, -8, -14, 2, 14, '#e0457a');
			box(ctx, -13, -15, 7, 2, '#ff8fb8');
			path(ctx, 'M-6 -14 Q2 -12 6 0 L9 0 Q4 -14 -6 -16Z', '#4bc0ff');
			box(ctx, 7, -6, 6, 6, '#7aea6a');
			box(ctx, 10, -12, 6, 6, Y);
			box(ctx, 13, -6, 6, 6, '#ff8fb8');
			const by = -27 + Math.sin(t * 1.5) * 1.5;
			ctx.strokeStyle = '#ddd';
			ctx.lineWidth = 0.4;
			ctx.beginPath();
			ctx.moveTo(-3, by + 4);
			ctx.lineTo(-1, -14);
			ctx.stroke();
			dot(ctx, -3, by, 4, '#ff5a5a');
			dot(ctx, -4.3, by - 1.3, 1, '#ffb0b0');
			break;
		}
		case 'nt': {
			// prime vault: a bank vault door with a big 7
			box(ctx, -14, -22, 28, 22, '#3a4a4a');
			path(ctx, 'M-16 -22 L0 -30 L16 -22Z', '#2a3636');
			dot(ctx, 0, -11, 8.5, '#b8942e');
			dot(ctx, 0, -11, 7, '#8a6a1e');
			ctx.strokeStyle = '#e0c060';
			ctx.lineWidth = 1;
			for (let k = 0; k < 6; k++) {
				const a = t * 0.4 + (k * Math.PI) / 3;
				ctx.beginPath();
				ctx.moveTo(0, -11);
				ctx.lineTo(Math.cos(a) * 6, -11 + Math.sin(a) * 6);
				ctx.stroke();
			}
			dot(ctx, 0, -11, 1.8, Y);
			txt(ctx, '7', 11, -24, 7, Y);
			break;
		}
		case 'casino': {
			// casino strip: a neon-lit hall with a spinning die on the roof
			box(ctx, -15, -16, 30, 16, '#4a1a4a');
			box(ctx, -15, -18, 30, 2, '#ff4be0');
			for (let k = 0; k < 5; k++) {
				const on = Math.sin(t * 4 + k) > 0;
				dot(ctx, -12 + k * 6, -12, 1.2, on ? Y : '#6a4a2a');
			}
			box(ctx, -4, -7, 8, 7, '#1a0a1a');
			ctx.save();
			ctx.translate(0, -25);
			ctx.rotate(Math.sin(t) * 0.3);
			box(ctx, -5, -5, 10, 10, '#f4f4f4');
			dot(ctx, -2.5, -2.5, 1, '#d63031');
			dot(ctx, 2.5, 2.5, 1, '#d63031');
			dot(ctx, 0, 0, 1, '#d63031');
			ctx.restore();
			break;
		}
		case 'acad': {
			// the academy: a columned hall under a dome, with a clock tower
			box(ctx, -15, -12, 22, 12, '#e8e0cc');
			path(ctx, 'M-16 -12 L-4 -18 L8 -12Z', '#c9bfa6');
			for (let k = 0; k < 5; k++) box(ctx, -13 + k * 4.5, -11, 1.6, 10, '#b5ab92');
			path(ctx, 'M-10 -18 A6 6 0 0 1 2 -18Z', '#6a8ab0');
			box(ctx, 9, -26, 7, 26, '#d9cfb6');
			path(ctx, 'M8 -26 L12.5 -32 L17 -26Z', '#4a6a90');
			dot(ctx, 12.5, -21, 2.4, '#fff8e0');
			ctx.strokeStyle = INK;
			ctx.lineWidth = 0.5;
			ctx.beginPath();
			ctx.moveTo(12.5, -21);
			ctx.lineTo(12.5 + Math.cos(t * 0.5) * 1.8, -21 + Math.sin(t * 0.5) * 1.8);
			ctx.stroke();
			break;
		}
		case 'grid': {
			// grid works: a lattice tower beside a block of windows
			box(ctx, -15, -16, 16, 16, '#4a5a6a');
			for (let i = 0; i < 3; i++)
				for (let j = 0; j < 3; j++)
					box(
						ctx,
						-13 + i * 5,
						-14 + j * 5,
						3,
						3,
						(i + j + Math.floor(t)) % 3 ? '#9ad8ff' : '#2a3a4a',
					);
			ctx.strokeStyle = '#8a9aaa';
			ctx.lineWidth = 0.8;
			ctx.beginPath();
			ctx.moveTo(4, 0);
			ctx.lineTo(9, -32);
			ctx.lineTo(14, 0);
			for (let y = -4; y > -30; y -= 6) {
				const w = ((y + 32) / 32) * 5;
				ctx.moveTo(9 - w, y);
				ctx.lineTo(9 + w, y - 6);
				ctx.moveTo(9 + w, y);
				ctx.lineTo(9 - w, y - 6);
			}
			ctx.stroke();
			if (Math.sin(t * 3) > 0) dot(ctx, 9, -32, 1, '#ff4a4a');
			break;
		}
		case 'obs': {
			// observatory: a domed telescope on a hill
			path(ctx, 'M-16 0 Q0 -10 16 0Z', '#3a4a3a');
			box(ctx, -8, -14, 16, 8, '#c8ccd4');
			path(ctx, 'M-9 -14 A9 9 0 0 1 9 -14Z', '#e0e4ec');
			ctx.save();
			ctx.translate(0, -18);
			ctx.rotate(-0.7 + Math.sin(t * 0.3) * 0.15);
			box(ctx, 0, -1.5, 14, 3, '#5a6070');
			ctx.restore();
			for (const [x, y] of [
				[-13, -26],
				[11, -30],
				[-4, -32],
			])
				if (Math.sin(t * 2 + x) > -0.3) dot(ctx, x, y, 0.8, '#fff8c0');
			break;
		}
		case 'tide': {
			// tide works: a striped lighthouse over the waves
			path(ctx, 'M-4 0 L-2.5 -26 L2.5 -26 L4 0Z', '#f4f4f4');
			box(ctx, -3.6, -8, 7.2, 4, '#d63031');
			box(ctx, -3, -18, 6, 4, '#d63031');
			box(ctx, -3.5, -30, 7, 4, '#2a2a2a');
			dot(ctx, 0, -28, 1.6, Y);
			ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 2);
			path(ctx, `M0 -28 L${18 * Math.cos(t)} -32 L${18 * Math.cos(t)} -24Z`, '#fff8c0');
			ctx.globalAlpha = 1;
			for (let k = -2; k <= 2; k++) dot(ctx, k * 6 + Math.sin(t + k) * 1.5, 0, 3, '#4a90c0');
			break;
		}
		case 'wind': {
			// wind farm: two turning turbines
			for (const [x, h, sp] of [
				[-8, 26, 1.6],
				[8, 20, 2.1],
			]) {
				box(ctx, x - 0.8, -h, 1.6, h, '#e8ecf0');
				for (let k = 0; k < 3; k++) {
					const a = t * sp + (k * Math.PI * 2) / 3;
					ctx.save();
					ctx.translate(x, -h);
					ctx.rotate(a);
					path(ctx, 'M0 -0.8 L9 0 L0 0.8Z', '#f8f8f8');
					ctx.restore();
				}
				dot(ctx, x, -h, 1.2, '#b0b8c0');
			}
			break;
		}
	}
}

// ---------- in-game district themes ----------
export type Skyline =
	| 'hills'
	| 'low'
	| 'spires'
	| 'towers'
	| 'stacks'
	| 'cranes'
	| 'scrapers'
	| 'cooling'
	| 'spikes';
export type Theme = {
	sky: [string, string];
	ground: [string, string];
	patch: string;
	road: string;
	edge: string;
	skyline: Skyline;
	silhouette: string;
};
export const THEMES: Record<string, Theme> = {
	'1': {
		sky: ['#2b3a6b', '#e0a070'],
		ground: ['#4f6b3a', '#6f8a4a'],
		patch: '#6b9f4e',
		road: '#45474d',
		edge: '#f0ead0',
		skyline: 'hills',
		silhouette: '#2f4a2e',
	},
	'2': {
		sky: ['#3a2040', '#e09a5a'],
		ground: ['#6a5038', '#8a6a48'],
		patch: '#c98a3a',
		road: '#4a4038',
		edge: '#ffd84a',
		skyline: 'low',
		silhouette: '#4a2e2e',
	},
	'3': {
		sky: ['#1e2a4a', '#9a7a9a'],
		ground: ['#5a4a40', '#7a6a5a'],
		patch: '#a8876a',
		road: '#5a5450',
		edge: '#c9b490',
		skyline: 'spires',
		silhouette: '#2e2a3e',
	},
	'4': {
		sky: ['#1a2a3a', '#7a9ab0'],
		ground: ['#6a6a60', '#8a8a7a'],
		patch: '#d8cfa0',
		road: '#3e4044',
		edge: '#f0ead0',
		skyline: 'towers',
		silhouette: '#2a3440',
	},
	'5': {
		sky: ['#2a1a1a', '#b0603a'],
		ground: ['#4a3a32', '#6b5444'],
		patch: '#6a5a4a',
		road: '#3a3a40',
		edge: '#c9b458',
		skyline: 'stacks',
		silhouette: '#2a2020',
	},
	'6': {
		sky: ['#1a1a2a', '#c08a58'],
		ground: ['#5a4636', '#7a6046'],
		patch: '#8a6a50',
		road: '#3a3634',
		edge: '#d8c070',
		skyline: 'cranes',
		silhouette: '#2a2230',
	},
	'7': {
		sky: ['#070a1c', '#3a3a6a'],
		ground: ['#2e3440', '#454c5a'],
		patch: '#4a5a7a',
		road: '#2a2c32',
		edge: '#ffd84a',
		skyline: 'scrapers',
		silhouette: '#151a2e',
	},
	'8': {
		sky: ['#101a1a', '#4a7a5a'],
		ground: ['#3e4a3a', '#5a6a4e'],
		patch: '#7a8a6a',
		road: '#34383a',
		edge: '#9aff6a',
		skyline: 'cooling',
		silhouette: '#1e2a24',
	},
	'9': {
		sky: ['#0a0010', '#7a1040'],
		ground: ['#2a1a2a', '#3e2a3a'],
		patch: '#5a2a6a',
		road: '#221a26',
		edge: '#ff4be0',
		skyline: 'spikes',
		silhouette: '#14081c',
	},
	nt: {
		sky: ['#0e1a2a', '#3a6a7a'],
		ground: ['#2a3a3a', '#3a4a4a'],
		patch: '#4a6a6a',
		road: '#2a3030',
		edge: '#e0c060',
		skyline: 'towers',
		silhouette: '#142028',
	},
	casino: {
		sky: ['#1a0a2a', '#7a2a6a'],
		ground: ['#2a1a2a', '#3a2a3a'],
		patch: '#6a2a5a',
		road: '#241a26',
		edge: '#ff4be0',
		skyline: 'scrapers',
		silhouette: '#12081a',
	},
	acad: {
		sky: ['#2a3a6a', '#d0a080'],
		ground: ['#5a6a4a', '#7a8a5a'],
		patch: '#8aa070',
		road: '#5a5650',
		edge: '#e8e0cc',
		skyline: 'spires',
		silhouette: '#2a3048',
	},
	grid: {
		sky: ['#10202a', '#4a7a8a'],
		ground: ['#3a4a50', '#4a5a60'],
		patch: '#5a7a80',
		road: '#30383c',
		edge: '#9ad8ff',
		skyline: 'cranes',
		silhouette: '#18242a',
	},
	obs: {
		sky: ['#050818', '#2a2a5a'],
		ground: ['#2a3a2a', '#3a4a3a'],
		patch: '#4a5a4a',
		road: '#262a2e',
		edge: '#c8ccd4',
		skyline: 'hills',
		silhouette: '#101a14',
	},
	tide: {
		sky: ['#2a5a8a', '#a0d0e0'],
		ground: ['#c8b890', '#dccca0'],
		patch: '#e0d0a0',
		road: '#6a6460',
		edge: '#f4f4f4',
		skyline: 'low',
		silhouette: '#3a5a6a',
	},
	wind: {
		sky: ['#3a7ac0', '#c0e0f0'],
		ground: ['#5a8a3a', '#7aaa4a'],
		patch: '#8ac05a',
		road: '#5a5a5a',
		edge: '#f4f4f4',
		skyline: 'hills',
		silhouette: '#4a7a4a',
	},
	toy: {
		sky: ['#4a7ad0', '#ffd0e8'],
		ground: ['#5a9a4a', '#7aba5a'],
		patch: '#8ad07a',
		road: '#6a6470',
		edge: '#ff8fb8',
		skyline: 'hills',
		silhouette: '#3a6a4a',
	},
};

/** distant silhouette across [0,w] with its base on `y`; k scales detail size */
export function drawSkyline(ctx: C2D, th: Theme, w: number, y: number, k: number, t: number) {
	ctx.fillStyle = th.silhouette;
	const step = (fn: (x: number, i: number) => number) => {
		let x = -10;
		let i = 0;
		while (x < w + 10) x += fn(x, i++);
	};
	switch (th.skyline) {
		case 'hills':
			step((x, i) => {
				const r = (40 + hash(i) * 60) * k;
				ctx.beginPath();
				ctx.ellipse(x, y, r * 1.6, r * 0.5, 0, Math.PI, 0);
				ctx.fill();
				dot(ctx, x + r * 0.4, y - r * 0.45, 8 * k, '#24391f');
				ctx.fillStyle = th.silhouette;
				return r * 1.8;
			});
			break;
		case 'low':
			step((x, i) => {
				const bw = (40 + hash(i) * 40) * k;
				const bh = (15 + hash(i + 50) * 25) * k;
				ctx.fillRect(x, y - bh, bw - 4 * k, bh);
				ctx.beginPath();
				ctx.moveTo(x - 3 * k, y - bh);
				ctx.lineTo(x + bw / 2, y - bh - 10 * k);
				ctx.lineTo(x + bw, y - bh);
				ctx.fill();
				return bw;
			});
			break;
		case 'spires':
			step((x, i) => {
				const bw = (30 + hash(i) * 40) * k;
				const bh = (20 + hash(i + 9) * 40) * k;
				ctx.fillRect(x, y - bh, bw - 4 * k, bh);
				if (hash(i + 3) < 0.4) {
					ctx.beginPath();
					ctx.moveTo(x + 2 * k, y - bh);
					ctx.lineTo(x + bw / 2 - 2 * k, y - bh - 35 * k);
					ctx.lineTo(x + bw - 6 * k, y - bh);
					ctx.fill();
				} else if (hash(i + 4) < 0.5) {
					ctx.beginPath();
					ctx.arc(x + bw / 2 - 2 * k, y - bh, bw / 3, Math.PI, 0);
					ctx.fill();
				}
				return bw;
			});
			break;
		case 'towers':
			step((x, i) => {
				const bw = (35 + hash(i) * 45) * k;
				const bh = (30 + hash(i + 9) * 70) * k;
				ctx.fillRect(x, y - bh, bw - 5 * k, bh);
				ctx.fillRect(x - 3 * k, y - bh - 4 * k, bw + 1 * k, 4 * k);
				return bw;
			});
			break;
		case 'stacks':
			step((x, i) => {
				const bw = (50 + hash(i) * 40) * k;
				const bh = (18 + hash(i + 9) * 20) * k;
				ctx.fillRect(x, y - bh, bw - 4 * k, bh);
				if (hash(i + 2) < 0.7) {
					const sh = (40 + hash(i + 5) * 40) * k;
					ctx.fillRect(x + bw * 0.6, y - bh - sh, 8 * k, sh);
					smoke(ctx, x + bw * 0.6 + 4 * k, y - bh - sh - 6 * k, 10 * k, t, hash(i));
					ctx.fillStyle = th.silhouette;
				}
				return bw;
			});
			break;
		case 'cranes':
			step((x, i) => {
				const bw = (60 + hash(i) * 40) * k;
				const bh = (12 + hash(i + 9) * 18) * k;
				ctx.fillRect(x, y - bh, bw - 6 * k, bh);
				if (hash(i + 1) < 0.5) {
					const ch = (60 + hash(i + 7) * 30) * k;
					ctx.fillRect(x + 10 * k, y - bh - ch, 4 * k, ch);
					ctx.fillRect(x - 20 * k, y - bh - ch, 70 * k, 3 * k);
					ctx.fillRect(x + 40 * k, y - bh - ch, 1.5 * k, 20 * k);
				}
				return bw;
			});
			break;
		case 'scrapers':
			step((x, i) => {
				const bw = (28 + hash(i) * 34) * k;
				const bh = (60 + hash(i + 9) * 130) * k;
				ctx.fillStyle = th.silhouette;
				ctx.fillRect(x, y - bh, bw - 4 * k, bh);
				ctx.fillStyle = 'rgba(255,216,74,0.55)';
				for (let wy = y - bh + 6 * k; wy < y - 4 * k; wy += 8 * k)
					for (let wx = x + 3 * k; wx < x + bw - 8 * k; wx += 6 * k)
						if (hash(wx * 0.37 + wy * 0.71) < 0.4) ctx.fillRect(wx, wy, 2.5 * k, 3.5 * k);
				if (hash(i + 4) < 0.3 && Math.sin(t * 4 + i) > 0)
					dot(ctx, x + bw / 2, y - bh - 4 * k, 2 * k, '#ff3b3b');
				return bw;
			});
			break;
		case 'cooling':
			step((x, i) => {
				const bw = (70 + hash(i) * 50) * k;
				if (hash(i + 1) < 0.55) {
					const h = (60 + hash(i + 3) * 40) * k;
					const r = 26 * k;
					ctx.beginPath();
					ctx.moveTo(x, y);
					ctx.quadraticCurveTo(x + r * 0.6, y - h * 0.5, x + r * 0.2, y - h);
					ctx.lineTo(x + r * 1.8, y - h);
					ctx.quadraticCurveTo(x + r * 1.4, y - h * 0.5, x + r * 2, y);
					ctx.fill();
					smoke(ctx, x + r, y - h - 10 * k, 16 * k, t, hash(i), '#6a7a70');
					ctx.fillStyle = th.silhouette;
				} else {
					// pylon
					ctx.strokeStyle = th.silhouette;
					ctx.lineWidth = 2 * k;
					ctx.beginPath();
					ctx.moveTo(x + 10 * k, y);
					ctx.lineTo(x + 25 * k, y - 70 * k);
					ctx.lineTo(x + 40 * k, y);
					ctx.moveTo(x + 8 * k, y - 55 * k);
					ctx.lineTo(x + 42 * k, y - 55 * k);
					ctx.stroke();
				}
				return bw;
			});
			if (Math.sin(t * 0.9) > 0.97) {
				ctx.strokeStyle = 'rgba(200,255,150,0.9)';
				ctx.lineWidth = 2;
				ctx.beginPath();
				let lx = w * hash(Math.floor(t));
				ctx.moveTo(lx, 0);
				for (let ly = 0; ly < y - 40 * k; ly += 15 * k)
					ctx.lineTo((lx += (Math.random() - 0.5) * 30 * k), ly);
				ctx.stroke();
			}
			break;
		case 'spikes':
			step((x, i) => {
				const bw = (30 + hash(i) * 40) * k;
				const bh = (40 + hash(i + 9) * 90) * k;
				ctx.fillStyle = th.silhouette;
				ctx.beginPath();
				ctx.moveTo(x, y);
				ctx.lineTo(x + bw * 0.15, y - bh * 0.6);
				ctx.lineTo(x + bw * 0.5, y - bh);
				ctx.lineTo(x + bw * 0.85, y - bh * 0.6);
				ctx.lineTo(x + bw, y);
				ctx.fill();
				if (hash(i + 2) < 0.4) eye(ctx, x + bw / 2, y - bh * 0.55, 2 * k, '#ff4be0');
				return bw * 0.9;
			});
			break;
	}
}

// ---------- icons for items, upgrades and UI (centered on x,y, ~size px) ----------
export type IconKey = ItemKey | UpgradeKey | 'hp' | 'lock' | 'shop' | 'quit';
export function drawIcon(ctx: C2D, key: IconKey, x: number, y: number, size: number, t = 0) {
	ctx.save();
	ctx.translate(x, y);
	const s = size / 40;
	ctx.scale(s, s);
	const lw = 2;
	switch (key) {
		case 'dynamite':
			for (const dx of [-9, 0, 9])
				plate(ctx, dx - 4.5, -10, 9, 26, 3, ['#ff7a6b', '#d63031', '#7a1010'], lw);
			box(ctx, -13, -2, 26, 4, '#3a2a20');
			ctx.strokeStyle = '#ddd';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(0, -10);
			ctx.quadraticCurveTo(4, -18, 10, -16);
			ctx.stroke();
			eye(ctx, 10, -16, 3 + Math.sin(t * 20) * 0.8, '#ffb142');
			break;
		case 'emp':
			circ(ctx, 0, 0, 16, vgrad(ctx, -16, 16, ['#bfe6ff', '#3a8ad6', '#0e3a6a']), lw);
			poly(ctx, [3, -13, -7, 2, -1, 2, -4, 13, 7, -3, 1, -3], '#ffd84a', 1.5);
			break;
		case 'barrier':
			ctx.fillStyle = 'rgba(0,230,255,0.35)';
			ctx.fillRect(-17, -14, 34, 26);
			ctx.strokeStyle = '#81ecec';
			ctx.lineWidth = 2;
			for (let yy = -14; yy <= 12; yy += 6.5) {
				ctx.beginPath();
				ctx.moveTo(-17, yy);
				ctx.lineTo(17, yy);
				ctx.stroke();
			}
			plate(ctx, -20, -16, 5, 30, 2, GREY, 1.5);
			plate(ctx, 15, -16, 5, 30, 2, GREY, 1.5);
			break;
		case 'shield':
			ctx.beginPath();
			ctx.moveTo(0, -17);
			ctx.lineTo(15, -11);
			ctx.quadraticCurveTo(15, 9, 0, 18);
			ctx.quadraticCurveTo(-15, 9, -15, -11);
			ctx.closePath();
			ink(ctx, vgrad(ctx, -17, 18, ['#bfe6ff', '#3a7ad6', '#1a2a6a']), lw);
			poly(ctx, [0, -10, 7, -6, 6, 5, 0, 10], 'rgba(255,255,255,0.35)', 0);
			break;
		case 'hp':
			ctx.beginPath();
			ctx.moveTo(0, 14);
			ctx.bezierCurveTo(-22, -2, -13, -20, 0, -8);
			ctx.bezierCurveTo(13, -20, 22, -2, 0, 14);
			ink(ctx, vgrad(ctx, -18, 14, ['#ff9aaa', '#ff4d6d', '#a01030']), lw);
			break;
		case 'laser':
			ctx.strokeStyle = '#ff3b3b';
			ctx.shadowColor = '#ff3b3b';
			ctx.shadowBlur = 8;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(6, -6);
			ctx.lineTo(18, -18);
			ctx.stroke();
			ctx.shadowBlur = 0;
			ctx.save();
			ctx.rotate(-Math.PI / 4);
			plate(ctx, -14, -4, 24, 8, 3, GREY, lw);
			box(ctx, -6, -1.5, 3, 3, '#d63031');
			ctx.restore();
			eye(ctx, 18, -18, 2.5);
			break;
		case 'scope':
			circ(ctx, 0, 0, 16, '#14161c', lw);
			circ(ctx, 0, 0, 12, 'rgba(255,60,60,0.25)', 1.5);
			ctx.strokeStyle = '#ff5a5a';
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(-12, 0);
			ctx.lineTo(12, 0);
			ctx.moveTo(0, -12);
			ctx.lineTo(0, 12);
			ctx.stroke();
			eye(ctx, 0, 0, 2, '#ff3b3b');
			break;
		case 'targeting':
			plate(ctx, -14, -14, 28, 28, 4, ['#3a6a4a', '#1e3a28', '#0a1a10'], lw);
			ctx.strokeStyle = '#b0b8c0';
			ctx.lineWidth = 2;
			for (let k = -9; k <= 9; k += 6) {
				for (const [a, b, c, d] of [
					[k, -14, k, -19],
					[k, 14, k, 19],
					[-14, k, -19, k],
					[14, k, 19, k],
				]) {
					ctx.beginPath();
					ctx.moveTo(a, b);
					ctx.lineTo(c, d);
					ctx.stroke();
				}
			}
			ctx.strokeStyle = '#6aff9a';
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.arc(0, 0, 7, 0, Math.PI * 2);
			ctx.moveTo(-10, 0);
			ctx.lineTo(10, 0);
			ctx.moveTo(0, -10);
			ctx.lineTo(0, 10);
			ctx.stroke();
			break;
		case 'antimatter':
			ctx.shadowColor = '#c56cff';
			ctx.shadowBlur = 12;
			ctx.beginPath();
			ctx.moveTo(-6, 16);
			ctx.lineTo(-6, -4);
			ctx.quadraticCurveTo(0, -20, 6, -4);
			ctx.lineTo(6, 16);
			ctx.closePath();
			ink(ctx, vgrad(ctx, -16, 16, ['#f0d0ff', '#9a4ad6', '#3a0a6a']), lw);
			ctx.shadowBlur = 0;
			plate(ctx, -7, 10, 14, 7, 1.5, ['#ffe08a', '#c9a02a', '#6a5008'], 1.5);
			for (let k = 0; k < 3; k++) {
				const a = t * 3 + (k * Math.PI * 2) / 3;
				dot(ctx, Math.cos(a) * 14, Math.sin(a) * 6, 1.8, '#e0a0ff');
			}
			break;
		case 'frag':
			// pineapple grenade: ribbed olive body, lever and pin ring
			circ(ctx, 0, 4, 13, vgrad(ctx, -9, 17, ['#a8b86a', '#5a6a2a', '#2a3410']), lw);
			ctx.strokeStyle = 'rgba(0,0,0,0.45)';
			ctx.lineWidth = 1.5;
			for (const yy of [-2, 4, 10]) {
				ctx.beginPath();
				ctx.moveTo(-12, yy);
				ctx.lineTo(12, yy);
				ctx.stroke();
			}
			for (const xx of [-5, 5]) {
				ctx.beginPath();
				ctx.moveTo(xx, -8);
				ctx.lineTo(xx, 16);
				ctx.stroke();
			}
			plate(ctx, -5, -14, 10, 7, 2, GREY, 1.5);
			plate(ctx, 3, -15, 12, 4, 1.5, GREY, 1.5);
			ctx.strokeStyle = '#d9c35a';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(-9, -14, 4, 0, Math.PI * 2);
			ctx.stroke();
			break;
		case 'pulse':
			ctx.strokeStyle = '#74b9ff';
			ctx.lineWidth = 2;
			for (const [rad, a] of [
				[19, 0.35 + 0.3 * Math.sin(t * 4)],
				[15, 0.7],
			]) {
				ctx.globalAlpha = a;
				ctx.beginPath();
				ctx.arc(0, 0, rad, 0, Math.PI * 2);
				ctx.stroke();
			}
			ctx.globalAlpha = 1;
			circ(ctx, 0, 0, 11, vgrad(ctx, -11, 11, ['#bfe6ff', '#3a8ad6', '#0e3a6a']), lw);
			poly(ctx, [2, -9, -5, 1, -1, 1, -3, 9, 5, -2, 1, -2], '#ffd84a', 1.5);
			break;
		case 'forcefield': {
			// a barrier with arrows: it moves
			drawIcon(ctx, 'barrier', 0, 4, 32, t);
			const dx = Math.sin(t * 3) * 1.5;
			poly(ctx, [-19 + dx, -16, -11 + dx, -20, -11 + dx, -12], '#81ecec', 1.5);
			poly(ctx, [19 - dx, -16, 11 - dx, -20, 11 - dx, -12], '#81ecec', 1.5);
			break;
		}
		case 'reflect':
			// shield with rays bouncing off it
			ctx.strokeStyle = '#ffd84a';
			ctx.lineWidth = 2;
			for (const sd of [-1, 1]) {
				ctx.beginPath();
				ctx.moveTo(sd * 6, -6);
				ctx.lineTo(sd * 19, -15);
				ctx.moveTo(sd * 9, 4);
				ctx.lineTo(sd * 20, 2);
				ctx.stroke();
			}
			drawIcon(ctx, 'shield', 0, 0, 32, t);
			break;
		case 'lock':
			ctx.strokeStyle = INK;
			ctx.lineWidth = 6;
			ctx.beginPath();
			ctx.arc(0, -4, 9, Math.PI, 0);
			ctx.stroke();
			ctx.strokeStyle = '#c7ced8';
			ctx.lineWidth = 3;
			ctx.stroke();
			plate(ctx, -13, -4, 26, 20, 4, ['#ffe08a', '#d9a02a', '#7a5008'], lw);
			dot(ctx, 0, 5, 2.5, INK);
			break;
		case 'shop':
			plate(ctx, -15, -4, 30, 20, 3, ['#ffe08a', '#c98a3a', '#6a4008'], lw);
			for (let k = 0; k < 5; k++)
				path(ctx, `M${-17 + k * 7} -14 h7 v8 a3.5 3.5 0 0 1 -7 0Z`, k % 2 ? '#fff' : '#d63031');
			box(ctx, -4, 4, 8, 12, '#3a2a20');
			break;
		case 'quit':
			ctx.strokeStyle = '#fff';
			ctx.lineWidth = 4;
			ctx.lineCap = 'round';
			ctx.beginPath();
			ctx.moveTo(-9, -9);
			ctx.lineTo(9, 9);
			ctx.moveTo(9, -9);
			ctx.lineTo(-9, 9);
			ctx.stroke();
			ctx.lineCap = 'butt';
			break;
	}
	ctx.restore();
}

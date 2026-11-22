import type { RobotType } from './levels';

// ---------- Robot vector art (origin = feet, units ≈ px at scale 1) ----------
export type C2D = CanvasRenderingContext2D;
export type Fill = string | CanvasGradient;
export type Ramp = [string, string, string];
export const INK = '#111318';

export const rr = (ctx: C2D, x: number, y: number, w: number, h: number, r: number) => {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, r);
	ctx.fill();
};
export function vgrad(ctx: C2D, y0: number, y1: number, stops: string[]) {
	const g = ctx.createLinearGradient(0, y0, 0, y1);
	for (const [i, c] of stops.entries()) g.addColorStop(i / (stops.length - 1), c);
	return g;
}
/** fill the current path and give it an ink outline */
export function ink(ctx: C2D, fill: Fill, lw = 2) {
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
export function plate(
	ctx: C2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number,
	c: Ramp,
	lw = 2,
) {
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
export function poly(ctx: C2D, pts: number[], fill: Fill, lw = 2) {
	ctx.beginPath();
	ctx.moveTo(pts[0], pts[1]);
	for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
	ctx.closePath();
	ink(ctx, fill, lw);
}
export function circ(ctx: C2D, x: number, y: number, r: number, fill: Fill, lw = 2) {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ink(ctx, fill, lw);
}
/** outlined articulated limb through the given points */
export function limb(ctx: C2D, pts: number[], w: number, color: string) {
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
export function joint(ctx: C2D, x: number, y: number, r: number, c = '#3a3f47') {
	circ(ctx, x, y, r, c, 1.5);
	ctx.fillStyle = 'rgba(255,255,255,0.35)';
	ctx.beginPath();
	ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2);
	ctx.fill();
}
export function rivets(ctx: C2D, pts: number[], r = 1.1) {
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
export function hazard(ctx: C2D, x: number, y: number, w: number, h: number) {
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
export const eye = (ctx: C2D, x: number, y: number, r: number, c = '#ff3b3b') => {
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
export function visor(ctx: C2D, x: number, y: number, w: number, h: number, c: string) {
	plate(ctx, x, y, w, h, h / 2, ['#2a2d33', '#101115', '#000'], 1.5);
	ctx.fillStyle = c;
	ctx.shadowColor = c;
	ctx.shadowBlur = 8;
	rr(ctx, x + 2, y + h / 2 - 1.2, w - 4, 2.4, 1.2);
	ctx.shadowBlur = 0;
}

export const GREY: Ramp = ['#c7ced8', '#7d8794', '#3e444d'];
export const DARK: Ramp = ['#5d636d', '#2e3238', '#15171b'];

/** label anchor height above the feet for each robot, at scale 1 */
export const HEAD: Record<RobotType, number> = {
	spider: 46,
	janitor: 76,
	trooper: 104,
	brute: 96,
	juggernaut: 100,
	titan: 150,
	overlord: 182,
};

export const DRAW: Record<RobotType, (ctx: C2D, t: number) => void> = {
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

<script lang="ts">
import { onDestroy, onMount } from 'svelte';
import { goto } from '$app/navigation';
import { App, LOGICAL_MIN } from './app';

let canvas: HTMLCanvasElement | undefined = $state();
let app: App | null = null;
let raf = 0;
let last = 0;
/** logical units per css px */
let unit = 1;

function fit() {
	if (!canvas || !app) return;
	const w = window.innerWidth;
	const h = window.innerHeight;
	const dpr = window.devicePixelRatio || 1;
	unit = LOGICAL_MIN / Math.min(w, h);
	canvas.width = Math.round(w * dpr);
	canvas.height = Math.round(h * dpr);
	app.resize(w * unit, h * unit);
}

function loop(now: number) {
	const ctx = canvas?.getContext('2d');
	if (ctx && app) {
		const dpr = window.devicePixelRatio || 1;
		ctx.setTransform(dpr / unit, 0, 0, dpr / unit, 0, 0);
		app.frame(ctx, Math.min(0.05, (now - last) / 1000));
	}
	last = now;
	raf = requestAnimationFrame(loop);
}

const pos = (e: PointerEvent) => {
	const r = canvas!.getBoundingClientRect();
	return [(e.clientX - r.left) * unit, (e.clientY - r.top) * unit];
};
function down(e: PointerEvent) {
	e.preventDefault();
	const [x, y] = pos(e);
	app?.pointerDown(x, y, e.pointerId);
}
const up = (e: PointerEvent) => app?.pointerUp(e.pointerId);
function keydown(e: KeyboardEvent) {
	if (e.metaKey || e.ctrlKey || e.altKey) return;
	if (app?.keyDown(e.code, e.repeat)) e.preventDefault();
}
const keyup = (e: KeyboardEvent) => app?.keyUp(e.code);

onMount(() => {
	app = new App(() => goto('/games'));
	fit();
	last = performance.now();
	raf = requestAnimationFrame(loop);
	document.documentElement.style.overflow = 'hidden';
});
onDestroy(() => {
	if (typeof window === 'undefined') return;
	cancelAnimationFrame(raf);
	document.documentElement.style.overflow = '';
});
</script>

<svelte:head>
	<title>PEMDAS Blaster Clone</title>
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
</svelte:head>
<svelte:window onresize={fit} onkeydown={keydown} onkeyup={keyup} onblur={() => app?.keyUp('Escape')} />

<canvas
	bind:this={canvas}
	onpointerdown={down}
	onpointerup={up}
	onpointercancel={up}
	onpointerleave={up}
	oncontextmenu={(e) => e.preventDefault()}
></canvas>

<style>
canvas {
	position: fixed;
	inset: 0;
	width: 100vw;
	height: 100vh;
	height: 100dvh;
	z-index: 1000;
	display: block;
	background: #140f26;
	touch-action: none;
	user-select: none;
	-webkit-user-select: none;
	-webkit-tap-highlight-color: transparent;
}
</style>

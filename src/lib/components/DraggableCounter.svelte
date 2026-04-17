<script>
	import { tick } from 'svelte';

	let {
		value = 0,
		oncommit = () => {},
		inputWidth = '2.5rem',
		class: className = '',
		style = '',
		children,
	} = $props();

	let editing = $state(false);
	let inputEl = $state();
	let wrapEl = $state();

	// Drag state
	let dragging = $state(false);
	let dragDelta = $state(0);
	let previewX = $state(0);
	let previewY = $state(0);
	let startX = 0;
	let didDrag = false;

	function updatePreviewPos() {
		if (!wrapEl) return;
		const r = wrapEl.getBoundingClientRect();
		previewX = r.left + r.width / 2;
		previewY = r.top - 32;
	}

	function beginTracking(e) {
		if (editing) return;
		e.preventDefault();
		startX = e.clientX;
		didDrag = false;
		dragDelta = 0;

		function onMove(ev) {
			const dx = ev.clientX - startX;
			const newDelta = Math.round(dx / 24);
			if (!didDrag && Math.abs(dx) > 4) didDrag = true;
			if (didDrag) {
				dragging = true;
				dragDelta = newDelta;
				updatePreviewPos();
			}
		}

		function onUp() {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			if (didDrag && dragDelta !== 0) {
				const sign = dragDelta > 0 ? '+' : '';
				oncommit(`${sign}${dragDelta}`);
			} else if (!didDrag) {
				editing = true;
				tick().then(() => inputEl?.select());
			}
			dragging = false;
			dragDelta = 0;
		}

		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	}

	// Exposed so parents can forward pointerdown from a larger hit area
	export function handlePointerDown(e) {
		if (e.button !== 0) return;
		beginTracking(e);
	}

	function onPointerDown(e) {
		if (e.button !== 0) return;
		beginTracking(e);
	}

	function commit(e) {
		const raw = e.target.value.trim();
		if (raw) oncommit(raw);
		editing = false;
	}

	function fmtDelta(d) {
		return d > 0 ? `+${d}` : `${d}`;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<span
	class="dc-wrap {className}"
	{style}
	bind:this={wrapEl}
	onpointerdown={onPointerDown}
>
	{#if editing}
		<input
			class="dc-input"
			type="text"
			{value}
			style="width: {inputWidth}"
			bind:this={inputEl}
			onclick={(e) => e.stopPropagation()}
			onblur={commit}
			onkeydown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { editing = false; } }}
		/>
	{:else}
		{@render children?.()}
	{/if}
</span>

{#if dragging && dragDelta !== 0}
	<div class="dc-preview" style="left: {previewX}px; top: {previewY}px">
		{fmtDelta(dragDelta)}
	</div>
{/if}

<style>
	.dc-wrap {
		position: relative;
		cursor: ew-resize;
		user-select: none;
		touch-action: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.dc-preview {
		position: fixed;
		transform: translateX(-50%);
		color: #9b59b6;
		font-weight: bold;
		font-size: 1.5rem;
		white-space: nowrap;
		pointer-events: none;
		-webkit-text-stroke: 1px #000;
		text-shadow: 0 0 6px #000, 0 0 12px #000, 0 2px 4px #000;
		z-index: 200;
	}

	.dc-input {
		background: transparent;
		border: none;
		border-bottom: 1px solid currentColor;
		color: inherit;
		font: inherit;
		font-weight: bold;
		text-align: center;
		outline: none;
		padding: 0;
		-moz-appearance: textfield;
		appearance: textfield;
	}

	.dc-input::-webkit-inner-spin-button,
	.dc-input::-webkit-outer-spin-button {
		-webkit-appearance: none;
	}
</style>

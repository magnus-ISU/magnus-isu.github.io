<script>
	import { onMount, tick } from 'svelte';

	let {
		value = $bindable(''),
		placeholders = [],
		rows = 12,
		storageKey = '',
	} = $props();

	let scrollTop = $state(0);
	let mirror;
	let textarea;
	let lineHeights = $state([]);

	export function focus() { textarea?.focus(); }

	const lines = $derived(value.split('\n'));
	const phCount = $derived(Math.max(lines.length + 1, placeholders.length, rows));

	// Measure the rendered height of each line using a mirror div
	function measureLines() {
		if (!mirror || !textarea) return;
		mirror.style.width = textarea.clientWidth + 'px';
		const heights = [];
		for (let i = 0; i < phCount; i++) {
			const text = lines[i] ?? '';
			// Use a zero-width space so empty lines still have height
			mirror.textContent = text || '\u200b';
			heights.push(mirror.offsetHeight);
		}
		lineHeights = heights;
	}

	$effect(() => {
		// Re-measure when value or phCount changes
		void lines;
		void phCount;
		measureLines();
	});

	onMount(() => {
		if (!storageKey) return;
		try {
			const saved = localStorage.getItem(storageKey);
			if (saved != null) value = saved;
		} catch {}
	});

	onMount(() => {
		const ro = new ResizeObserver(() => measureLines());
		ro.observe(textarea);
		return () => ro.disconnect();
	});

	$effect(() => {
		if (!storageKey) return;
		try {
			if (value.length <= 1024) {
				localStorage.setItem(storageKey, value);
			} else {
				localStorage.removeItem(storageKey);
			}
		} catch {}
	});
</script>

<div class="textbox-wrap">
	<div class="textbox-mirror" bind:this={mirror} aria-hidden="true"></div>
	<div class="textbox-ph" style="transform: translateY({-scrollTop}px)">
		{#each { length: phCount } as _, i}
			{@const filled = lines[i] != null && lines[i].length > 0}
			<div class="ph-line" class:filled style="height: {lineHeights[i] ?? 0}px">{placeholders[i] ?? ''}</div>
		{/each}
	</div>
	<textarea
		bind:this={textarea}
		bind:value
		{rows}
		onscroll={(e) => { scrollTop = e.target.scrollTop; }}
		spellcheck="false"
	></textarea>
</div>

<style>
	.textbox-wrap {
		position: relative;
		overflow: hidden;
		border-radius: 6px;
	}

	.textbox-mirror {
		position: absolute;
		visibility: hidden;
		pointer-events: none;
		white-space: pre-wrap;
		word-wrap: break-word;
		overflow-wrap: break-word;
		font-family: inherit;
		font-size: 0.88rem;
		line-height: 1.5;
		padding: 0;
		border: 0;
		margin: 0;
	}

	.textbox-ph {
		position: absolute;
		top: 1px;
		left: 1px;
		right: 1px;
		bottom: 7px;
		padding: 0.6rem 0.75rem;
		pointer-events: none;
		user-select: none;
		overflow: hidden;
	}

	.ph-line {
		font-size: 0.88rem;
		line-height: 1.5;
		color: #555;
		white-space: nowrap;
		overflow: hidden;
		margin-bottom: 0.5px;
	}

	.ph-line.filled {
		visibility: hidden;
	}

	textarea {
		width: 100%;
		box-sizing: border-box;
		background: transparent;
		border: 1px solid #333;
		border-radius: 6px;
		color: #ddd;
		font-family: inherit;
		font-size: 0.88rem;
		line-height: 1.5;
		padding: 0.6rem 0.75rem;
		resize: vertical;
		outline: none;
		z-index: 1;
	}

	textarea:focus {
		border-color: #555;
	}
</style>

<script>
import { onMount, untrack } from 'svelte';

let {
	value = $bindable(''),
	placeholders = [],
	rows = 12,
	storageKey = '',
	onkeydown = null,
	oninput = null,
} = $props();

let scrollTop = $state(0);
let mirror;
let textarea;
let lineHeights = $state([]);

export function focus() {
	textarea?.focus();
}

const lines = $derived(value.split('\n'));
// The overlay only needs lines up to the last non-empty placeholder. Each
// measured line forces a synchronous layout, so covering the whole document
// (rather than just the lines that can show a placeholder) makes typing in
// large documents crawl.
const phCount = $derived.by(() => {
	let last = -1;
	for (let i = 0; i < placeholders.length; i++) {
		if (placeholders[i]) last = i;
	}
	return last + 1;
});

// Measure the rendered height of each line using a mirror div
function measureLines() {
	if (!mirror || !textarea) return;
	if (phCount === 0) {
		if (lineHeights.length) lineHeights = [];
		return;
	}
	mirror.style.width = `${textarea.clientWidth}px`;
	const heights = [];
	for (let i = 0; i < phCount; i++) {
		const text = lines[i] ?? '';
		const ph = placeholders[i] ?? '';
		// Measure whichever is taller: the typed text or the placeholder
		mirror.textContent = text || '\u200b';
		let h = mirror.offsetHeight;
		if (!text && ph) {
			mirror.textContent = ph;
			h = Math.max(h, mirror.offsetHeight);
		}
		heights.push(h);
	}
	lineHeights = heights;
}

// Re-measure only when something the overlay depends on changes \u2014 edits past
// the placeholder region shouldn't trigger layout work.
const measureKey = $derived(
	`${phCount}\x00${lines.slice(0, phCount).join('\n')}\x00${placeholders
		.slice(0, phCount)
		.join('\x00')}`,
);

$effect(() => {
	void measureKey;
	untrack(measureLines);
});

onMount(() => {
	if (!storageKey) return;
	try {
		const saved = localStorage.getItem(storageKey);
		if (saved != null) value = saved;
	} catch {
		/* ignore */
	}
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
	} catch {
		/* ignore */
	}
});
</script>

<div class="textbox-wrap">
	<div class="textbox-mirror" bind:this={mirror} aria-hidden="true"></div>
	<div class="textbox-ph" style="transform: translateY({-scrollTop}px)">
		{#each { length: phCount } as _ph, i}
			{@const filled = lines[i] != null && lines[i].length > 0}
			<div class="ph-line" class:filled style="height: {lineHeights[i] ?? 0}px">{placeholders[i] ?? ''}</div>
		{/each}
	</div>
	<textarea
		bind:this={textarea}
		bind:value
		{rows}
		onscroll={(e) => { scrollTop = e.target.scrollTop; }}
		{onkeydown}
		{oninput}
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
		color: #5b9bd5;
		white-space: pre-wrap;
		word-wrap: break-word;
		overflow-wrap: break-word;
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

	@media (max-width: 768px) {
		textarea, .ph-line, .textbox-mirror {
			font-size: 1.056rem;
		}
	}
</style>

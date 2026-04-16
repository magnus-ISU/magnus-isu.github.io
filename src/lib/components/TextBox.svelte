<script>
	import { onMount } from 'svelte';

	let {
		value = $bindable(''),
		placeholders = [],
		rows = 12,
		storageKey = '',
	} = $props();

	let scrollTop = $state(0);
	const lines = $derived(value.split('\n'));
	const phCount = $derived(Math.max(lines.length + 1, placeholders.length, rows));

	onMount(() => {
		if (!storageKey) return;
		try {
			const saved = localStorage.getItem(storageKey);
			if (saved != null) value = saved;
		} catch {}
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
	<div class="textbox-ph" style="transform: translateY({-scrollTop}px)">
		{#each { length: phCount } as _, i}
			{@const filled = lines[i] != null && lines[i].length > 0}
			<div class="ph-line" class:filled>{placeholders[i] ?? ''}</div>
		{/each}
	</div>
	<textarea
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

	.textbox-ph {
		position: absolute;
		inset: 0 0 7px 0;
		padding: 0.6rem 0.75rem;
		border: 1px solid transparent;
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

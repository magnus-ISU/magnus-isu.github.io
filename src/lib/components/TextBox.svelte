<script>
	let {
		value = $bindable(''),
		placeholders = [],
		rows = 10,
	} = $props();

	let scrollTop = $state(0);
	const lines = $derived(value.split('\n'));
	const phCount = $derived(Math.max(lines.length + 1, placeholders.length, rows));
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
		display: grid;
		overflow: hidden;
		border-radius: 6px;
	}

	.textbox-wrap > :global(*) {
		grid-area: 1 / 1;
	}

	.textbox-ph {
		padding: 0.6rem 0.75rem;
		border: 1px solid transparent;
		pointer-events: none;
		user-select: none;
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

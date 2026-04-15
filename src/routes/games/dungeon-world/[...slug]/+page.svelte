<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>{data.title} - Dungeon World</title>
</svelte:head>

<article class="dw-article">
	{#if data.isHomebrew}
		<div class="homebrew-banner">Homebrew</div>
	{/if}
	<data.Content />
</article>

<style>
	.homebrew-banner {
		display: inline-block;
		background: #d4a847;
		color: #1e1e1e;
		padding: 0.2rem 0.6rem;
		border-radius: 3px;
		font-size: 0.75rem;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 1rem;
	}
</style>

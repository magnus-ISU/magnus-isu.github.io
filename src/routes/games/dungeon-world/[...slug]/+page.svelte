<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>{data.title} - Dungeon World</title>
</svelte:head>

<article class="dw-article" class:is-homebrew={data.isHomebrew}>
	<data.Content />
</article>

<style>
	:global(.dw-article.is-homebrew h1:first-child::after) {
		content: 'HB';
		display: inline-block;
		background: #d4a847;
		color: #1e1e1e;
		padding: 0.15rem 0.5rem;
		border-radius: 3px;
		font-size: 0.55em;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		vertical-align: middle;
		margin-left: 0.75rem;
		float: right;
		margin-top: 0.3em;
	}
</style>

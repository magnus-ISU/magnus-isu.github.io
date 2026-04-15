<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>{data.title} - Dungeon World</title>
</svelte:head>

{#if data.srdSlug || data.homebrewSlug}
	<div class="source-bar">
		<a
			class="source-opt"
			class:active={data.isHomebrew}
			href="/games/dungeon-world/{data.homebrewSlug || data.slug}"
		>HB</a>
		<a
			class="source-opt"
			class:active={!data.isHomebrew}
			href="/games/dungeon-world/{data.srdSlug || data.slug}"
		>SRD</a>
	</div>
{/if}

<article class="dw-article" class:is-homebrew={data.isHomebrew && !data.srdSlug}>
	<data.Content />
</article>

<style>
	.source-bar {
		float: right;
		display: inline-flex;
		background: #2a2a2a;
		border-radius: 4px;
		overflow: hidden;
		border: 1px solid #444;
		margin-top: 0.25rem;
	}

	.source-opt {
		padding: 0.2rem 0.6rem;
		font-size: 0.7rem;
		font-weight: bold;
		letter-spacing: 0.05em;
		text-decoration: none;
		color: #888;
		transition: background 0.15s, color 0.15s;
		cursor: pointer;
	}

	.source-opt:first-child {
		border-right: 1px solid #444;
	}

	.source-opt:hover {
		color: #ccc;
		background: #333;
	}

	.source-opt.active {
		background: #d4a847;
		color: #1e1e1e;
	}

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

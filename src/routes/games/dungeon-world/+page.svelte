<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>{data.title} - Dungeon World</title>
</svelte:head>

<article class="dw-article">
	<data.Content />
</article>

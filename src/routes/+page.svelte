<script>
import Header from '$lib/components/Header.svelte';
import { siteTitle } from '$lib/config';

let { data } = $props();
</script>

<svelte:head>
	<title>{siteTitle}</title>
</svelte:head>

<Header />

<!-- This is the README.md file in the root of the repo. It serves double duty as the homepage's content. If you'd rather use your own HTML and/or Svelte, you can delete/modify everything in this file. -->
<div class="home">
	<data.ReadMe />
</div>

<style>
	.home :global(a) {
		color: #8ab4f8;
	}
	.home :global(a:visited) {
		color: #c58af9;
	}
</style>

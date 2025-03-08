<script>
	import { fade } from 'svelte/transition';
	let { data, children } = $props();

	const transitionIn = { delay: 150, duration: 150 };
	const transitionOut = { duration: 100 };
</script>

<div class="blog-layout">
	{#key data.path}
		<main in:fade|global={transitionIn} out:fade|global={transitionOut}>
			{@render children?.()}
		</main>
	{/key}
</div>

<style>
	.blog-layout {
		width: 100%;
		max-width: 80rem;
		margin: 0 auto;
		padding: 0 1rem;
	}

	/* Blog-specific styles */
	:global(.post) {
		max-width: 80rem;
		margin: 0 auto;
	}

	:global(.post .meta) {
		font-size: 0.8rem;
		margin-bottom: 4rem;
	}

	:global(.post img + h1) {
		margin-top: 1rem;
	}

	:global(.post-footer__categories) {
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	:global(.post-footer li) {
		display: inline-block;
		font-size: 0.8rem;
	}

	:global(.post-footer a) {
		background-color: var(--lightAccent);
		padding: 0.5rem 0.75rem;
		text-transform: uppercase;
		font-family: var(--primaryFont);
		font-weight: bold;
	}

	/* Code block styles */
	:global(pre),
	:global(code) {
		font-family: var(--codeFont);
		-webkit-font-smoothing: auto;
		-moz-osx-font-smoothing: auto;
	}

	:global(pre) {
		overflow-y: auto;
		color: var(--paper);
		background: var(--darker);
		padding: 1rem;
		font-size: 0.8rem;
		margin: 2rem 0;
	}

	:global(code) {
		color: var(--darker);
		font-size: 1rem;
		padding: 0.125em 0.25em;
		border-radius: 4px;
		background: var(--code-background);
		white-space: pre;
	}

	:global(pre code) {
		padding: 0;
		background: transparent;
		font-size: 0.8rem;
	}

	/* Link icon styles */
	:global(.icon-link) {
		position: relative;
	}

	:global(.icon-link::before) {
		content: url('/link.svg');
		fill: currentColor;
		position: absolute;
		left: -1rem;
		width: 1rem;
		height: 1rem;
		top: 0;
		opacity: 0.2;
		transition: opacity 0.2s;
	}

	@media (min-width: 48rem) {
		:global(.icon-link::before) {
			left: -1.5rem;
		}
	}

	:global(.icon-link:hover::before) {
		opacity: 1;
	}

	/* Posts list styles */
	:global(.posts-list) {
		list-style-type: none;
		padding: 0;
	}

	:global(.posts-list a) {
		display: block;
	}
</style>

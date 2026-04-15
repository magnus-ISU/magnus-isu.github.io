<script>
	import { page } from '$app/state';
	import { navigation } from '$lib/dw/navigation.js';

	let { children } = $props();
	let sidebarOpen = $state(false);

	const currentSlug = $derived(
		page.url.pathname
			.replace('/games/dungeon-world/', '')
			.replace(/\/$/, '') || 'introduction'
	);
</script>

<div class="dw-layout">
	<button
		class="sidebar-toggle"
		onclick={() => (sidebarOpen = !sidebarOpen)}
		aria-label="Toggle navigation"
	>
		<span class="hamburger" class:open={sidebarOpen}></span>
	</button>

	{#if sidebarOpen}
		<div class="backdrop" onclick={() => (sidebarOpen = false)} role="presentation"></div>
	{/if}

	<nav class="dw-sidebar" class:open={sidebarOpen}>
		<h2><a href="/games/dungeon-world/">Dungeon World</a></h2>
		{#each navigation as category}
			<details open>
				<summary>{category.category}</summary>
				<ul>
					{#each category.items as item}
						<li class:active={currentSlug === item.slug}>
							<a
								href="/games/dungeon-world/{item.slug}"
								onclick={() => (sidebarOpen = false)}
							>
								{item.title}
								{#if item.homebrew}<span class="hb">HB</span>{/if}
							</a>
						</li>
					{/each}
				</ul>
			</details>
		{/each}
	</nav>

	<main class="dw-content">
		{@render children?.()}
	</main>
</div>

<style>
	.dw-layout {
		display: grid;
		grid-template-columns: 260px 1fr;
		min-height: 100vh;
		width: 100%;
	}

	/* Sidebar */
	.dw-sidebar {
		background: #161616;
		border-right: 1px solid #333;
		padding: 1.5rem 0;
		position: sticky;
		top: 0;
		height: 100vh;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: #444 #161616;
	}

	.dw-sidebar h2 {
		margin: 0 0 1rem;
		padding: 0 1rem;
		font-size: 1.1rem;
	}

	.dw-sidebar h2 a {
		color: #fff;
		text-decoration: none;
	}

	.dw-sidebar h2 a:hover {
		color: #aabbff;
	}

	details {
		margin-bottom: 0.25rem;
	}

	summary {
		cursor: pointer;
		padding: 0.4rem 1rem;
		font-size: 0.75rem;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #aabbff;
		list-style: none;
		user-select: none;
	}

	summary::-webkit-details-marker {
		display: none;
	}

	summary::before {
		content: '+ ';
		font-family: monospace;
	}

	details[open] > summary::before {
		content: '- ';
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 0 0 0.5rem;
	}

	li a {
		display: block;
		padding: 0.3rem 1rem 0.3rem 1.5rem;
		color: #ccc;
		text-decoration: none;
		font-size: 0.85rem;
		transition: color 0.15s, background 0.15s;
		border-left: 3px solid transparent;
	}

	li a:hover {
		color: #aabbff;
		background: #1e1e1e;
	}

	li.active a {
		color: #ffaaaa;
		border-left-color: #ffaaaa;
		background: #1e1e1e;
	}

	.hb {
		display: inline-block;
		background: #d4a847;
		color: #1e1e1e;
		padding: 0.05rem 0.35rem;
		border-radius: 2px;
		font-size: 0.6rem;
		font-weight: bold;
		margin-left: 0.4rem;
		vertical-align: middle;
		letter-spacing: 0.03em;
	}

	/* Content */
	.dw-content {
		padding: 2rem 2.5rem;
		max-width: 56rem;
		min-width: 0;
	}

	/* Content typography */
	:global(.dw-article) {
		line-height: 1.7;
		color: #ddd;
	}

	:global(.dw-article h1) {
		font-size: 2rem;
		margin: 0 0 1.5rem;
		color: #fff;
		border-bottom: 1px solid #333;
		padding-bottom: 0.5rem;
	}

	:global(.dw-article h2) {
		font-size: 1.5rem;
		margin: 2.5rem 0 1rem;
		color: #fff;
	}

	:global(.dw-article h3) {
		font-size: 1.2rem;
		margin: 2rem 0 0.75rem;
		color: #eee;
	}

	:global(.dw-article h4) {
		font-size: 1rem;
		margin: 1.5rem 0 0.5rem;
		color: #ddd;
	}

	:global(.dw-article p) {
		margin: 0 0 1rem;
	}

	:global(.dw-article ul),
	:global(.dw-article ol) {
		margin: 0 0 1rem;
		padding-left: 1.5rem;
	}

	:global(.dw-article li) {
		margin-bottom: 0.3rem;
	}

	:global(.dw-article strong) {
		color: #fff;
	}

	:global(.dw-article em) {
		color: #bbb;
	}

	:global(.dw-article hr) {
		border: none;
		border-top: 1px solid #333;
		margin: 2rem 0;
	}

	:global(.dw-article blockquote) {
		border-left: 3px solid #d4a847;
		margin: 1rem 0;
		padding: 0.5rem 1rem;
		background: #222;
		color: #ccc;
		border-radius: 0 4px 4px 0;
	}

	:global(.dw-article pre) {
		background: #111;
		padding: 1rem;
		border-radius: 4px;
		overflow-x: auto;
		margin: 1rem 0;
		font-size: 0.85rem;
	}

	:global(.dw-article code) {
		background: #2a2a2a;
		padding: 0.15em 0.35em;
		border-radius: 3px;
		font-size: 0.9em;
		color: #e8d4a0;
	}

	:global(.dw-article pre code) {
		background: transparent;
		padding: 0;
		color: #ccc;
	}

	:global(.dw-article table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1rem 0;
	}

	:global(.dw-article th),
	:global(.dw-article td) {
		border: 1px solid #333;
		padding: 0.5rem 0.75rem;
		text-align: left;
	}

	:global(.dw-article th) {
		background: #222;
		color: #fff;
	}

	:global(.dw-article tr:nth-child(even)) {
		background: #1a1a1a;
	}

	:global(.dw-article a) {
		color: #aabbff;
		text-decoration: none;
	}

	:global(.dw-article a:hover) {
		text-decoration: underline;
	}

	:global(.dw-article span[style*="float:right"]) {
		color: #999;
		font-size: 0.85em;
	}

	/* Link icon styles from blog */
	:global(.dw-article .icon-link) {
		position: relative;
	}

	:global(.dw-article .icon-link::before) {
		content: url('/link.svg');
		fill: currentColor;
		position: absolute;
		left: -1.2rem;
		width: 1rem;
		height: 1rem;
		top: 0;
		opacity: 0.2;
		transition: opacity 0.2s;
	}

	:global(.dw-article .icon-link:hover::before) {
		opacity: 1;
	}

	/* Mobile toggle button */
	.sidebar-toggle {
		display: none;
		position: fixed;
		top: 0.75rem;
		left: 0.75rem;
		z-index: 1001;
		background: #252525;
		border: 1px solid #444;
		border-radius: 4px;
		width: 2.5rem;
		height: 2.5rem;
		cursor: pointer;
		padding: 0;
		align-items: center;
		justify-content: center;
	}

	.hamburger {
		display: block;
		width: 1.2rem;
		height: 2px;
		background: #ddd;
		position: relative;
		transition: background 0.2s;
	}

	.hamburger::before,
	.hamburger::after {
		content: '';
		display: block;
		width: 1.2rem;
		height: 2px;
		background: #ddd;
		position: absolute;
		left: 0;
		transition: transform 0.2s;
	}

	.hamburger::before {
		top: -6px;
	}

	.hamburger::after {
		top: 6px;
	}

	.hamburger.open {
		background: transparent;
	}

	.hamburger.open::before {
		transform: rotate(45deg);
		top: 0;
	}

	.hamburger.open::after {
		transform: rotate(-45deg);
		top: 0;
	}

	.backdrop {
		display: none;
	}

	/* Mobile */
	@media (max-width: 768px) {
		.dw-layout {
			grid-template-columns: 1fr;
		}

		.sidebar-toggle {
			display: flex;
		}

		.dw-sidebar {
			position: fixed;
			left: -280px;
			top: 0;
			width: 280px;
			z-index: 1000;
			transition: left 0.25s ease;
		}

		.dw-sidebar.open {
			left: 0;
		}

		.backdrop {
			display: block;
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.5);
			z-index: 999;
		}

		.dw-content {
			padding: 3.5rem 1rem 2rem;
		}
	}
</style>

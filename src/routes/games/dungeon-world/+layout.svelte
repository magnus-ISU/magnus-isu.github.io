<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { navigation, contentIndex } from '$lib/dw/navigation.js';
	import { monsterSections } from '$lib/dw/monsters.js';
	import { getSource, toggleSource } from '$lib/dw/sourcePreference.svelte.js';
	import { characterSheet } from '$lib/dw/characterSheet.svelte.js';
	import { loadClassRaw, buildCharacterSheet } from '$lib/dw/classLoader.js';

	let { children } = $props();

	const charImage = $derived.by(() => {
		const lines = characterSheet.value.split('\n');
		return lines[3]?.trim() || '';
	});

	const isCharSheet = $derived(
		page.url.pathname.replace(/\/$/, '').endsWith('/character-sheet')
	);

	const knownMonsterSections = new Set(
		Object.values(contentIndex).filter(e => e.monsterSection).map(e => e.monsterSection)
	);

	const dynamicMonsterItems = monsterSections
		.filter(s => !contentIndex[s.slug] && !knownMonsterSections.has(s.slug))
		.map(s => ({
			title: s.name,
			slug: s.slug,
			render: 'monsters',
			monsterSection: s.slug,
			homebrew: true
		}));

	const mergedNavigation = navigation.map(cat =>
		cat.category === 'Monsters'
			? { ...cat, items: [...cat.items, ...dynamicMonsterItems] }
			: cat
	);
	let sidebarOpen = $state(false);
	let longPressTimer;
	let isLongPress = false;

	const currentSlug = $derived(
		page.url.pathname
			.replace('/games/dungeon-world/', '')
			.replace(/\/$/, '') || 'introduction'
	);

	function isActive(item, slug) {
		if (slug === item.slug) return true;
		if (item.srdSlug && slug === item.srdSlug) return true;
		if (item.homebrewSlug && slug === item.homebrewSlug) return true;
		return false;
	}

	function getHref(item) {
		if (!item.srdSlug) return `/games/dungeon-world/${item.slug}`;
		return getSource(item.slug) === 'srd'
			? `/games/dungeon-world/${item.srdSlug}`
			: `/games/dungeon-world/${item.slug}`;
	}

	function handleToggle(item, target, e) {
		e.preventDefault();
		e.stopPropagation();
		const singleOnly = e.shiftKey || isLongPress;
		toggleSource(item.slug, target, singleOnly);
		const slug = target === 'srd' ? item.srdSlug : item.slug;
		sidebarOpen = false;
		goto(`/games/dungeon-world/${slug}`);
	}

	function onPointerDown() {
		isLongPress = false;
		longPressTimer = setTimeout(() => { isLongPress = true; }, 500);
	}

	function onPointerUp() {
		clearTimeout(longPressTimer);
	}

	async function handleNavClick(e, item, category) {
		if (category === 'Classes' && item.file && currentSlug === 'character-sheet' && characterSheet.isEmpty) {
			if (e.shiftKey || isLongPress) {
				e.preventDefault();
				e.stopPropagation();
				const raw = await loadClassRaw(item);
				if (raw) characterSheet.value = buildCharacterSheet(raw);
				sidebarOpen = false;
				return;
			}
		}
		sidebarOpen = false;
	}
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
		{#each mergedNavigation as category}
			<details open>
				<summary>{category.category}</summary>
				<ul>
					{#each category.items.filter(i => !i.hidden) as item}
						<li class:active={isActive(item, currentSlug)}>
							<a
								href={getHref(item)}
								onclick={(e) => handleNavClick(e, item, category.category)}
								onpointerdown={onPointerDown}
								onpointerup={onPointerUp}
								onpointercancel={onPointerUp}
								oncontextmenu={(e) => e.preventDefault()}
							>
								{item.title}
							</a>
							{#if item.homebrew && !item.srdSlug}
								<span class="hb">HB</span>
							{/if}
							{#if item.srdSlug}
								<span class="source-toggle">
									<button
										class="toggle-opt"
										class:active={getSource(item.slug) === 'srd'}
										onpointerdown={onPointerDown}
										onpointerup={onPointerUp}
										onpointercancel={onPointerUp}
										onclick={(e) => handleToggle(item, 'srd', e)}
									>SRD</button>
									<button
										class="toggle-opt"
										class:active={getSource(item.slug) === 'hb'}
										onpointerdown={onPointerDown}
										onpointerup={onPointerUp}
										onpointercancel={onPointerUp}
										onclick={(e) => handleToggle(item, 'hb', e)}
									>HB</button>
								</span>
							{/if}
						</li>
					{/each}
				</ul>
			</details>
		{/each}
		<div class="sidebar-spacer"></div>
	</nav>

	<main class="dw-content">
		{@render children?.()}
		<div class="content-spacer"></div>
	</main>
</div>

{#if isCharSheet && charImage}
	<div class="cs-bg-art">
		<img src={charImage} alt="" />
	</div>
{/if}

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

	li {
		display: flex;
		align-items: center;
		border-left: 3px solid transparent;
		transition: background 0.15s;
	}

	li a {
		flex: 1;
		min-width: 0;
		padding: 0.3rem 1rem 0.3rem 1.5rem;
		color: #ccc;
		text-decoration: none;
		font-size: 0.85rem;
		transition: color 0.15s;
	}

	li:hover {
		background: #1e1e1e;
	}

	li a:hover {
		color: #aabbff;
	}

	li.active {
		border-left-color: #ffaaaa;
		background: #1e1e1e;
	}

	li.active > a {
		color: #ffaaaa;
	}

	.hb {
		display: inline-block;
		background: #d4a847;
		color: #1e1e1e;
		padding: 0.05rem 0.35rem;
		border-radius: 2px;
		font-size: 0.6rem;
		font-weight: bold;
		letter-spacing: 0.03em;
		flex-shrink: 0;
		margin-right: 0.75rem;
	}

	/* Source toggle (HB/SRD switcher) */
	.source-toggle {
		display: inline-flex;
		background: #2a2a2a;
		border-radius: 2px;
		overflow: hidden;
		flex-shrink: 0;
		border: 1px solid #444;
		margin-right: 0.75rem;
	}

	.source-toggle .toggle-opt {
		padding: 0.05rem 0.3rem;
		font-size: 0.6rem;
		font-weight: bold;
		letter-spacing: 0.03em;
		color: #888;
		background: transparent;
		border: none;
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
		font-family: inherit;
	}

	.source-toggle .toggle-opt:first-child {
		border-right: 1px solid #444;
	}

	.source-toggle .toggle-opt:hover {
		color: #ccc;
		background: #333;
	}

	.source-toggle .toggle-opt.active {
		background: #d4a847;
		color: #1e1e1e;
	}

	.sidebar-spacer {
		height: 50px;
	}

	/* Content */
	.dw-content {
		padding: 2rem 2.5rem;
		max-width: 2000px;
		min-width: 0;
	}

	.content-spacer {
		height: 200vh;
	}

	/* Content typography */
	:global(.dw-article) {
		line-height: 1.7;
		color: #ddd;
	}

	:global(.dw-article h1) {
		font-size: 2rem;
		margin: 0 0 1.5rem;
		margin-left: -2.5rem;
		margin-right: -2.5rem;
		padding: 0.5rem 2.5rem;
		color: #fff;
		border-bottom: 1px solid #333;
		position: sticky;
		top: 0;
		background: #1e1e1e;
		z-index: 10;
	}

	:global(.dw-article h2) {
		font-size: 1.5rem;
		margin: 2.5rem 0 1rem;
		color: #fff;
		text-align: center;
	}

	:global(.dw-article h3) {
		font-size: 1.2rem;
		margin: 2rem 0 0.75rem;
		color: #eee;
		background: transparent;
		border: 1px solid #444;
		padding: 0.4rem 0.75rem;
		border-radius: 6px;
	}

	:global(.dw-article h4) {
		font-size: 1rem;
		margin: 1.5rem 0 0.5rem;
		color: #ddd;
	}

	:global(.dw-article p) {
		margin: 0 0 8px;
	}

	:global(.dw-article ul),
	:global(.dw-article ol) {
		margin: 0 0 1rem;
		padding-left: 1.5rem;
	}

	:global(.dw-article li) {
		margin-bottom: 0;
		line-height: 1.5;
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
			padding: 0 1rem 2rem;
		}

		:global(.dw-article h1) {
			padding-left: 4.5rem;
			padding-top: 0.65rem;
			padding-bottom: 0.65rem;
			margin-left: -1rem;
			margin-right: -1rem;
			padding-right: 1rem;
			font-size: 1.5rem;
			line-height: 2.5rem;
		}
	}

	.cs-bg-art {
		position: fixed;
		inset: 0;
		z-index: -1;
		pointer-events: none;
	}

	.cs-bg-art img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0.12;
	}
</style>

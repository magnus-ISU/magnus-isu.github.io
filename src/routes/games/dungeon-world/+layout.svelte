<script>
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { characterSheet } from '$lib/dw/characterSheet.svelte.js';
import { buildCharacterSheet, loadClassRaw } from '$lib/dw/classLoader.js';
import { diceHistory } from '$lib/dw/diceHistory.svelte.js';
import { monsterSections } from '$lib/dw/monsters.js';
import { contentIndex, navigation, pageArt } from '$lib/dw/navigation.js';
import { getSource, toggleSource } from '$lib/dw/sourcePreference.svelte.js';

let { children } = $props();

const charImage = $derived.by(() => {
	const lines = characterSheet.value.split('\n');
	return lines[3]?.trim() || '';
});

const isCharSheet = $derived(page.url.pathname.replace(/\/$/, '').endsWith('/character-sheet'));

const knownMonsterSections = new Set(
	Object.values(contentIndex)
		.filter((e) => e.monsterSection)
		.map((e) => e.monsterSection),
);

const dynamicMonsterItems = monsterSections
	.filter((s) => !contentIndex[s.slug] && !knownMonsterSections.has(s.slug))
	.map((s) => ({
		title: s.name,
		slug: s.slug,
		render: 'monsters',
		monsterSection: s.slug,
		homebrew: true,
	}));

const mergedNavigation = navigation.map((cat) =>
	cat.category === 'Monsters' ? { ...cat, items: [...cat.items, ...dynamicMonsterItems] } : cat,
);
let scrolled = $state(false);
let sidebarOpen = $state(false);
let sidebarEl = $state();
let longPressTimer;
let isLongPress = false;

const currentSlug = $derived(
	page.url.pathname.replace('/games/dungeon-world/', '').replace(/\/$/, '') || 'introduction',
);

function isActive(item, slug) {
	if (slug === item.slug) return true;
	if (item.srdSlug && slug === item.srdSlug) return true;
	if (item.homebrewSlug && slug === item.homebrewSlug) return true;
	return false;
}

const allItems = $derived(mergedNavigation.flatMap((cat) => cat.items.filter((i) => !i.hidden)));

const pageTitle = $derived.by(() => {
	for (const item of allItems) {
		if (isActive(item, currentSlug)) return item.title;
	}
	return '';
});

let sidebarHasFocus = false;

function onSidebarKeydown(e) {
	if (!sidebarHasFocus) return;
	if (e.target.closest('input, textarea, select')) return;
	const key = e.key;
	const down = key === 'ArrowDown' || key === 'j';
	const up = key === 'ArrowUp' || key === 'k';
	if (!down && !up) return;
	e.preventDefault();
	const idx = allItems.findIndex((item) => isActive(item, currentSlug));
	const next = idx + (down ? 1 : -1);
	if (next < 0 || next >= allItems.length) return;
	sidebarOpen = false;
	goto(getHref(allItems[next]));
}

function getHref(item) {
	if (!item.srdSlug) return `/games/dungeon-world/${item.slug}`;
	return getSource(item.slug) === 'srd'
		? `/games/dungeon-world/${item.srdSlug}`
		: `/games/dungeon-world/${item.slug}`;
}

let longPressItem = null;
let longPressTarget = null;

function handleToggle(item, target, e) {
	e.preventDefault();
	e.stopPropagation();
	if (isLongPress) {
		isLongPress = false;
		return;
	}
	const singleOnly = e.shiftKey;
	toggleSource(item.slug, target, singleOnly);
	const slug = target === 'srd' ? item.srdSlug : item.slug;
	sidebarOpen = false;
	goto(`/games/dungeon-world/${slug}`);
}

function getArtUrl(slug) {
	const v = pageArt[slug];
	if (!v) return '';
	return typeof v === 'string' ? v : v.url;
}

function resolveClassItem(item) {
	if (item.srdSlug && getSource(item.slug) === 'srd') {
		return contentIndex[item.srdSlug] || item;
	}
	return item;
}

function onPointerDown(e, item, category, toggleTarget) {
	if (e.shiftKey && !toggleTarget) {
		e.preventDefault();
		if (
			category === 'Classes' &&
			item?.file &&
			currentSlug === 'character-sheet' &&
			characterSheet.isEmpty
		) {
			const resolved = resolveClassItem(item);
			const art = getArtUrl(resolved.slug || item.slug);
			loadClassRaw(resolved).then((raw) => {
				if (raw) characterSheet.value = buildCharacterSheet(raw, art);
			});
		}
		sidebarOpen = false;
		return;
	}

	isLongPress = false;
	longPressItem = item;
	longPressTarget = toggleTarget || null;
	longPressTimer = setTimeout(async () => {
		isLongPress = true;
		if (longPressTarget && longPressItem?.srdSlug) {
			toggleSource(longPressItem.slug, longPressTarget, true);
			const slug = longPressTarget === 'srd' ? longPressItem.srdSlug : longPressItem.slug;
			sidebarOpen = false;
			goto(`/games/dungeon-world/${slug}`);
		} else if (
			category === 'Classes' &&
			item?.file &&
			currentSlug === 'character-sheet' &&
			characterSheet.isEmpty
		) {
			const resolved = resolveClassItem(item);
			const raw = await loadClassRaw(resolved);
			if (raw) characterSheet.value = buildCharacterSheet(raw, getArtUrl(resolved.slug || item.slug));
			sidebarOpen = false;
		}
	}, 500);
}

function onPointerUp() {
	clearTimeout(longPressTimer);
}

async function handleNavClick(e, item, category) {
	if (isLongPress) {
		e.preventDefault();
		e.stopPropagation();
		isLongPress = false;
		return;
	}
	if (e.shiftKey) {
		e.preventDefault();
		e.stopPropagation();
		if (
			category === 'Classes' &&
			item.file &&
			currentSlug === 'character-sheet' &&
			characterSheet.isEmpty
		) {
			const resolved = resolveClassItem(item);
			const raw = await loadClassRaw(resolved);
			if (raw) characterSheet.value = buildCharacterSheet(raw, getArtUrl(resolved.slug || item.slug));
		}
		sidebarOpen = false;
		return;
	}
	sidebarOpen = false;
}
</script>

<svelte:window onscroll={() => { scrolled = window.scrollY > 0; }} onkeydown={onSidebarKeydown} onclick={(e) => { if (!sidebarEl?.contains(e.target)) sidebarHasFocus = false; }} />

<div class="dw-layout">
	<button
		class="sidebar-toggle"
		class:hide={sidebarOpen}
		onclick={() => (sidebarOpen = true)}
		aria-label="Toggle navigation"
	>
		<span class="hamburger"></span>
	</button>

	<div class="backdrop" class:open={sidebarOpen} onclick={() => (sidebarOpen = false)} role="presentation"></div>

	<nav class="dw-sidebar" class:open={sidebarOpen} bind:this={sidebarEl} onclick={() => { sidebarHasFocus = true; }}>
		<h2><a href="/games/dungeon-world/">{scrolled && pageTitle ? pageTitle : 'Dungeon World'}</a></h2>
		{#each mergedNavigation as category}
			<details open>
				<summary>{category.category}</summary>
				<ul>
					{#each category.items.filter(i => !i.hidden) as item}
						<li class:active={isActive(item, currentSlug)}>
							<a
								href={getHref(item)}
								onclick={(e) => handleNavClick(e, item, category.category)}
								onpointerdown={(e) => onPointerDown(e, item, category.category)}
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
										onpointerdown={(e) => onPointerDown(e, item, null, 'srd')}
										onpointerup={onPointerUp}
										onpointercancel={onPointerUp}
										onclick={(e) => handleToggle(item, 'srd', e)}
									>SRD</button>
									<button
										class="toggle-opt"
										class:active={getSource(item.slug) === 'hb'}
										onpointerdown={(e) => onPointerDown(e, item, null, 'hb')}
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
		{#if diceHistory.entries.length > 0}
			<div class="dice-history">
				<summary>Dice History</summary>
				{#each diceHistory.entries as entry}
					<div class="dice-entry tier-{entry.tier}">
						<span class="dice-formula">{entry.formula}</span>
						<span class="dice-arrow">&rarr;</span>
						<span class="dice-breakdown">{entry.breakdown}</span>
						<span class="dice-total">= {entry.total}</span>
					</div>
				{/each}
			</div>
		{/if}
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
	.dw-layout, .dw-layout :global(*) {
		-webkit-tap-highlight-color: transparent;
	}

	.dw-layout :global(button:active),
	.dw-layout :global(a:active) {
		filter: brightness(1.3);
	}

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
		padding: 0 0 1.5rem;
		position: sticky;
		top: 0;
		height: 100vh;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: #444 #161616;
	}

	.dw-sidebar h2 {
		margin: 0 0 1rem;
		padding: 1.5rem 1rem 0.5rem;
		font-size: 1.1rem;
		position: sticky;
		top: 0;
		background: #161616;
		z-index: 1;
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
		-webkit-user-select: none;
		user-select: none;
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

	.dice-history {
		border-top: 1px solid #333;
		padding: 0.5rem 0;
		margin-top: 0.5rem;
	}

	.dice-history summary {
		padding: 0.4rem 1rem;
		font-size: 0.75rem;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #aabbff;
		cursor: default;
	}

	.dice-entry {
		display: flex;
		gap: 0.5rem;
		padding: 0.15rem 1rem 0.15rem 1.5rem;
		font-size: 0.75rem;
		font-family: monospace;
		color: #888;
	}

	.dice-formula {
		color: #aaa;
		min-width: 7em;
	}

	.dice-arrow {
		color: #555;
	}

	.dice-breakdown {
		color: #ccc;
	}

	.dice-total {
		color: #888;
		margin-left: auto;
	}

	.dice-entry.tier-strong { color: #5aaa6a; }
	.dice-entry.tier-strong .dice-breakdown,
	.dice-entry.tier-strong .dice-total { color: #5aaa6a; }

	.dice-entry.tier-weak { color: #d4a847; }
	.dice-entry.tier-weak .dice-breakdown,
	.dice-entry.tier-weak .dice-total { color: #d4a847; }

	.dice-entry.tier-miss { color: #e05555; }
	.dice-entry.tier-miss .dice-breakdown,
	.dice-entry.tier-miss .dice-total { color: #e05555; }

	.dice-entry.tier-crit { color: #c4f; }
	.dice-entry.tier-crit .dice-breakdown,
	.dice-entry.tier-crit .dice-total { color: #c4f; }

	.dice-entry.tier-damage .dice-formula { color: #aaa; }
	.dice-entry.tier-damage .dice-breakdown { color: #ccc; }

	.sidebar-spacer {
		height: 50vh;
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
		background: transparent;
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
		color: inherit;
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

	.backdrop {
		display: none;
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 999;
		opacity: 0;
		visibility: hidden;
		transition: opacity 0.25s ease, visibility 0.25s ease;
	}

	.backdrop.open {
		opacity: 1;
		visibility: visible;
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
			left: 0;
			top: 0;
			width: 280px;
			z-index: 1000;
			opacity: 0;
			visibility: hidden;
			transition: opacity 0.25s ease, visibility 0.25s ease;
		}

		.dw-sidebar.open {
			opacity: 1;
			visibility: visible;
		}

		.sidebar-toggle.hide {
			display: none;
		}

		.dw-sidebar h2 { font-size: 1.32rem; }
		summary { font-size: 0.9rem; }
		li a { font-size: 1.02rem; }
		.hb, .source-toggle .toggle-opt { font-size: 0.72rem; }

		.backdrop {
			display: block;
		}

		.dw-content {
			padding: 0 1rem 2rem;
		}

		:global(.dw-article h1) {
			padding-left: 4rem;
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

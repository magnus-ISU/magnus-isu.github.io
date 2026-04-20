<script>
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import MonsterSearch from '$lib/components/MonsterSearch.svelte';
import MonsterStatblock from '$lib/components/MonsterStatblock.svelte';
import { characterSheet } from '$lib/dw/characterSheet.svelte.js';
import { buildCharacterSheet } from '$lib/dw/classLoader.js';
import { globalExpand } from '$lib/dw/descExpanded.svelte.js';
import { renderMarkdown } from '$lib/dw/renderMarkdown.js';
import { toggleSource } from '$lib/dw/sourcePreference.svelte.js';

let { data } = $props();
const contentHtml = $derived(data.rawSource ? renderMarkdown(data.rawSource) : null);
let longPressTimer;
let isLongPress = false;
let imgLoaded = $state(false);
let artSrc = $state(null);

$effect(() => {
	const url = data.art;
	imgLoaded = false;
	artSrc = null;
	if (!url) return;
	if (document.readyState === 'complete') {
		artSrc = url;
	} else {
		const handler = () => {
			artSrc = url;
		};
		window.addEventListener('load', handler, { once: true });
		return () => window.removeEventListener('load', handler);
	}
});

const homebrewSlug = $derived(data.homebrewSlug || data.slug);
const srdSlug = $derived(data.srdSlug || data.slug);
const hasPair = $derived(!!data.srdSlug || !!data.homebrewSlug);
const isAllMonsters = $derived(data.slug === 'all-monsters');

function handleToggle(target, e) {
	e.preventDefault();
	const singleOnly = e.shiftKey || isLongPress;
	isLongPress = false;
	const itemSlug = data.homebrewSlug || data.slug;
	toggleSource(itemSlug, target, singleOnly);
	const slug = target === 'srd' ? srdSlug : homebrewSlug;
	goto(`/games/dungeon-world/${slug}`);
}

let longPressToggleTarget = null;

function onPointerDown(target) {
	isLongPress = false;
	longPressToggleTarget = target;
	longPressTimer = setTimeout(() => {
		isLongPress = true;
		if (longPressToggleTarget) {
			const itemSlug = data.homebrewSlug || data.slug;
			toggleSource(itemSlug, longPressToggleTarget, true);
			const slug = longPressToggleTarget === 'srd' ? srdSlug : homebrewSlug;
			goto(`/games/dungeon-world/${slug}`);
		}
	}, 500);
}

function onPointerUp() {
	clearTimeout(longPressTimer);
	longPressToggleTarget = null;
}

function stripToText(s) {
	return s
		.replace(/<[^>]*>/g, '')
		.replace(/\[([^\]]*?) (?:Coin|Armor|Weight)\]/g, '$1')
		.replace(/\*\*(.+?)\*\*/g, '$1')
		.replace(/__(.+?)__/g, '$1')
		.replace(/\*(.+?)\*/g, '$1')
		.replace(/_(.+?)_/g, '$1')
		.replace(/\\([[\](){}])/g, '$1')
		.replace(/\s+/g, ' ')
		.trim();
}

function extractSection(headingText) {
	const raw = data.rawSource;
	if (!raw) return null;
	const needle = headingText.replace(/\s+/g, ' ').trim();
	const lines = raw.split('\n');
	let startIdx = -1;
	let level = 0;
	for (let i = 0; i < lines.length; i++) {
		const m = lines[i].match(/^(#{1,6})\s+(.+)/);
		if (m && stripToText(m[2]) === needle) {
			startIdx = i;
			level = m[1].length;
			break;
		}
	}
	if (startIdx === -1) return null;
	let endIdx = lines.length;
	for (let i = startIdx + 1; i < lines.length; i++) {
		const m = lines[i].match(/^(#{1,6})\s/);
		if (m && m[1].length <= level) {
			endIdx = i;
			break;
		}
	}
	return lines.slice(startIdx, endIdx).join('\n').trimEnd();
}

let articleEl;
onMount(() => {
	const el = articleEl;
	if (!el) return;
	let longPressHeading = null;
	let longPressTimeout;

	function doCopy(section, heading, append) {
		if (append) {
			navigator.clipboard
				.readText()
				.then((existing) => {
					const sep = existing ? '\n\n' : '';
					navigator.clipboard.writeText(existing + sep + section);
				})
				.catch(() => navigator.clipboard.writeText(section));
		} else {
			navigator.clipboard.writeText(section);
		}
		heading.classList.add('copied');
		setTimeout(() => heading.classList.remove('copied'), 1000);
	}

	el.addEventListener('pointerdown', (e) => {
		const heading = e.target.closest('h1, h2, h3, h4, h5, h6');
		if (!heading || !data.rawSource || heading.tagName === 'H2') return;
		longPressHeading = null;
		longPressTimeout = setTimeout(() => {
			const text = heading.textContent.trim();
			const section = extractSection(text);
			if (!section) return;
			longPressHeading = heading;
			doCopy(section, heading, true);
		}, 500);
	});

	el.addEventListener('pointerup', () => {
		clearTimeout(longPressTimeout);
	});
	el.addEventListener('pointercancel', () => {
		clearTimeout(longPressTimeout);
	});

	el.addEventListener('contextmenu', (e) => {
		if (e.target.closest('h1, h2, h3, h4, h5, h6')) e.preventDefault();
	});

	function handleClick(e) {
		if (!data.rawSource) return;
		if (longPressHeading) {
			longPressHeading = null;
			return;
		}
		const heading = e.target.closest('h1, h2, h3, h4, h5, h6');
		if (!heading) return;
		if (heading.tagName === 'H2') {
			let sib = heading.nextElementSibling;
			while (sib?.classList.contains('h2-section')) {
				sib.classList.toggle('collapsed');
				sib = sib.nextElementSibling;
			}
			return;
		}
		if (heading.tagName === 'H1' && characterSheet.isEmpty) {
			characterSheet.value = buildCharacterSheet(data.rawSource);
			heading.classList.add('copied');
			setTimeout(() => heading.classList.remove('copied'), 1000);
			return;
		}
		const text = heading.textContent.trim();
		const section = extractSection(text);
		if (!section) return;
		doCopy(section, heading, e.shiftKey);
	}
	el.addEventListener('click', handleClick);
	return () => el.removeEventListener('click', handleClick);
});
</script>

<svelte:head>
	<title>{data.title} - Dungeon World</title>
</svelte:head>

{#if artSrc}
	<div class="bg-art">
		<img src={artSrc} alt="" class:mirror={data.artMirror && imgLoaded} onload={() => { imgLoaded = true; }} />
	</div>
{/if}

{#if hasPair}
	<div class="source-bar">
		<button
			class="source-opt"
			class:active={!data.isHomebrew}
			onpointerdown={() => onPointerDown('srd')}
			onpointerup={onPointerUp}
			onpointercancel={onPointerUp}
			onclick={(e) => handleToggle('srd', e)}
		>SRD</button>
		<button
			class="source-opt"
			class:active={data.isHomebrew}
			onpointerdown={() => onPointerDown('hb')}
			onpointerup={onPointerUp}
			onpointercancel={onPointerUp}
			onclick={(e) => handleToggle('hb', e)}
		>HB</button>
	</div>
{/if}

<article bind:this={articleEl} class="dw-article" class:is-homebrew={data.isHomebrew && !hasPair}>
	{#if data.render === 'monsters'}
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<h1 onclick={() => globalExpand.toggle()} onkeydown={(e) => { if (e.key === 'Enter') globalExpand.toggle(); }} style="cursor: pointer; -webkit-tap-highlight-color: transparent">{data.title}</h1>
		{#if isAllMonsters}
			<MonsterSearch showAll />
		{:else}
			{#each data.monsterSections as section}
				{#if data.monsterSections.length > 1}<h2>{section.name}</h2>{/if}
				{#each section.monsters as m}
					<MonsterStatblock {...m} />
				{/each}
			{/each}
		{/if}
		<button class="expand-all-btn" onclick={() => globalExpand.toggle()}>{globalExpand.value ? 'Collapse All' : 'Expand All'}</button>
	{:else if contentHtml}
		{@html contentHtml}
	{:else}
		<data.Content />
	{/if}
</article>

<style>
	.source-bar {
		float: right;
		display: inline-flex;
		background: #2a2a2a;
		border-radius: 4px;
		overflow: hidden;
		border: 1px solid #444;
		margin-top: calc(0.25rem + 8px);
		position: relative;
		z-index: 11;
	}

	@media (max-width: 768px) {
		.source-bar {
			margin-top: calc(0.65rem + 8px);
			margin-right: 0;
		}
	}

	.source-opt {
		padding: 0.2rem 0.6rem;
		font-size: 0.7rem;
		font-weight: bold;
		letter-spacing: 0.05em;
		color: #888;
		background: transparent;
		border: none;
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
		font-family: inherit;
		-webkit-user-select: none;
		user-select: none;
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

	.bg-art {
		position: fixed;
		inset: 0;
		z-index: -1;
		pointer-events: none;
	}

	.bg-art img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0.12;
	}

	.bg-art img.mirror {
		transform: scaleX(-1);
	}

	:global(.dw-article h2, .dw-article h3, .dw-article h4, .dw-article h5, .dw-article h6) {
		cursor: pointer;
		position: relative;
		user-select: none;
		-webkit-user-select: none;
		-webkit-tap-highlight-color: transparent;
	}

	:global(.dw-article h1) {
		cursor: pointer;
		user-select: none;
		-webkit-user-select: none;
		-webkit-tap-highlight-color: transparent;
	}

	:global(.dw-article h1.copied, .dw-article h2.copied, .dw-article h3.copied, .dw-article h4.copied) {
		color: #8f8;
		transition: color 0.15s;
	}

	:global(.dw-article h1.copied::after, .dw-article h2.copied::after, .dw-article h3.copied::after, .dw-article h4.copied::after) {
		content: 'Copied!';
		font-size: 0.6em;
		color: #8f8;
		margin-left: 0.75rem;
		font-weight: normal;
	}

	:global(.dw-article .h2-section) {
		max-height: 4000px;
		overflow: hidden;
		position: relative;
		transition: max-height 0.3s ease;
	}

	:global(.dw-article .h2-section.collapsed) {
		max-height: 2.4em;
		columns: 1 !important;
	}

	:global(.dw-article .h2-section.collapsed::after) {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 2.4em;
		background: linear-gradient(to bottom, transparent, var(--bg, #1e1e1e));
		pointer-events: none;
	}

	:global(.dw-article .h2-columns) {
		columns: 2;
		column-gap: 2rem;
	}

	@media (max-width: 1028px) {
		:global(.dw-article .h2-columns) {
			columns: 1;
		}
	}

	:global(.dw-article .h2-columns h3) {
		margin-top: 0;
	}

	:global(.dw-article .move-block) {
		break-inside: avoid;
	}

	:global(.dw-article .move-block + .move-block) {
		margin-top: 1rem;
	}

	:global(.dw-article .coin-icon) {
		display: inline-block;
		width: 24px;
		height: 24px;
		vertical-align: middle;
	}

	:global(.dw-article .weight-icon) {
		display: inline-block;
		width: 24px;
		height: 24px;
		vertical-align: middle;
		color: #444;
		transform: translateY(-2px);
	}

	:global(.dw-article .armor-icon) {
		display: inline-block;
		width: 22px;
		height: 22px;
		vertical-align: middle;
		transform: translateY(-2px);
	}

	:global(.dw-article .code-block) {
		background: #1a1a1a;
		border: 1px solid #333;
		border-radius: 4px;
		padding: 0.75rem 1rem;
		font-size: 0.85rem;
		white-space: pre-wrap;
		cursor: pointer;
		user-select: none;
		-webkit-user-select: none;
		-webkit-tap-highlight-color: transparent;
		transition: border-color 0.15s, color 0.15s;
	}

	:global(.dw-article .code-block.copied) {
		border-color: #8f8;
		color: #8f8;
	}

	:global(.dw-article .copy-line) {
		cursor: pointer;
		user-select: none;
		-webkit-user-select: none;
		-webkit-tap-highlight-color: transparent;
		transition: color 0.15s;
	}

	:global(.dw-article .copy-line.copied),
	:global(.dw-article .copy-line.copied strong) {
		color: #8f8 !important;
	}

	.expand-all-btn {
		display: block;
		margin: 1.5rem auto 0;
		background: transparent;
		border: 1px solid #444;
		border-radius: 4px;
		color: #999;
		cursor: pointer;
		font-size: 0.8rem;
		padding: 0.4rem 1.2rem;
		font-family: inherit;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
	}

	.expand-all-btn:hover {
		background: #252525;
		color: #ddd;
		border-color: #666;
	}

	:global(.dw-article.is-homebrew h1:first-child::after) {
		content: 'HB';
		background: #d4a847;
		color: #1e1e1e;
		padding: 0.15rem 0.5rem;
		border-radius: 3px;
		font-size: 0.55em;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-left: 0.75rem;
		float: right;
		margin-top: 0.3em;
	}
</style>

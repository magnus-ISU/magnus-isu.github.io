<script>
	import { goto } from '$app/navigation';
	import { toggleSource } from '$lib/dw/sourcePreference.svelte.js';

	let { data } = $props();
	let longPressTimer;
	let isLongPress = false;

	const homebrewSlug = $derived(data.homebrewSlug || data.slug);
	const srdSlug = $derived(data.srdSlug || data.slug);
	const hasPair = $derived(!!data.srdSlug || !!data.homebrewSlug);

	function handleToggle(target, e) {
		e.preventDefault();
		const singleOnly = e.shiftKey || isLongPress;
		const itemSlug = data.homebrewSlug || data.slug;
		toggleSource(itemSlug, target, singleOnly);
		const slug = target === 'srd' ? srdSlug : homebrewSlug;
		goto(`/games/dungeon-world/${slug}`);
	}

	function onPointerDown() {
		isLongPress = false;
		longPressTimer = setTimeout(() => { isLongPress = true; }, 500);
	}

	function onPointerUp() {
		clearTimeout(longPressTimer);
	}
</script>

<svelte:head>
	<title>{data.title} - Dungeon World</title>
</svelte:head>

{#if hasPair}
	<div class="source-bar">
		<button
			class="source-opt"
			class:active={!data.isHomebrew}
			onpointerdown={onPointerDown}
			onpointerup={onPointerUp}
			onpointercancel={onPointerUp}
			onclick={(e) => handleToggle('srd', e)}
		>SRD</button>
		<button
			class="source-opt"
			class:active={data.isHomebrew}
			onpointerdown={onPointerDown}
			onpointerup={onPointerUp}
			onpointercancel={onPointerUp}
			onclick={(e) => handleToggle('hb', e)}
		>HB</button>
	</div>
{/if}

<article class="dw-article" class:is-homebrew={data.isHomebrew && !hasPair}>
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

<script>
	import TextBox from '$lib/components/TextBox.svelte';

	const STORAGE_KEY = 'dw-character-sheet';

	function load() {
		try { return localStorage.getItem(STORAGE_KEY) ?? ''; }
		catch { return ''; }
	}

	let text = $state(load());

	$effect(() => {
		try { localStorage.setItem(STORAGE_KEY, text); } catch {}
	});

	const STAT_NAMES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

	const parsed = $derived.by(() => {
		const lines = text.split('\n');
		const get = (i) => lines[i]?.trim() || '';

		const name = get(0);
		const clazz = get(1);
		const level = get(2);

		const vitals = get(3);
		let hp = null, armor = null;
		const full = vitals.match(/(\d+)\s*(?:HP)?\s*,\s*(\d+)\s*(?:Armor)?/i);
		if (full) { hp = +full[1]; armor = +full[2]; }
		else { const m = vitals.match(/^(\d+)/); if (m) hp = +m[1]; }

		const statsRaw = get(4);
		const stats = {};
		if (statsRaw) {
			// Try labeled format: "STR +2, DEX -1, ..."
			const labeled = [...statsRaw.matchAll(/([A-Za-z]+)\s*([+-]?\d+)/g)];
			if (labeled.length > 0) {
				for (const m of labeled) stats[m[1].toUpperCase()] = +m[2];
			} else {
				// Shorthand: "2,-1,1,1,0,0" — maps to STR,DEX,CON,INT,WIS,CHA
				const nums = statsRaw.split(/[,\s]+/).map(Number).filter(n => !isNaN(n));
				for (let i = 0; i < Math.min(nums.length, STAT_NAMES.length); i++) {
					stats[STAT_NAMES[i]] = nums[i];
				}
			}
		}

		const alignment = get(5);
		const body = lines.slice(6).join('\n');

		return { name, clazz, level, hp, armor, stats, alignment, body };
	});

	const placeholders = $derived.by(() => {
		const lines = text.split('\n');
		const phs = [
			'Character name',
			'Class',
			'Level',
			'HP, Armor',
			'STR +2, DEX +1, CON +1, INT 0, WIS 0, CHA -1',
			'Alignment',
			'---',
			'## Moves',
			'- **Bend Bars, Lift Gates**',
			'',
			'## Equipment',
			'- Sword (close, +1 damage)',
		];
		const total = Math.max(lines.length + 1, phs.length);
		while (phs.length < total) phs.push('');
		return phs;
	});

	function fmtMod(n) {
		return n > 0 ? `+${n}` : `${n}`;
	}

	// Simple markdown → HTML
	function renderMarkdown(src) {
		if (!src.trim()) return '';
		const lines = src.split('\n');
		let html = '';
		let inList = false;
		let listTag = '';

		function closePendingList() {
			if (inList) { html += `</${listTag}>`; inList = false; }
		}

		function inline(t) {
			return t
				.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
				.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
				.replace(/__(.+?)__/g, '<strong>$1</strong>')
				.replace(/\*(.+?)\*/g, '<em>$1</em>')
				.replace(/_(.+?)_/g, '<em>$1</em>')
				.replace(/`(.+?)`/g, '<code>$1</code>')
				.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
		}

		for (const line of lines) {
			// Headings
			const hm = line.match(/^(#{1,4})\s+(.*)/);
			if (hm) {
				closePendingList();
				const level = hm[1].length;
				html += `<h${level}>${inline(hm[2])}</h${level}>`;
				continue;
			}

			// Horizontal rule
			if (/^---+$/.test(line.trim())) {
				closePendingList();
				html += '<hr>';
				continue;
			}

			// Blockquote
			if (line.startsWith('> ')) {
				closePendingList();
				html += `<blockquote><p>${inline(line.slice(2))}</p></blockquote>`;
				continue;
			}

			// Unordered list
			const ul = line.match(/^[-*]\s+(.*)/);
			if (ul) {
				if (!inList || listTag !== 'ul') { closePendingList(); html += '<ul>'; inList = true; listTag = 'ul'; }
				html += `<li>${inline(ul[1])}</li>`;
				continue;
			}

			// Ordered list
			const ol = line.match(/^\d+\.\s+(.*)/);
			if (ol) {
				if (!inList || listTag !== 'ol') { closePendingList(); html += '<ol>'; inList = true; listTag = 'ol'; }
				html += `<li>${inline(ol[1])}</li>`;
				continue;
			}

			// Empty line
			if (!line.trim()) {
				closePendingList();
				continue;
			}

			// Paragraph
			closePendingList();
			html += `<p>${inline(line)}</p>`;
		}
		closePendingList();
		return html;
	}

	const bodyHtml = $derived(renderMarkdown(parsed.body));
</script>

<svelte:head>
	<title>Character Sheet - Dungeon World</title>
</svelte:head>

<article class="dw-article">
	<h1>Character Sheet</h1>

	<div class="sheet-editor">
		<TextBox bind:value={text} {placeholders} rows={12} />
	</div>

	{#if parsed.name}
		<div class="sheet-preview">
			<div class="sheet-header">
				<h2 class="char-name">{parsed.name}</h2>
				{#if parsed.clazz || parsed.level || parsed.alignment}
					<p class="char-subtitle">
						{#if parsed.clazz}<span class="char-class">{parsed.clazz}</span>{/if}
						{#if parsed.level}<span class="char-level">Level {parsed.level}</span>{/if}
						{#if parsed.alignment}<span class="char-alignment">{parsed.alignment}</span>{/if}
					</p>
				{/if}
			</div>

			{#if parsed.hp !== null || parsed.armor !== null || Object.keys(parsed.stats).length > 0}
				<div class="char-stats">
					{#if parsed.hp !== null}
						<div class="stat-box">
							<span class="stat-label">HP</span>
							<span class="stat-value">{parsed.hp}</span>
						</div>
					{/if}
					{#if parsed.armor !== null}
						<div class="stat-box">
							<span class="stat-label">Armor</span>
							<span class="stat-value">{parsed.armor}</span>
						</div>
					{/if}
					{#each Object.entries(parsed.stats) as [ab, mod]}
						<div class="stat-box">
							<span class="stat-label">{ab}</span>
							<span class="stat-value">{fmtMod(mod)}</span>
						</div>
					{/each}
				</div>
			{/if}

			{#if bodyHtml}
				<div class="char-body">
					{@html bodyHtml}
				</div>
			{/if}
		</div>
	{/if}
</article>

<style>
	.sheet-editor {
		margin-bottom: 1.5rem;
	}

	.sheet-preview {
		border: 1px solid #333;
		border-radius: 6px;
		overflow: hidden;
	}

	.sheet-header {
		padding: 0.75rem 1rem;
		background: #252525;
		border-bottom: 1px solid #333;
	}

	.char-name {
		margin: 0;
		font-size: 1.4rem;
		text-align: left;
	}

	.char-subtitle {
		margin: 0.2rem 0 0;
		font-size: 0.9rem;
		color: #aaa;
	}

	.char-class {
		font-style: italic;
	}

	.char-level {
		margin-left: 0.5rem;
		color: #888;
	}

	.char-alignment {
		margin-left: 0.5rem;
		color: #d4a847;
	}

	.char-stats {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: #1e1e1e;
		border-bottom: 1px solid #2c2c2c;
	}

	.stat-box {
		display: flex;
		align-items: baseline;
		gap: 0.3rem;
		background: #2a2a2a;
		border: 1px solid #3a3a3a;
		border-radius: 999px;
		padding: 0.2rem 0.6rem;
		font-size: 0.88rem;
		white-space: nowrap;
	}

	.stat-label {
		font-size: 0.72rem;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #888;
	}

	.stat-value {
		color: #ddd;
		font-weight: bold;
	}

	.char-body {
		padding: 0.75rem 1rem;
		background: #1a1a1a;
	}

	/* Override article h2/h3 spacing within the sheet body */
	.char-body :global(h2) {
		margin-top: 1.5rem;
	}

	.char-body :global(h2:first-child) {
		margin-top: 0;
	}

	.char-body :global(h3) {
		margin-top: 1rem;
	}
</style>

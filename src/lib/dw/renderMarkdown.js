// Simple markdown → HTML (CommonMark-ish) with two-column layout for h2 sections with 2+ h3s
export function renderMarkdown(src) {
	if (!src.trim()) return '';

	// Pre-pass: collapse multiline [text](tooltip) where tooltip contains newlines
	src = src.replace(/\[([^\]]+)\]\(([^)]*\n[^)]*)\)/g, (_, text, body) => {
		return `[${text}](${body.replace(/\n/g, '\x01')})`;
	});

	const lines = src.split('\n');

	// Pre-scan: count h3s under each h2 (by line index)
	const h2H3Counts = new Map();
	let scanH2 = -1;
	for (let i = 0; i < lines.length; i++) {
		const hm = lines[i].match(/^(#{1,4})\s/);
		if (hm) {
			if (hm[1].length === 2) {
				scanH2 = i;
				h2H3Counts.set(i, 0);
			} else if (hm[1].length === 3 && scanH2 >= 0)
				h2H3Counts.set(scanH2, h2H3Counts.get(scanH2) + 1);
		}
	}

	let html = '';
	let coinId = 0;
	let inList = false;
	let listTag = '';
	let paraLines = [];
	let inMoveBlock = false;
	let inH2Section = false;
	let pendingColumns = false; // true when h2 wants columns but hasn't hit the first h3 yet
	let inColumns = false;
	let _h2Collapsed = false;
	let inBlockquote = false;
	let bqLines = [];

	function closeMoveBlock() {
		if (inMoveBlock) {
			html += '</div>';
			inMoveBlock = false;
		}
	}

	function closeColumns() {
		if (inColumns) {
			html += '</div>';
			inColumns = false;
		}
	}

	function closeH2Section() {
		closeMoveBlock();
		closeColumns();
		if (inH2Section) {
			html += '</div>';
			inH2Section = false;
		}
		pendingColumns = false;
		_h2Collapsed = false;
	}

	function flushBlockquote() {
		if (bqLines.length === 0) return;
		html += `<blockquote>${renderMarkdown(bqLines.join('\n'))}</blockquote>`;
		bqLines = [];
		inBlockquote = false;
	}

	function closePendingList() {
		if (inList) {
			html += `</${listTag}>`;
			inList = false;
		}
	}

	function flushPara() {
		if (paraLines.length === 0) return;
		const content = paraLines
			.map((l, i) => {
				const isLast = i === paraLines.length - 1;
				const hasBreak = !isLast && / {2,}$/.test(l);
				const hasBackslash = !isLast && /\\$/.test(l);
				const stripped = hasBreak ? l.replace(/ {2,}$/, '') : hasBackslash ? l.slice(0, -1) : l;
				let rendered = inline(stripped);

				if (/^\[/.test(l.trim())) {
					const afterCoin = l
						.trim()
						.replace(/^\[\d+\s*Coin\]\s*/, '')
						.replace(/ {2,}$/, '');
					if (afterCoin) {
						const esc = afterCoin
							.replace(/&/g, '&amp;')
							.replace(/</g, '&lt;')
							.replace(/>/g, '&gt;')
							.replace(/"/g, '&quot;');
						rendered = `<span class="copy-line" data-copy="${esc}" onclick="navigator.clipboard.writeText(this.dataset.copy);this.classList.add('copied');clearTimeout(this._t);this._t=setTimeout(()=>this.classList.remove('copied'),1200)">${rendered}</span>`;
					}
				}

				return hasBreak || hasBackslash ? `${rendered}<br>` : rendered;
			})
			.join('\n');
		html += `<p>${content}</p>`;
		paraLines = [];
	}

	function inline(t) {
		const escapes = [];
		t = t.replace(/\\([\\`*_[\]{}()#+\-.!|~])/g, (_, ch) => {
			escapes.push(ch);
			return `\x00ESC${escapes.length - 1}\x00`;
		});

		// Preserve inline HTML tags through escaping
		const htmlTags = [];
		t = t.replace(/<(\/?)(span|div|br|em|strong|sub|sup)(\s[^>]*)?\s*\/?>/gi, (match) => {
			htmlTags.push(match);
			return `\x00HTML${htmlTags.length - 1}\x00`;
		});

		t = t
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/__(.+?)__/g, '<strong>$1</strong>')
			.replace(/\*(.+?)\*/g, '<em>$1</em>')
			.replace(/_(.+?)_/g, '<em>$1</em>')
			.replace(/`(.+?)`/g, '<code>$1</code>')
			.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => {
				function makeTip(raw) {
					// eslint-disable-next-line no-control-regex
					return raw.replace(/\x01/g, '&#10;').replace(/"/g, '&quot;');
				}
				// [text](## "GitHub-flavored tooltip")
				const ghMatch = href.match(/^##?\s+"(.+)"$/s);
				if (ghMatch) return `<span class="lore-tip" data-tip="${makeTip(ghMatch[1])}">${text}</span>`;
				// [text]("Quoted tooltip")
				const quotedMatch = href.match(/^"(.+)"$/s);
				if (quotedMatch) return `<span class="lore-tip" data-tip="${makeTip(quotedMatch[1])}">${text}</span>`;
				// [text](tooltip with spaces) — contains a space, not a URL
				if ((/\s/.test(href) || /\x01/.test(href)) && !/^https?:\/\//.test(href)) {
					return `<span class="lore-tip" data-tip="${makeTip(href)}">${text}</span>`;
				}
				return `<a href="${href}">${text}</a>`;
			})
			.replace(/\[([^\]]+) Coin\]/g, (_, val) => {
				const fs = Math.min(50, Math.floor(130 / val.length));
				const gid = `cg${coinId++}`;
				return `<svg class="coin-icon" width="24" height="24" style="display:inline-block;vertical-align:middle;transform:translateY(-1px)" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="48" fill="url(#${gid})" stroke="#a07020" stroke-width="3"/><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f0d060"/><stop offset="100%" stop-color="#c9952a"/></linearGradient></defs><text x="50" y="54" text-anchor="middle" dominant-baseline="central" font-size="${fs}" font-weight="bold" fill="#3d2200" font-family="sans-serif">${val}</text></svg>`;
			})
			.replace(
				/\[([^\]]+) Armor\]/g,
				'<svg class="armor-icon" width="22" height="22" style="display:inline-block;vertical-align:middle;transform:translateY(-2px)" viewBox="0 0 512 559" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0,47)"><path d="M256 16L48 96v160c0 138.5 89 229.3 208 240 119-10.7 208-101.5 208-240V96L256 16z" fill="#3a6faa" stroke="#2a4f7a" stroke-width="16"/><path d="M256 48L80 116v140c0 120 78 199 176 210 98-11 176-90 176-210V116L256 48z" fill="#5a8fd4"/></g><text x="256" y="305" text-anchor="middle" dominant-baseline="central" font-size="240" font-weight="bold" fill="#fff" font-family="sans-serif">$1</text></svg>',
			)
			.replace(
				/\[([^\]]+) Weight\]/g,
				'<svg class="weight-icon" width="24" height="24" style="display:inline-block;vertical-align:middle;color:#444;transform:translateY(-2px)" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0,-20)"><path d="M256 46c-45.074 0-82 36.926-82 82 0 25.812 12.123 48.936 30.938 64H128L32 480h448l-96-288h-76.938C325.877 176.936 338 153.812 338 128c0-45.074-36.926-82-82-82zm0 36c25.618 0 46 20.382 46 46s-20.382 46-46 46-46-20.382-46-46 20.382-46 46-46z" fill="currentColor"/></g><text x="256" y="400" text-anchor="middle" font-size="240" font-weight="bold" fill="#fff" font-family="sans-serif">$1</text></svg>',
			);

		// eslint-disable-next-line no-control-regex
		t = t.replace(/\x00HTML(\d+)\x00/g, (_, i) => htmlTags[+i]);
		// eslint-disable-next-line no-control-regex
		t = t.replace(/\x00ESC(\d+)\x00/g, (_, i) =>
			escapes[+i].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
		);

		return t;
	}

	for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
		const line = lines[lineIdx];
		const hm = line.match(/^(#{1,6})\s+(.*)/);
		if (hm) {
			flushPara();
			flushBlockquote();
			closePendingList();
			const level = hm[1].length;
			if (level <= 2) {
				closeH2Section();
				let h2Text = hm[2];
				let collapsed = false;
				if (level === 2 && /\s*::\s*$/.test(h2Text)) {
					h2Text = h2Text.replace(/\s*::\s*$/, '');
					collapsed = true;
				}
				const h2Cls = collapsed ? ' class="collapsed-heading collapsed-inline"' : '';
				html += `<h${level}${h2Cls}>${inline(h2Text)}</h${level}>`;
				if (level === 2) {
					_h2Collapsed = collapsed;
					const cols = (h2H3Counts.get(lineIdx) || 0) >= 2;
					const cls = ['h2-section', collapsed && 'collapsed', collapsed && 'hide']
						.filter(Boolean)
						.join(' ');
					html += `<div class="${cls}">`;
					inH2Section = true;
					if (cols) pendingColumns = true;
				}
			} else if (level === 3) {
				closeMoveBlock();
				if (pendingColumns) {
					html += '<div class="h2-columns">';
					inColumns = true;
					pendingColumns = false;
				}
				html += '<div class="move-block">';
				inMoveBlock = true;
				let h3Text = hm[2];
				let h3Attr = '';
				if (/\s*###\s*$/.test(h3Text)) {
					h3Text = h3Text.replace(/\s*###\s*$/, '');
					h3Attr = ' data-glow';
				}
				html += `<h${level}${h3Attr}>${inline(h3Text)}</h${level}>`;
			} else {
				html += `<h${level}>${inline(hm[2])}</h${level}>`;
			}
			continue;
		}

		if (/^```/.test(line.trim())) {
			flushPara();
			closePendingList();
			const codeLines = [];
			lineIdx++;
			while (lineIdx < lines.length && !/^```/.test(lines[lineIdx].trim())) {
				codeLines.push(lines[lineIdx]);
				lineIdx++;
			}
			const raw = codeLines.join('\n');
			const escaped = raw
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;');
			html += `<pre class="code-block" onclick="navigator.clipboard.writeText(this.dataset.copy);this.classList.add('copied');clearTimeout(this._t);this._t=setTimeout(()=>this.classList.remove('copied'),1200)" data-copy="${escaped}">${escaped}</pre>`;
			continue;
		}

		if (/^---+$/.test(line.trim())) {
			flushPara();
			closePendingList();
			html += '<hr>';
			continue;
		}

		// Markdown pipe tables
		if (/^\|(.+)\|/.test(line.trim()) && lineIdx + 1 < lines.length && /^\|[\s:-]+\|/.test(lines[lineIdx + 1].trim())) {
			flushPara();
			closePendingList();
			const parseCells = (row) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
			const headers = parseCells(line);
			const sepCells = parseCells(lines[lineIdx + 1]);
			const aligns = sepCells.map(c => {
				const l = c.startsWith(':'), r = c.endsWith(':');
				return l && r ? 'center' : r ? 'right' : null;
			});
			lineIdx += 2; // skip header + separator
			html += '<table><thead><tr>';
			for (let ci = 0; ci < headers.length; ci++) {
				const a = aligns[ci] ? ` style="text-align:${aligns[ci]}"` : '';
				html += `<th${a}>${inline(headers[ci])}</th>`;
			}
			html += '</tr></thead><tbody>';
			while (lineIdx < lines.length && /^\|(.+)\|/.test(lines[lineIdx].trim())) {
				const cells = parseCells(lines[lineIdx]);
				html += '<tr>';
				for (let ci = 0; ci < headers.length; ci++) {
					const a = aligns[ci] ? ` style="text-align:${aligns[ci]}"` : '';
					html += `<td${a}>${inline(cells[ci] || '')}</td>`;
				}
				html += '</tr>';
				lineIdx++;
			}
			html += '</tbody></table>';
			lineIdx--; // outer loop will increment
			continue;
		}

		if (line.startsWith('> ') || (inBlockquote && line === '>')) {
			flushPara();
			closePendingList();
			bqLines.push(line === '>' ? '' : line.slice(2));
			inBlockquote = true;
			continue;
		}
		if (inBlockquote) {
			flushBlockquote();
		}

		const ul = line.match(/^[-*]\s+(.*)/);
		if (ul) {
			flushPara();
			if (!inList || listTag !== 'ul') {
				closePendingList();
				html += '<ul>';
				inList = true;
				listTag = 'ul';
			}
			html += `<li>${inline(ul[1])}</li>`;
			continue;
		}

		const ol = line.match(/^\d+\.\s+(.*)/);
		if (ol) {
			flushPara();
			if (!inList || listTag !== 'ol') {
				closePendingList();
				html += '<ol>';
				inList = true;
				listTag = 'ol';
			}
			html += `<li>${inline(ol[1])}</li>`;
			continue;
		}

		if (!line.trim()) {
			flushPara();
			closePendingList();
			continue;
		}

		if (/^\s*<\/?(?:ul|ol|li|div|table|tr|td|th)[\s>]/i.test(line)) {
			flushPara();
			closePendingList();
			html += line;
			continue;
		}

		closePendingList();
		paraLines.push(line);
	}
	flushPara();
	flushBlockquote();
	closePendingList();
	closeH2Section();
	return html;
}

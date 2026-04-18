// Simple markdown → HTML (CommonMark-ish) with two-column layout for h2 sections with 2+ h3s
export function renderMarkdown(src) {
	if (!src.trim()) return '';
	const lines = src.split('\n');

	// Pre-scan: count h3s under each h2 (by line index)
	const h2H3Counts = new Map();
	let scanH2 = -1;
	for (let i = 0; i < lines.length; i++) {
		const hm = lines[i].match(/^(#{1,4})\s/);
		if (hm) {
			if (hm[1].length === 2) { scanH2 = i; h2H3Counts.set(i, 0); }
			else if (hm[1].length === 3 && scanH2 >= 0) h2H3Counts.set(scanH2, h2H3Counts.get(scanH2) + 1);
		}
	}

	let html = '';
	let inList = false;
	let listTag = '';
	let paraLines = [];
	let inMoveBlock = false;
	let inH2Section = false;
	let pendingColumns = false; // true when h2 wants columns but hasn't hit the first h3 yet
	let inBlockquote = false;
	let bqLines = [];

	function closeMoveBlock() {
		if (inMoveBlock) { html += '</div>'; inMoveBlock = false; }
	}

	function closeH2Section() {
		closeMoveBlock();
		if (inH2Section) { html += '</div>'; inH2Section = false; }
		pendingColumns = false;
	}

	function flushBlockquote() {
		if (bqLines.length === 0) return;
		html += `<blockquote>${renderMarkdown(bqLines.join('\n'))}</blockquote>`;
		bqLines = [];
		inBlockquote = false;
	}

	function closePendingList() {
		if (inList) { html += `</${listTag}>`; inList = false; }
	}

	function flushPara() {
		if (paraLines.length === 0) return;
		const content = paraLines.map((l, i) => {
			const isLast = i === paraLines.length - 1;
			if (!isLast && / {2,}$/.test(l)) return inline(l.replace(/ {2,}$/, '')) + '<br>';
			if (!isLast && /\\$/.test(l)) return inline(l.slice(0, -1)) + '<br>';
			return inline(l);
		}).join('\n');
		html += `<p>${content}</p>`;
		paraLines = [];
	}

	function inline(t) {
		const escapes = [];
		t = t.replace(/\\([\\`*_\[\]{}()#+\-.!|~])/g, (_, ch) => {
			escapes.push(ch);
			return `\x00ESC${escapes.length - 1}\x00`;
		});

		t = t
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/__(.+?)__/g, '<strong>$1</strong>')
			.replace(/\*(.+?)\*/g, '<em>$1</em>')
			.replace(/_(.+?)_/g, '<em>$1</em>')
			.replace(/`(.+?)`/g, '<code>$1</code>')
			.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
			.replace(/\[([^\]]+) Coin\]/g, (_, val) => {
					const fs = Math.min(50, Math.floor(130 / val.length));
					return `<svg class="coin-icon" width="24" height="24" style="display:inline-block;vertical-align:middle" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="48" fill="url(#cg)" stroke="#a07020" stroke-width="3"/><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f0d060"/><stop offset="100%" stop-color="#c9952a"/></linearGradient></defs><text x="50" y="54" text-anchor="middle" dominant-baseline="central" font-size="${fs}" font-weight="bold" fill="#3d2200" font-family="sans-serif">${val}</text></svg>`;
				})
			.replace(/\[([^\]]+) Armor\]/g, '<svg class="armor-icon" width="22" height="22" style="display:inline-block;vertical-align:middle;transform:translateY(-2px)" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0,47)"><path d="M256 16L48 96v160c0 138.5 89 229.3 208 240 119-10.7 208-101.5 208-240V96L256 16z" fill="#3a6faa" stroke="#2a4f7a" stroke-width="16"/><path d="M256 48L80 116v140c0 120 78 199 176 210 98-11 176-90 176-210V116L256 48z" fill="#5a8fd4"/></g><text x="256" y="295" text-anchor="middle" dominant-baseline="central" font-size="240" font-weight="bold" fill="#fff" font-family="sans-serif">$1</text></svg>')
			.replace(/\[([^\]]+) Weight\]/g, '<svg class="weight-icon" width="22" height="22" style="display:inline-block;vertical-align:middle;color:#444;transform:translateY(-2px)" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="M256 46c-45.074 0-82 36.926-82 82 0 25.812 12.123 48.936 30.938 64H128L32 480h448l-96-288h-76.938C325.877 176.936 338 153.812 338 128c0-45.074-36.926-82-82-82zm0 36c25.618 0 46 20.382 46 46s-20.382 46-46 46-46-20.382-46-46 20.382-46 46-46z" fill="currentColor"/><text x="256" y="400" text-anchor="middle" font-size="240" font-weight="bold" fill="#fff" font-family="sans-serif">$1</text></svg>');

		t = t.replace(/\x00ESC(\d+)\x00/g, (_, i) => escapes[+i].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));

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
				html += `<h${level}>${inline(hm[2])}</h${level}>`;
				if (level === 2) {
					const cols = (h2H3Counts.get(lineIdx) || 0) >= 2;
					if (cols) {
						// Defer opening the columns div until the first h3
						html += `<div class="h2-section">`;
						pendingColumns = true;
					} else {
						html += `<div class="h2-section">`;
					}
					inH2Section = true;
				}
			} else if (level === 3) {
				closeMoveBlock();
				if (pendingColumns) {
					// Close the pre-h3 wrapper and open columns
					html += '</div>';
					html += '<div class="h2-section h2-columns">';
					pendingColumns = false;
				}
				html += '<div class="move-block">';
				inMoveBlock = true;
				html += `<h${level}>${inline(hm[2])}</h${level}>`;
			} else {
				html += `<h${level}>${inline(hm[2])}</h${level}>`;
			}
			continue;
		}

		if (/^---+$/.test(line.trim())) {
			flushPara();
			closePendingList();
			html += '<hr>';
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
			if (!inList || listTag !== 'ul') { closePendingList(); html += '<ul>'; inList = true; listTag = 'ul'; }
			html += `<li>${inline(ul[1])}</li>`;
			continue;
		}

		const ol = line.match(/^\d+\.\s+(.*)/);
		if (ol) {
			flushPara();
			if (!inList || listTag !== 'ol') { closePendingList(); html += '<ol>'; inList = true; listTag = 'ol'; }
			html += `<li>${inline(ol[1])}</li>`;
			continue;
		}

		if (!line.trim()) {
			flushPara();
			closePendingList();
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

// ---------- LaTeX over the canvas ----------
// KaTeX renders HTML, not canvas drawings, so typeset math lives in absolutely positioned
// elements in a layer above the canvas. The canvas code still lays everything out: it asks
// for a formula's size, draws the box behind it, and says where the formula goes each frame.
import type katexT from 'katex';

let katex: typeof katexT | null = null;
let loading: Promise<void> | null = null;

/** load KaTeX (and its stylesheet and fonts) the first time a LaTeX level needs it */
export function loadTex() {
	loading ??= Promise.all([import('katex'), import('katex/dist/katex.min.css')]).then(([m]) => {
		katex = m.default;
	});
	return loading;
}

type Entry = { html: string; w: number; h: number };
type Slot = { el: HTMLDivElement; key: string; used: boolean };

export class TexLayer {
	root: HTMLDivElement;
	measurer: HTMLDivElement;
	/** logical units per css px (the canvas's scale) */
	unit = 1;
	cache = new Map<string, Entry>();
	pool: Slot[] = [];

	constructor(parent: HTMLElement) {
		this.root = document.createElement('div');
		Object.assign(this.root.style, {
			position: 'fixed',
			inset: '0',
			pointerEvents: 'none',
			zIndex: '1001',
			overflow: 'hidden',
		});
		this.measurer = document.createElement('div');
		Object.assign(this.measurer.style, {
			position: 'absolute',
			visibility: 'hidden',
			whiteSpace: 'nowrap',
			fontSize: '100px',
			left: '-9999px',
			top: '0',
		});
		this.root.append(this.measurer);
		parent.append(this.root);
		// sizes measured before KaTeX's fonts arrive are off; measure again once they're in
		document.fonts?.addEventListener('loadingdone', () => this.cache.clear());
	}

	get ready() {
		return katex !== null;
	}

	/** rendered HTML and its size in em */
	entry(tex: string): Entry | null {
		if (!katex) return null;
		let e = this.cache.get(tex);
		if (!e) {
			const html = katex.renderToString(tex, { throwOnError: false, output: 'html' });
			this.measurer.innerHTML = html;
			e = { html, w: this.measurer.offsetWidth / 100, h: this.measurer.offsetHeight / 100 };
			if (this.cache.size > 800) this.cache.clear();
			this.cache.set(tex, e);
		}
		return e;
	}

	/** size of a formula at `size` logical px */
	measure(tex: string, size: number) {
		const e = this.entry(tex);
		return e ? { w: e.w * size, h: e.h * size } : null;
	}

	begin() {
		for (const s of this.pool) s.used = false;
	}

	/** draw a formula centred on (cx, cy) in logical units this frame */
	place(tex: string, cx: number, cy: number, size: number, color: string, alpha = 1) {
		const e = this.entry(tex);
		if (!e) return;
		let slot = this.pool.find((s) => !s.used && s.key === tex);
		if (!slot) {
			slot = this.pool.find((s) => !s.used && s.el.style.display === 'none');
			if (!slot) {
				const el = document.createElement('div');
				Object.assign(el.style, {
					position: 'absolute',
					whiteSpace: 'nowrap',
					transform: 'translate(-50%, -50%)',
					lineHeight: '1',
				});
				this.root.append(el);
				slot = { el, key: '', used: false };
				this.pool.push(slot);
			}
			if (slot.key !== tex) {
				slot.el.innerHTML = e.html;
				slot.key = tex;
			}
		}
		slot.used = true;
		const u = this.unit;
		const st = slot.el.style;
		st.display = 'block';
		st.left = `${cx / u}px`;
		st.top = `${cy / u}px`;
		st.fontSize = `${size / u}px`;
		st.color = color;
		st.opacity = String(alpha);
	}

	/** hide whatever wasn't placed this frame */
	end() {
		for (const s of this.pool) if (!s.used) s.el.style.display = 'none';
		// don't let a long run pile up hidden elements
		if (this.pool.length > 80) {
			const keep = this.pool.filter((s) => s.used);
			for (const s of this.pool) if (!s.used) s.el.remove();
			this.pool = keep;
		}
	}

	destroy() {
		this.root.remove();
	}
}

/** the page's layer (null when running without a DOM, e.g. in tests) */
export const texHost: { layer: TexLayer | null } = { layer: null };

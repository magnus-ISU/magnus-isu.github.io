// ---------- Math answers: parse LaTeX or plain-text input, evaluate it, and judge its form ----------
//
// Answers on LaTeX levels are typed freely (`\frac{1}{2}`, `1/2`, `3+4i`, `(x+2)(x-3)`,
// `\begin{pmatrix}1&2\\3&4\end{pmatrix}`, `[[1,2],[3,4]]`, `pi/6`, `sqrt(2)`...).
// A typed answer counts when its value matches AND it's written in the shape the problem asks
// for (a plain number can't be `2+3`; a factoring can't be the expanded polynomial). A right
// answer that isn't fully simplified (`2/4`, `\sqrt{8}`) still hits, but is judged 'loose'.

export type Node =
	| { t: 'num'; v: number; dec: boolean }
	| { t: 'sym'; name: 'x' | 'i' | 'pi' | 'e' }
	| { t: 'add'; terms: { neg: boolean; n: Node }[] }
	| { t: 'mul'; fs: Node[] }
	| { t: 'div'; a: Node; b: Node; frac: boolean }
	| { t: 'pow'; a: Node; b: Node }
	| { t: 'neg'; a: Node }
	| { t: 'sqrt'; a: Node }
	| { t: 'mat'; rows: Node[][] }
	| { t: 'tuple'; items: Node[] }
	| { t: 'list'; items: Node[] };

type Tok = { k: 'num'; v: string } | { k: 'id'; v: string } | { k: 'op'; v: string };

// ---------- tokenizer ----------
const CMD_OPS: Record<string, string> = {
	cdot: '*',
	times: '*',
	div: '/',
	left: '',
	right: '',
	',': '',
	';': '',
	'!': '',
	quad: '',
	dfrac: 'frac',
	tfrac: 'frac',
	frac: 'frac',
	sqrt: 'sqrt',
	pi: 'pi',
	begin: 'begin',
	end: 'end',
	mathrm: '',
	text: '',
};

function tokenize(src: string): Tok[] | null {
	const s = src
		.replace(/−/g, '-')
		.replace(/×|·/g, '*')
		.replace(/π/g, ' pi ')
		.replace(/√/g, ' sqrt ');
	const out: Tok[] = [];
	let i = 0;
	while (i < s.length) {
		const c = s[i];
		if (/\s/.test(c)) {
			i++;
		} else if (/[0-9.]/.test(c)) {
			let j = i;
			while (j < s.length && /[0-9.]/.test(s[j])) j++;
			out.push({ k: 'num', v: s.slice(i, j) });
			i = j;
		} else if (c === '\\') {
			if (s[i + 1] === '\\') {
				out.push({ k: 'op', v: 'row' });
				i += 2;
				continue;
			}
			let j = i + 1;
			if (/[a-zA-Z]/.test(s[j] ?? '')) while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
			else j++;
			const name = s.slice(i + 1, j);
			i = j;
			if (name === '{' || name === '}') continue;
			const op = CMD_OPS[name];
			if (op === undefined) return null;
			// \left( and \right) drop the command but keep the bracket; \text{i} keeps its braced word
			if (op === '') continue;
			if (op === 'begin' || op === 'end') {
				const m = /^\{([a-z]*\*?)\}/.exec(s.slice(i));
				if (!m) return null;
				i += m[0].length;
				out.push({ k: 'op', v: op });
				continue;
			}
			if (op === 'pi') out.push({ k: 'id', v: 'pi' });
			else if (op === '*' || op === '/') out.push({ k: 'op', v: op });
			else out.push({ k: 'id', v: op });
		} else if (/[a-zA-Z]/.test(c)) {
			let j = i;
			while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
			const word = s.slice(i, j).toLowerCase();
			i = j;
			// split runs of single-letter symbols ("xi" -> x i), but keep known words
			let k = 0;
			while (k < word.length) {
				const rest = word.slice(k);
				const w = ['sqrt', 'pi'].find((x) => rest.startsWith(x));
				if (w) {
					out.push({ k: 'id', v: w });
					k += w.length;
				} else if ('xie'.includes(rest[0])) {
					out.push({ k: 'id', v: rest[0] });
					k++;
				} else return null;
			}
		} else if ('+-*/^(){}[],&'.includes(c)) {
			out.push({ k: 'op', v: c });
			i++;
		} else return null;
	}
	return out;
}

// ---------- parser ----------
class Parser {
	i = 0;
	constructor(public toks: Tok[]) {}
	peek(): Tok | undefined {
		return this.toks[this.i];
	}
	isOp(v: string) {
		const t = this.peek();
		return t?.k === 'op' && t.v === v;
	}
	eat(v: string) {
		if (!this.isOp(v)) throw new Error(`expected ${v}`);
		this.i++;
	}
	/** a, b, c at the top level (or inside brackets) */
	list(): Node {
		const items = [this.expr()];
		while (this.isOp(',')) {
			this.i++;
			items.push(this.expr());
		}
		return items.length === 1 ? items[0] : { t: 'list', items };
	}
	expr(): Node {
		const terms: { neg: boolean; n: Node }[] = [];
		let neg = false;
		if (this.isOp('+')) this.i++;
		else if (this.isOp('-')) {
			this.i++;
			neg = true;
		}
		terms.push({ neg, n: this.term() });
		while (this.isOp('+') || this.isOp('-')) {
			const n = this.isOp('-');
			this.i++;
			terms.push({ neg: n, n: this.term() });
		}
		return terms.length === 1 && !terms[0].neg ? terms[0].n : { t: 'add', terms };
	}
	startsFactor() {
		const t = this.peek();
		if (!t) return false;
		if (t.k !== 'op') return true;
		return t.v === '(' || t.v === '{' || t.v === '[' || t.v === 'begin';
	}
	term(): Node {
		let node = this.signed();
		const fs: Node[] = [node];
		for (;;) {
			if (this.isOp('*')) {
				this.i++;
				fs.push(this.signed());
			} else if (this.isOp('/')) {
				this.i++;
				const b = this.signed();
				const a: Node = fs.length === 1 ? fs[0] : { t: 'mul', fs: [...fs] };
				fs.length = 0;
				fs.push({ t: 'div', a, b, frac: false });
			} else if (this.startsFactor()) fs.push(this.power());
			else break;
		}
		node = fs.length === 1 ? fs[0] : { t: 'mul', fs };
		return node;
	}
	signed(): Node {
		if (this.isOp('-')) {
			this.i++;
			return { t: 'neg', a: this.signed() };
		}
		if (this.isOp('+')) {
			this.i++;
			return this.signed();
		}
		return this.power();
	}
	power(): Node {
		const a = this.atom();
		if (this.isOp('^')) {
			this.i++;
			if (this.isOp('-')) {
				this.i++;
				return { t: 'pow', a, b: { t: 'neg', a: this.atom() } };
			}
			return { t: 'pow', a, b: this.atom() };
		}
		return a;
	}
	group(open: string, close: string): Node {
		this.eat(open);
		const n = this.list();
		this.eat(close);
		return n;
	}
	atom(): Node {
		const t = this.peek();
		if (!t) throw new Error('end');
		if (t.k === 'num') {
			this.i++;
			if (!/^\d*\.?\d*$/.test(t.v) || t.v === '.') throw new Error('number');
			return { t: 'num', v: Number(t.v), dec: t.v.includes('.') };
		}
		if (t.k === 'id') {
			this.i++;
			if (t.v === 'frac') {
				const a = this.group('{', '}');
				const b = this.group('{', '}');
				return { t: 'div', a, b, frac: true };
			}
			if (t.v === 'sqrt') {
				if (this.isOp('{')) return { t: 'sqrt', a: this.group('{', '}') };
				if (this.isOp('(')) return { t: 'sqrt', a: this.group('(', ')') };
				return { t: 'sqrt', a: this.atom() };
			}
			if (t.v === 'x' || t.v === 'i' || t.v === 'pi' || t.v === 'e') return { t: 'sym', name: t.v };
			throw new Error('id');
		}
		if (t.v === '(') {
			const n = this.group('(', ')');
			return n.t === 'list' ? { t: 'tuple', items: n.items } : n;
		}
		if (t.v === '{') return this.group('{', '}');
		if (t.v === '[') {
			// [[1,2],[3,4]] is a matrix, [1,2,3] a vector
			const n = this.group('[', ']');
			const items = n.t === 'list' ? n.items : [n];
			if (items.every((r) => r.t === 'tuple' || (r.t === 'mat' && r.rows.length === 1)))
				return {
					t: 'mat',
					rows: items.map((r) => (r.t === 'tuple' ? r.items : (r as { rows: Node[][] }).rows[0])),
				};
			return { t: 'tuple', items };
		}
		if (t.v === 'begin') {
			this.i++;
			const rows: Node[][] = [[]];
			for (;;) {
				if (this.isOp('end')) {
					this.i++;
					break;
				}
				rows[rows.length - 1].push(this.expr());
				if (this.isOp('&')) this.i++;
				else if (this.isOp('row')) {
					this.i++;
					if (!this.isOp('end')) rows.push([]);
				} else if (!this.isOp('end')) throw new Error('matrix');
			}
			return { t: 'mat', rows };
		}
		throw new Error(`unexpected ${t.v}`);
	}
}

/** parse typed input; null when it can't be read (unbalanced, unknown commands, empty boxes) */
export function parse(src: string): Node | null {
	if (src.includes('□')) return null;
	const toks = tokenize(src);
	if (!toks?.length) return null;
	// ASCII brackets used as a matrix row separator: "[1,2],[3,4]" is read as given
	try {
		const p = new Parser(toks);
		const n = p.list();
		if (p.i !== toks.length) return null;
		return n;
	} catch {
		return null;
	}
}

// ---------- evaluation (complex numbers, with x as a variable) ----------
export type C = { re: number; im: number };
const c = (re: number, im = 0): C => ({ re, im });
const add = (a: C, b: C) => c(a.re + b.re, a.im + b.im);
const sub = (a: C, b: C) => c(a.re - b.re, a.im - b.im);
const mul = (a: C, b: C) => c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
function div(a: C, b: C) {
	const d = b.re * b.re + b.im * b.im;
	return c((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
}
function cpow(a: C, b: C): C {
	if (b.im === 0 && Number.isInteger(b.re) && Math.abs(b.re) <= 64) {
		let r = c(1);
		for (let k = 0; k < Math.abs(b.re); k++) r = mul(r, a);
		return b.re < 0 ? div(c(1), r) : r;
	}
	if (a.im === 0 && a.re > 0 && b.im === 0) return c(a.re ** b.re);
	// principal value
	const r = Math.hypot(a.re, a.im);
	const th = Math.atan2(a.im, a.re);
	const lr = Math.log(r);
	const mag = Math.exp(b.re * lr - b.im * th);
	const ang = b.im * lr + b.re * th;
	return c(mag * Math.cos(ang), mag * Math.sin(ang));
}
function csqrt(a: C): C {
	if (a.im === 0 && a.re >= 0) return c(Math.sqrt(a.re));
	return cpow(a, c(0.5));
}

/** value of a scalar expression; throws on matrices/lists */
export function evalC(n: Node, x: C = c(0)): C {
	switch (n.t) {
		case 'num':
			return c(n.v);
		case 'sym':
			return n.name === 'x'
				? x
				: n.name === 'i'
					? c(0, 1)
					: n.name === 'pi'
						? c(Math.PI)
						: c(Math.E);
		case 'add':
			return n.terms.reduce((acc, t) => {
				const v = evalC(t.n, x);
				return t.neg ? sub(acc, v) : add(acc, v);
			}, c(0));
		case 'mul':
			return n.fs.reduce((acc, f) => mul(acc, evalC(f, x)), c(1));
		case 'div':
			return div(evalC(n.a, x), evalC(n.b, x));
		case 'pow':
			return cpow(evalC(n.a, x), evalC(n.b, x));
		case 'neg': {
			const v = evalC(n.a, x);
			return c(-v.re, -v.im);
		}
		case 'sqrt':
			return csqrt(evalC(n.a, x));
		default:
			throw new Error('not a number');
	}
}

const close = (a: C, b: C) => {
	const scale = Math.max(1, Math.hypot(b.re, b.im));
	return Math.hypot(a.re - b.re, a.im - b.im) <= 1e-7 * scale;
};
const hasX = (n: Node): boolean => {
	switch (n.t) {
		case 'sym':
			return n.name === 'x';
		case 'num':
			return false;
		case 'add':
			return n.terms.some((t) => hasX(t.n));
		case 'mul':
			return n.fs.some(hasX);
		case 'div':
		case 'pow':
			return hasX(n.a) || hasX(n.b);
		case 'neg':
		case 'sqrt':
			return hasX(n.a);
		default:
			return true;
	}
};

// ---------- form checks ----------
/** 'ok' = simplest form, 'loose' = right shape but not fully simplified, null = wrong shape */
type Form = 'ok' | 'loose' | null;
const worst = (a: Form, b: Form): Form =>
	a === null || b === null ? null : a === 'loose' || b === 'loose' ? 'loose' : 'ok';

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
/** n has a square factor > 1 (or is a perfect square) */
function notSquareFree(n: number) {
	for (let k = 2; k * k <= n; k++) if (n % (k * k) === 0) return true;
	return n > 1 && Number.isInteger(Math.sqrt(n));
}

/**
 * A "monomial" of a plain number: an optional rational coefficient times at most one each of
 * √n, π and i. Returns its signature (which irrational parts it has), its integer coefficient
 * (for the fraction gcd check) and its form.
 */
type Mono = { sig: string; coef: number; form: Form };
function mono(n: Node, allowX = false): Mono | null {
	const parts = { coef: 1, sqrt: 0, pi: 0, i: 0, x: 0, xPow: 0, ints: 0 };
	let form: Form = 'ok';
	const walk = (f: Node): boolean => {
		switch (f.t) {
			case 'num':
				parts.ints++;
				parts.coef *= f.v;
				return parts.ints <= 1;
			case 'sym':
				if (f.name === 'x') {
					if (!allowX) return false;
					parts.x++;
					parts.xPow = 1;
					return parts.x <= 1;
				}
				if (f.name === 'e') return false;
				parts[f.name]++;
				return parts[f.name] <= 1;
			case 'sqrt': {
				if (f.a.t !== 'num' || f.a.dec || f.a.v <= 0) return false;
				if (notSquareFree(f.a.v)) form = 'loose';
				parts.sqrt++;
				parts.coef *= 1;
				return parts.sqrt <= 1;
			}
			case 'mul':
				return f.fs.every(walk);
			case 'pow':
				// x^k (k a whole number) is the only power a simplified term has
				if (
					allowX &&
					f.a.t === 'sym' &&
					f.a.name === 'x' &&
					f.b.t === 'num' &&
					Number.isInteger(f.b.v) &&
					f.b.v >= 2
				) {
					parts.x++;
					parts.xPow = f.b.v;
					return parts.x <= 1;
				}
				return false;
			case 'div': {
				// a fraction inside a term: \frac{1}{2} i, \frac{\sqrt{3}}{2}, \frac{\pi}{6}
				const fr = fraction(f, allowX);
				if (!fr) return false;
				form = worst(form, fr.form);
				parts.ints++;
				parts.coef *= fr.coef;
				for (const k of ['sqrt', 'pi', 'i'] as const) if (fr.sig.includes(k)) parts[k]++;
				const xm = /x(\d+)/.exec(fr.sig);
				if (xm) {
					parts.x++;
					parts.xPow = Number(xm[1]);
				}
				return parts.ints <= 1 && parts.sqrt <= 1 && parts.pi <= 1 && parts.i <= 1 && parts.x <= 1;
			}
			default:
				return false;
		}
	};
	if (!walk(n)) return null;
	const sig = `${parts.sqrt ? 'sqrt' : ''}${parts.pi ? 'pi' : ''}${parts.i ? 'i' : ''}${parts.x ? `x${parts.xPow}` : ''}`;
	// the sqrt's radicand is part of its signature so √2 + √3 is fine but √2 + 3√2 isn't
	const rad: number[] = [];
	const findRad = (f: Node) => {
		if (f.t === 'sqrt' && f.a.t === 'num') rad.push(f.a.v);
		if (f.t === 'mul') f.fs.forEach(findRad);
	};
	findRad(n);
	return { sig: sig + (rad.length ? `(${rad[0]})` : ''), coef: parts.coef, form };
}

/** a fraction whose top is a simplified sum and whose bottom is a whole number */
function fraction(n: Node & { t: 'div' }, allowX = false): Mono | null {
	const top = sum(n.a, allowX);
	if (!top) return null;
	let form = top.form;
	let den = n.b;
	let negDen = false;
	if (den.t === 'neg') {
		den = den.a;
		negDen = true;
	}
	if (den.t !== 'num' || den.dec || den.v === 0) {
		// a root (or anything else) left in the denominator: right value, not simplified
		const d = mono(den);
		if (!d) return null;
		form = 'loose';
		return { sig: top.sig, coef: 1, form };
	}
	if (negDen || den.v === 1) form = 'loose';
	const g = top.coefs.reduce((acc, k) => gcd(acc, Math.round(k)), den.v);
	if (top.coefs.every((k) => Number.isInteger(k)) && g > 1) form = 'loose';
	if (top.terms > 1) return { sig: '+', coef: 1, form };
	return { sig: top.sig, coef: top.coefs[0] / den.v, form };
}

/** a sum of monomials with different signatures (no like terms left to collect) */
function sum(
	n: Node,
	allowX = false,
): { sig: string; coefs: number[]; form: Form; terms: number } | null {
	const terms = n.t === 'add' ? n.terms.map((t) => t.n) : [n];
	let form: Form = 'ok';
	const sigs = new Set<string>();
	const coefs: number[] = [];
	for (let t of terms) {
		if (t.t === 'neg') t = t.a;
		const m = t.t === 'div' ? fraction(t, allowX) : mono(t, allowX);
		if (!m || (m.sig === '+' && terms.length > 1)) return null;
		if (sigs.has(m.sig)) return null;
		sigs.add(m.sig);
		coefs.push(m.coef);
		form = worst(form, m.form);
	}
	return { sig: [...sigs][0] ?? '', coefs, form, terms: terms.length };
}

/** a plain number written out: 7, −3, \frac{1}{2}, 2\sqrt{3}, \frac{\pi}{6}, 3 − 4i, \frac{1+\sqrt5}{2} */
export function numberForm(n: Node): Form {
	if (hasX(n)) return null;
	if (n.t === 'neg') return numberForm(n.a);
	const s = sum(n);
	return s ? s.form : null;
}

/** a collected polynomial in x: 3x^2 − 2x + \frac{1}{2} */
export function polyForm(n: Node): Form {
	const s = sum(n.t === 'neg' ? n.a : n, true);
	return s ? s.form : null;
}

/** a product of linear factors: 2(x+1)(x−3), (x−2)^2, x(x+4) */
export function factoredForm(n: Node): Form {
	// −(x+1)(x−2) factors the same as (x+1)(x−2)
	if (n.t === 'add' && n.terms.length === 1) n = n.terms[0].n;
	if (n.t === 'neg') n = n.a;
	const fs: Node[] = n.t === 'mul' ? n.fs : [n];
	let form: Form = 'ok';
	let linear = 0;
	for (let f of fs) {
		let p = 1;
		if (f.t === 'pow' && f.b.t === 'num' && Number.isInteger(f.b.v) && f.b.v >= 2) {
			p = f.b.v;
			f = f.a;
		}
		if (!hasX(f)) {
			if (p !== 1) return null;
			form = worst(form, numberForm(f));
			continue;
		}
		// ax + b with a, b plain numbers
		const pf = polyForm(f);
		if (!pf) return null;
		const terms = f.t === 'add' ? f.terms.map((t) => t.n) : [f];
		if (terms.some((t) => /x[2-9]/.test(mono(t, true)?.sig ?? ''))) return null;
		form = worst(form, pf);
		linear += p;
	}
	return linear >= 1 ? form : null;
}

// ---------- answers ----------
export type Ans =
	/** a plain number (possibly complex, possibly irrational) */
	| { kind: 'num'; v: C }
	/** a function of x, compared at several points; the form says how it must be written */
	| { kind: 'expr'; f: (x: number) => number; form: 'poly' | 'factored' }
	/** a matrix or vector (vectors may be typed as (a, b) or [a, b] or a column) */
	| { kind: 'mat'; rows: C[][] }
	/** several numbers in any order */
	| { kind: 'set'; vs: C[] };

export type Verdict = 'exact' | 'loose' | false;

const SAMPLES = [0.37, 1.91, -2.3, 3.7, -0.83];

/** entries of a typed matrix/vector, row by row */
function grid(n: Node): Node[][] | null {
	if (n.t === 'mat') return n.rows;
	if (n.t === 'tuple' || n.t === 'list') return [n.items];
	return null;
}

export function judge(ans: Ans, n: Node | null): Verdict {
	if (!n) return false;
	const verdict = (form: Form, ok: boolean): Verdict =>
		!ok || !form ? false : form === 'ok' ? 'exact' : 'loose';
	try {
		switch (ans.kind) {
			case 'num':
				return verdict(numberForm(n), close(evalC(n), ans.v));
			case 'expr': {
				const form = ans.form === 'poly' ? polyForm(n) : factoredForm(n);
				const ok = SAMPLES.every((x) => close(evalC(n, c(x)), c(ans.f(x))));
				return verdict(form, ok);
			}
			case 'mat': {
				const g = grid(n);
				if (!g) return false;
				const want = ans.rows;
				const flat = g.flat();
				const wantFlat = want.flat();
				// a vector can be typed as a row or a column
				const vector = want.length === 1 || want.every((r) => r.length === 1);
				const shapeOk = vector
					? flat.length === wantFlat.length && (g.length === 1 || g.every((r) => r.length === 1))
					: g.length === want.length && g.every((r, i) => r.length === want[i].length);
				if (!shapeOk) return false;
				let form: Form = 'ok';
				for (const [k, e] of flat.entries()) {
					form = worst(form, numberForm(e));
					if (!close(evalC(e), wantFlat[k])) return false;
				}
				return verdict(form, true);
			}
			case 'set': {
				const items = n.t === 'list' ? n.items : [n];
				if (items.length !== ans.vs.length) return false;
				const left = [...ans.vs];
				let form: Form = 'ok';
				for (const it of items) {
					form = worst(form, numberForm(it));
					const v = evalC(it);
					const k = left.findIndex((w) => close(v, w));
					if (k < 0) return false;
					left.splice(k, 1);
				}
				return verdict(form, true);
			}
		}
	} catch {
		return false;
	}
}

/** judge against a whole-number answer (problems without a special Ans) */
export const judgeInt = (answer: number, n: Node | null): Verdict =>
	judge({ kind: 'num', v: c(answer) }, n);

export const num = (re: number, im = 0): Ans => ({ kind: 'num', v: c(re, im) });

// ---------- showing typed input ----------
/**
 * LaTeX for the answer box: plain-text shortcuts become symbols, empty template boxes show as
 * squares and the one being filled is highlighted.
 */
export function inputTex(raw: string, cursor: number): string {
	let out = '';
	for (let k = 0; k < raw.length; k++) {
		const ch = raw[k];
		if (ch === '□') out += k === cursor ? '{\\color{#ffd84a}\\blacksquare}' : '\\square ';
		else out += ch;
	}
	// close braces still open mid-typing so the rest shows instead of an error
	const depth = [...out].reduce((d, ch) => d + (ch === '{' ? 1 : ch === '}' ? -1 : 0), 0);
	if (depth > 0) out += '}'.repeat(depth);
	return out
		.replace(/(^|[^\\a-z])pi/g, '$1\\pi ')
		.replace(/sqrt\(([^()]*)\)/g, 'sqrt{$1}')
		.replace(/(^|[^\\a-z])sqrt/g, '$1\\sqrt')
		.replace(/\*/g, '\\cdot ')
		.replace(/−/g, '-');
}

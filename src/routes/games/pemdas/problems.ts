export type Part = { text: string; answer: number; revealed: boolean };
export type Problem = { text: string; answer: number; parts?: Part[] };
export type Gen = () => Problem;

export const r = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

const fmt = (s: string) => s.replace(/\*/g, '×').replace(/([+\-×/])/g, ' $1 ');

function evalExpr(s: string): number {
	return Function(`"use strict";return (${s})`)();
}

const ok = (n: number) => Number.isInteger(n) && n >= 0;

/** Fill a template like "(a+b)*c" where each letter is a token generator, retrying until the answer is a non-negative integer. */
function templated(templates: string[], tokens: Record<string, () => string>, max = Infinity): Gen {
	return () => {
		for (let i = 0; i < 500; i++) {
			const s = pick(templates).replace(/[A-Za-z]/g, (c) => tokens[c]());
			const answer = evalExpr(s);
			if (ok(answer) && answer <= max) return { text: fmt(s), answer };
		}
		return { text: '2 + 2', answer: 4 };
	};
}

const div = (lo: number, hi: number) => () => {
	const f = r(lo, hi);
	return `${f * r(lo, hi)}/${f}`;
};

// ---------- Level 1: add & subtract ----------
export const addTiny: Gen = () => {
	const a = r(1, 5),
		b = r(1, 5);
	return { text: `${a} + ${b}`, answer: a + b };
};
export const addSub1: Gen = () => {
	if (Math.random() < 0.5) {
		const a = r(1, 9),
			b = r(1, 9);
		return { text: `${a} + ${b}`, answer: a + b };
	}
	const a = r(2, 18),
		b = r(1, Math.min(9, a));
	return { text: `${a} − ${b}`, answer: a - b };
};
export const addSub21: Gen = () => {
	const a = r(10, 99),
		b = r(1, 9);
	return Math.random() < 0.5
		? { text: `${a} + ${b}`, answer: a + b }
		: { text: `${a} − ${b}`, answer: a - b };
};

// ---------- Level 2: times & divide ----------
export const mulDiv =
	(max: number, min = 2): Gen =>
	() => {
		const a = r(min, max),
			b = r(min, max);
		return Math.random() < 0.55
			? { text: `${a} × ${b}`, answer: a * b }
			: { text: `${a * b} / ${b}`, answer: a };
	};

// ---------- Level 3: mixed single digit ----------
const dig = () => String(r(1, 9));
const t1 = { a: dig, b: dig, c: dig, d: dig, D: div(1, 9) };
export const mixed1Easy = templated(['a+b*c', 'a*b+c', '(a+b)*c', 'a*b-c'], t1);
export const mixed1 = templated(
	['a+b*c', 'a*b+c', 'a*b-c', '(a+b)*c', 'a*(b+c)', '(a-b)*c', 'a+b-c', 'D+a', 'D*a', 'a-D'],
	t1,
);
export const mixed1Hard = templated(
	['a*b+c*d', '(a+b)*(c-d)', 'a+b*c-d', '(a+b)*c-d', 'D+a*b', 'a*(b+c)-d', 'a*b-c*d'],
	t1,
);

// ---------- Level 4: hard addition ----------
export const add22: Gen = () => {
	const a = r(10, 99),
		b = r(10, 99);
	return { text: `${a} + ${b}`, answer: a + b };
};
export const add23: Gen = () => {
	const a = Math.random() < 0.5 ? r(10, 99) : r(100, 999),
		b = r(100, 999);
	return Math.random() < 0.5
		? { text: `${a} + ${b}`, answer: a + b }
		: { text: `${b} + ${a}`, answer: a + b };
};
/** add23, or the same sizes subtracted (bigger minus smaller, never negative) */
export const addSub23: Gen = () => {
	if (Math.random() < 0.5) return add23();
	const a = r(100, 999),
		b = Math.random() < 0.5 ? r(10, 99) : r(100, a);
	return { text: `${a} − ${b}`, answer: a - b };
};
export const add4: Gen = () => {
	const a = r(1000, 9999),
		b = Math.random() < 0.5 ? r(100, 999) : r(1000, 9999);
	return { text: `${a} + ${b}`, answer: a + b };
};

// ---------- Multiplication ----------
const digits = (n: number) => r(10 ** (n - 1), 10 ** n - 1);

/** Split into place-value components: 347 -> [300, 40, 7] */
const places = (n: number) =>
	String(n)
		.split('')
		.map((d, i, arr) => Number(d) * 10 ** (arr.length - 1 - i))
		.filter((x) => x > 0);

export const mul =
	(da: number, db: number, minB = 2): Gen =>
	() => {
		const a = digits(da);
		const b = db === 1 ? r(minB, 9) : digits(db);
		return { text: `${a} × ${b}`, answer: a * b };
	};

/** Multiplication with subproblem parts (for bosses). */
export const mulParts =
	(da: number, db: number, showParts: boolean): Gen =>
	() => {
		let a = digits(da),
			b = digits(db);
		// Avoid trivial round numbers
		while (a % 10 === 0) a = digits(da);
		while (b % 10 === 0) b = digits(db);
		const p: Problem = { text: `${a} × ${b}`, answer: a * b };
		if (showParts) {
			p.parts = [];
			for (const x of places(a))
				for (const y of places(b))
					p.parts.push({ text: `${x} × ${y}`, answer: x * y, revealed: false });
		}
		return p;
	};

// ---------- Level 6: hard mixed ----------
const t6 = { T: () => String(r(10, 99)), d: () => String(r(2, 9)), F: div(2, 16) };
export const mixed6Easy = templated(['T+T', 'T-T', 'T*d', 'F'], t6);
export const mixed6 = templated(['T*d+T', 'T+T*d', 'T*d-T', 'F+T', 'T-F', 'F*d', 'T+T-T'], t6);
export const mixed6Hard = templated(
	['T*d+F', 'T*d-F', 'T*d+T*d', 'T*d-T*d', 'T+F-d', '(T-T)*d', 'F*d+T'],
	t6,
);

// ---------- Level 8: powers ----------
const sq = (n: number): Problem => ({ text: `${n}²`, answer: n * n });
const cube = (n: number): Problem => ({ text: `${n}³`, answer: n ** 3 });
export const squaresEasy: Gen = () => sq(r(2, 15));
export const powers: Gen = () => (Math.random() < 0.65 ? sq(r(2, 40)) : cube(r(2, 10)));
export const powersHard: Gen = () => (Math.random() < 0.6 ? sq(r(21, 40)) : cube(r(5, 10)));

// ---------- Level 9: the citadel ----------
/** 3-digit ± 3-digit (bigger minus smaller, never negative) */
export const addSub33: Gen = () => {
	const a = r(100, 999),
		b = r(100, 999);
	if (Math.random() < 0.5) return { text: `${a} + ${b}`, answer: a + b };
	const [hi, lo] = a >= b ? [a, b] : [b, a];
	return { text: `${hi} − ${lo}`, answer: hi - lo };
};
/** (small + small)² − big, never negative */
export const squareMinus: Gen = () => {
	const a = r(2, 12),
		b = r(2, 12);
	const sq = (a + b) ** 2;
	const c = r(10, Math.min(300, sq));
	return { text: `(${a} + ${b})² − ${c}`, answer: sq - c };
};
/**
 * A 3-digit × 3-digit product already split into its nine partial products, to add up:
 * (d+e+f)(a+b+c) with d, a hundreds, e, b tens, and f, c ones (no zero digits).
 * Shown three terms per line, one line per digit of the first number.
 */
export const partialSum: Gen = () => {
	const [d, e, f] = [r(1, 9) * 100, r(1, 9) * 10, r(1, 9)];
	const [a, b, c] = [r(1, 9) * 100, r(1, 9) * 10, r(1, 9)];
	const rows = [d, e, f].map((x) => [x * a, x * b, x * c]);
	const answer = (d + e + f) * (a + b + c);
	const text = rows.map((row, i) => (i ? '+ ' : '') + row.join(' + ')).join('\n');
	return { text, answer };
};

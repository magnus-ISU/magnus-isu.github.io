import type { Ans } from './mathin';

/** `stage`: parts show a stage at a time; the next stage appears once every part of this one is solved */
export type Part = {
	text: string;
	answer: number;
	revealed: boolean;
	stage?: number;
	tex?: string;
	ans?: Ans;
};
export type Problem = {
	/** plain-text form (also the fallback when LaTeX can't be shown) */
	text: string;
	/** whole-number answer (unused when `ans` is set) */
	answer: number;
	/** typeset form, on LaTeX levels */
	tex?: string;
	/** a non-integer answer (fraction, complex, matrix, expression...) */
	ans?: Ans;
	/** one way to type the answer (tests check it's judged exactly right) */
	sol?: string;
	parts?: Part[];
};
export type Gen = () => Problem;

export const r = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

const fmt = (s: string) =>
	s
		.replace(/\*/g, '×')
		.replace(/([+\-×/])/g, ' $1 ')
		.replace(/-/g, '−');

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
/** (a + b)² − c, never negative */
const squareMinus =
	(hi: number, cMax: number): Gen =>
	() => {
		const a = r(2, hi),
			b = r(2, hi);
		const sq = (a + b) ** 2;
		const c = r(5, Math.min(cMax, sq));
		return { text: `(${a} + ${b})² − ${c}`, answer: sq - c };
	};
/** gentler exponent combos (level 9 troopers) */
const easyPowers: Gen[] = [
	squareMinus(6, 50),
	// a² + b²
	() => {
		const a = r(2, 9),
			b = r(2, 9);
		return { text: `${a}² + ${b}²`, answer: a * a + b * b };
	},
	// a² × d
	() => {
		const a = r(2, 9),
			d = r(2, 5);
		return { text: `${a}² × ${d}`, answer: a * a * d };
	},
	// (a × b)²
	() => {
		const a = r(2, 4),
			b = r(2, 4);
		return { text: `(${a} × ${b})²`, answer: (a * b) ** 2 };
	},
	// a³ + c
	() => {
		const a = r(2, 5),
			c = r(1, 20);
		return { text: `${a}³ + ${c}`, answer: a ** 3 + c };
	},
];
/** harder exponent combos (level 9 brutes); every answer is a non-negative integer */
const hardPowers: Gen[] = [
	squareMinus(12, 300),
	// a² − b²
	() => {
		const a = r(5, 20),
			b = r(2, a - 1);
		return { text: `${a}² − ${b}²`, answer: a * a - b * b };
	},
	// (a − b)² + c
	() => {
		const a = r(10, 25),
			b = r(2, a - 2),
			c = r(10, 99);
		return { text: `(${a} − ${b})² + ${c}`, answer: (a - b) ** 2 + c };
	},
	// a² × d
	() => {
		const a = r(11, 15),
			d = r(2, 9);
		return { text: `${a}² × ${d}`, answer: a * a * d };
	},
	// a³ ± T
	() => {
		const a = r(3, 9),
			t = r(10, 99);
		return a ** 3 >= t && Math.random() < 0.5
			? { text: `${a}³ − ${t}`, answer: a ** 3 - t }
			: { text: `${a}³ + ${t}`, answer: a ** 3 + t };
	},
	// T × d + a²
	() => {
		const t = r(10, 99),
			d = r(2, 9),
			a = r(2, 15);
		return { text: `${t} × ${d} + ${a}²`, answer: t * d + a * a };
	},
	// a² − T × d (only when it stays non-negative)
	() => {
		const a = r(12, 30),
			d = r(2, 9),
			t = r(10, Math.min(99, Math.floor((a * a) / d)));
		return { text: `${a}² − ${t} × ${d}`, answer: a * a - t * d };
	},
	// a² / f, always whole
	() => {
		const f = pick([2, 3, 4, 5]),
			a = f * r(2, Math.floor(20 / f));
		return { text: `${a}² / ${f}`, answer: (a * a) / f };
	},
];
/** level 9 troopers: half gentle exponent combos, half level 6 mixed problems */
export const citadelTrooper: Gen = () =>
	Math.random() < 0.5 ? pick(easyPowers)() : pick([mixed6, mixed6Hard])();
/** level 9 brutes: half 3-digit × 1-digit, half hard exponent combos */
export const citadelBrute: Gen = () => (Math.random() < 0.5 ? mul(3, 1)() : pick(hardPowers)());
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
	// sub-problems keep a running total: first two terms, then total + the next term, ...
	const terms = rows.flat();
	const parts: Part[] = [];
	let run = terms[0];
	for (const t of terms.slice(1)) {
		parts.push({ text: `${run} + ${t}`, answer: run + t, revealed: false });
		run += t;
	}
	parts.forEach((p, i) => {
		p.stage = i;
	});
	return { text, answer, parts };
};

// ---------- Junior track ----------
const part = (text: string, answer: number, stage = 0): Part => ({
	text,
	answer,
	revealed: false,
	stage,
});
/** a + b with both from 1..max */
export const addUpTo =
	(max: number): Gen =>
	() => {
		const a = r(1, max),
			b = r(1, max);
		return { text: `${a} + ${b}`, answer: a + b };
	};
/** single-digit subtraction, never negative */
export const subSingle: Gen = () => {
	const a = r(1, 9),
		b = r(0, a);
	return { text: `${a} − ${b}`, answer: a - b };
};
/** a × b with both from 1..max (ones are rare) */
export const mulUpTo =
	(max: number): Gen =>
	() => {
		const f = () => (Math.random() < 0.1 ? 1 : r(2, max));
		const a = f(),
			b = f();
		return { text: `${a} × ${b}`, answer: a * b };
	};
/** first number under 20, second under 10 */
export const addSubTeens: Gen = () => {
	const a = r(10, 19),
		b = r(1, 9);
	return Math.random() < 0.5
		? { text: `${a} + ${b}`, answer: a + b }
		: { text: `${a} − ${b}`, answer: a - b };
};
export const juniorMixed: Gen = () => pick([addUpTo(9), subSingle, mulUpTo(7)])();
/** 2 to 4 terms, all + and − (never dipping below zero) or all × */
export const juniorChain: Gen = () => {
	const n = r(2, 4);
	if (Math.random() < 0.5) {
		let total = r(1, 9);
		let text = `${total}`;
		for (let i = 1; i < n; i++) {
			const b = r(1, 9);
			if (total - b >= 0 && Math.random() < 0.5) {
				total -= b;
				text += ` − ${b}`;
			} else {
				total += b;
				text += ` + ${b}`;
			}
		}
		return { text, answer: total };
	}
	const max = n === 2 ? 9 : n === 3 ? 5 : 3;
	const fs = Array.from({ length: n }, () => r(n === 2 ? 2 : 1, max));
	return { text: fs.join(' × '), answer: fs.reduce((a, b) => a * b, 1) };
};
const onesOk = (n: number) => n % 10 !== 0;
/** 2-digit + 2-digit (sum under 100): tens first, then the ones */
export const add2Parts: Gen = () => {
	let a = 0,
		b = 0;
	do {
		a = r(11, 79);
		b = r(11, 89 - a > 11 ? 89 - a : 11);
	} while (!onesOk(a) || !onesOk(b) || a + b > 99);
	const tens = b - (b % 10);
	return {
		text: `${a} + ${b}`,
		answer: a + b,
		parts: [part(`${a} + ${tens}`, a + tens, 0), part(`${a + tens} + ${b % 10}`, a + b, 1)],
	};
};
/** 2-digit − 2-digit (never negative): tens first, then the ones */
export const sub2Parts: Gen = () => {
	let a = 0,
		b = 0;
	do {
		a = r(21, 99);
		b = r(11, a - 1);
	} while (!onesOk(a) || !onesOk(b));
	const tens = b - (b % 10);
	return {
		text: `${a} − ${b}`,
		answer: a - b,
		parts: [part(`${a} − ${tens}`, a - tens, 0), part(`${a - tens} − ${b % 10}`, a - b, 1)],
	};
};
/** a × b with 10 < a, b < 21: 10a + 10(b − 10) and (a − 10)(b − 10), then their sum */
export const teenMulParts: Gen = () => {
	const a = r(11, 20),
		b = r(11, 20);
	const big = 10 * a + 10 * (b - 10);
	const small = (a - 10) * (b - 10);
	return {
		text: `${a} × ${b}`,
		answer: a * b,
		parts: [
			part(`${10 * a} + ${10 * (b - 10)}`, big, 0),
			part(`${a - 10} × ${b - 10}`, small, 0),
			part(`${big} + ${small}`, a * b, 1),
		],
	};
};

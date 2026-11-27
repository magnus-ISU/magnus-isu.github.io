// ---------- The Academy: advanced problem generators ----------
// Every problem has a plain-text form, a LaTeX form and `sol`, one canonical way to type its
// answer (tests check that `sol` is judged exactly right). Answers are built backwards from
// nice values so they always come out as whole numbers, fractions, or tidy exact forms.
import { type Ans, type C, num } from './mathin';
import { type Gen, type Part, type Problem, pick, r } from './problems';

// ---------- helpers ----------
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const nz = (a: number, b: number) => {
	let v = 0;
	while (v === 0) v = r(a, b);
	return v;
};
const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
const choose = (n: number, k: number) => Math.round(fact(n) / (fact(k) * fact(n - k)));
const SUP: Record<string, string> = {
	'0': '⁰',
	'1': '¹',
	'2': '²',
	'3': '³',
	'4': '⁴',
	'5': '⁵',
	'6': '⁶',
	'7': '⁷',
	'8': '⁸',
	'9': '⁹',
	'-': '⁻',
};
const sup = (n: number | string) =>
	String(n)
		.split('')
		.map((c) => SUP[c] ?? c)
		.join('');
/** proper minus signs (but not in words like half-life) */
const minus = (s: string) => s.replace(/(?<![a-zA-Z])-/g, '−');

/** a problem with a whole-number answer */
const int = (tex: string, text: string, answer: number, parts?: Part[]): Problem => ({
	tex,
	text: minus(text),
	answer,
	sol: String(answer),
	...(parts ? { parts } : {}),
});
/** a problem with a special answer */
const special = (tex: string, text: string, ans: Ans, sol: string, parts?: Part[]): Problem => ({
	tex,
	text: minus(text),
	answer: Number.NaN,
	ans,
	sol,
	...(parts ? { parts } : {}),
});
const part = (tex: string, text: string, answer: number, stage = 0): Part => ({
	tex,
	text: minus(text),
	answer,
	revealed: false,
	stage,
});

/** a reduced fraction: its value, LaTeX and typed form */
function Q(n: number, d: number) {
	if (d < 0) {
		n = -n;
		d = -d;
	}
	const g = gcd(n, d) || 1;
	n /= g;
	d /= g;
	const v = n / d;
	if (d === 1) return { v, n, d, tex: `${n}`, sol: `${n}`, text: `${n}` };
	const neg = n < 0 ? '-' : '';
	return {
		v,
		n,
		d,
		tex: `${neg}\\frac{${Math.abs(n)}}{${d}}`,
		sol: `${n}/${d}`,
		text: `${n}/${d}`,
	};
}
/** answer that's a fraction */
const fracAns = (tex: string, text: string, n: number, d: number) => {
	const q = Q(n, d);
	return special(tex, text, num(q.v), q.sol);
};

/** "+ 3" / "- 3" after a previous term */
const signed = (n: number, body = '') =>
	n < 0
		? ` - ${Math.abs(n) === 1 && body ? '' : Math.abs(n)}${body}`
		: ` + ${n === 1 && body ? '' : n}${body}`;
/** polynomial from coefficients, highest power first */
function polyTex(coefs: number[], v = 'x') {
	let out = '';
	const deg = coefs.length - 1;
	coefs.forEach((c, i) => {
		const p = deg - i;
		if (c === 0) return;
		const body = p === 0 ? '' : p === 1 ? v : `${v}^{${p}}`;
		if (!out) out = `${c < 0 ? '-' : ''}${Math.abs(c) === 1 && body ? '' : Math.abs(c)}${body}`;
		else out += signed(c, body);
	});
	return out || '0';
}
const NAMES: Record<string, string> = {
	sum: 'Σ',
	int: '∫',
	nabla: '∇',
	infty: '∞',
	equiv: '≡',
	le: '≤',
	to: '→',
	langle: '⟨',
	rangle: '⟩',
	lVert: '‖',
	rVert: '‖',
};
const texToText = (tex: string) =>
	tex
		.replace(/\\[,!;: ]/g, ' ')
		.replace(/\\(?:text|mathrm|operatorname|mathbf)\{([^{}]*)\}/g, '$1')
		.replace(/\\binom\{([^{}]*)\}\{([^{}]*)\}/g, 'C($1, $2)')
		.replace(/\\(sin|cos|tan|ln|log|lim|gcd|det|pmod|bmod)(?![a-zA-Z])/g, ' $1')
		.replace(
			/\\(sum|int|nabla|infty|equiv|le|to|langle|rangle|lVert|rVert)(?![a-zA-Z])/g,
			(_, n) => NAMES[n],
		)
		.replace(/\\pi/g, 'π')
		.replace(/\\left\./g, '')
		.replace(/\\sqrt\{(\w+)\}/g, '√$1')
		.replace(/\\sqrt\{([^{}]*)\}/g, '√($1)')
		.replace(/\^\{(-?\d+)\}/g, (_, n) => sup(n))
		.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
		.replace(/\\left|\\right/g, '')
		.replace(/\\cdot/g, '·')
		.replace(/\\times/g, '×')
		.replace(/\\[a-zA-Z]+/g, '')
		.replace(/[{}]/g, '')
		.replace(/\(([\w.√π]+)\)\/\(([\w.√π]+)\)/g, '$1/$2')
		.replace(/\s+/g, ' ')
		.trim();
/** polynomial as typed (for sol strings) */
const polySol = (coefs: number[]) => polyTex(coefs).replace(/\^\{(\d+)\}/g, '^$1');
/** coefficients of p * q (highest power first) */
function polyMul(p: number[], q: number[]) {
	const out = new Array(p.length + q.length - 1).fill(0);
	p.forEach((a, i) => {
		q.forEach((b, j) => {
			out[i + j] += a * b;
		});
	});
	return out;
}
const polyAt = (coefs: number[], x: number) => coefs.reduce((acc, c) => acc * x + c, 0);
const polyDeriv = (coefs: number[]) => {
	const deg = coefs.length - 1;
	return coefs.slice(0, -1).map((c, i) => c * (deg - i));
};

/** a coefficient in front of a variable: 1x is x, −1x is −x */
const cf = (k: number) => (k === 1 ? '' : k === -1 ? '-' : `${k}`);
const cx = (re: number, im: number) => {
	const imPart = im === 0 ? '' : `${im === 1 ? '' : im === -1 ? '-' : im}i`;
	if (re === 0) return imPart || '0';
	if (!imPart) return `${re}`;
	return `${re}${im > 0 ? '+' : ''}${imPart}`;
};
const cxAns = (re: number, im: number): Ans => num(re, im);

const mtex = (rows: (number | string)[][], env = 'pmatrix') =>
	`\\begin{${env}}${rows.map((row) => row.join(' & ')).join(' \\\\ ')}\\end{${env}}`;
const mtext = (rows: number[][]) => `[${rows.map((row) => row.join(', ')).join('; ')}]`;
const msol = (rows: (number | string)[][]) =>
	`[${rows.map((row) => `[${row.join(', ')}]`).join(', ')}]`;
const matAns = (rows: number[][]): Ans => ({
	kind: 'mat',
	rows: rows.map((row) => row.map((v) => ({ re: v, im: 0 }) as C)),
});
const vtex = (v: number[]) => `\\left(${v.join(', ')}\\right)`;
const vsol = (v: (number | string)[]) => `(${v.join(', ')})`;
const vecAns = (v: number[]): Ans => matAns([v]);
const setAns = (vs: C[]): Ans => ({ kind: 'set', vs });
const re = (v: number): C => ({ re: v, im: 0 });

// =================== Number theory (Prime Vault) ===================
export const gcdLcm: Gen = () => {
	const g = r(2, 12);
	let a = 0;
	let b = 0;
	do {
		a = r(2, 9);
		b = r(2, 9);
	} while (a === b || gcd(a, b) !== 1);
	return int(`\\gcd(${g * a}, ${g * b})`, `gcd(${g * a}, ${g * b})`, g);
};
export const lcm: Gen = () => {
	const a = r(2, 15);
	let b = r(2, 15);
	while (b === a) b = r(2, 15);
	const l = (a * b) / gcd(a, b);
	return int(`\\operatorname{lcm}(${a}, ${b})`, `lcm(${a}, ${b})`, l);
};
export const divisors: Gen = () => {
	if (Math.random() < 0.4) {
		const g = r(11, 40);
		let a = 0;
		let b = 0;
		do {
			a = r(3, 20);
			b = r(3, 20);
		} while (a === b || gcd(a, b) !== 1 || g * Math.max(a, b) > 999 || g * Math.min(a, b) < 100);
		return int(`\\gcd(${g * a}, ${g * b})`, `gcd(${g * a}, ${g * b})`, g);
	}
	let n = 0;
	let i = 0;
	let j = 0;
	let k = 0;
	do {
		i = r(0, 5);
		j = r(0, 3);
		k = r(0, 2);
		n = 2 ** i * 3 ** j * 5 ** k;
	} while (n < 12 || n > 400);
	return int(
		`\\text{number of divisors of } ${n}`,
		`number of divisors of ${n}`,
		(i + 1) * (j + 1) * (k + 1),
	);
};
const modpow = (a: number, k: number, m: number) => {
	let out = 1;
	for (let t = 0; t < k; t++) out = (out * a) % m;
	return out;
};
export const modBasic: Gen = () => {
	const a = r(20, 99);
	const m = r(3, 12);
	return int(`${a} \\bmod ${m}`, `${a} mod ${m}`, a % m);
};
export const modOps: Gen = () => {
	const a = r(11, 99);
	const b = r(11, 99);
	const m = r(3, 11);
	return Math.random() < 0.5
		? int(`(${a} \\times ${b}) \\bmod ${m}`, `(${a} × ${b}) mod ${m}`, (a * b) % m)
		: int(`(${a} + ${b}) \\bmod ${m}`, `(${a} + ${b}) mod ${m}`, (a + b) % m);
};
export const modPow: Gen = () => {
	const a = r(2, 9);
	const k = r(5, 20);
	const m = pick([5, 7, 11, 13]);
	return int(`${a}^{${k}} \\bmod ${m}`, `${a}${sup(k)} mod ${m}`, modpow(a, k, m));
};
const inverse = (a: number, m: number) => {
	for (let x = 1; x < m; x++) if ((a * x) % m === 1) return x;
	return 0;
};
export const modInverse: Gen = () => {
	const p = pick([5, 7, 11, 13]);
	const a = r(2, p - 1);
	return int(`${a}^{-1} \\pmod{${p}}`, `${a}⁻¹ (mod ${p})`, inverse(a, p));
};
export const linearCongruence: Gen = () => {
	const p = pick([7, 11, 13, 17]);
	const a = r(2, p - 1);
	const b = r(1, p - 1);
	return int(
		`${a}x \\equiv ${b} \\pmod{${p}},\\ 0 \\le x < ${p}`,
		`${a}x ≡ ${b} (mod ${p}), 0 ≤ x < ${p}`,
		(b * inverse(a, p)) % p,
	);
};
export const modInverseHard: Gen = () => {
	const m = pick([17, 19, 23, 26, 29, 31]);
	let a = 0;
	do a = r(3, m - 1);
	while (gcd(a, m) !== 1);
	return int(`${a}^{-1} \\pmod{${m}}`, `${a}⁻¹ (mod ${m})`, inverse(a, m));
};
/** smallest x ≥ 0 meeting every congruence */
const crtSolve = (cs: [number, number][]) => {
	const M = cs.reduce((acc, [, m]) => acc * m, 1);
	for (let x = 0; x < M; x++) if (cs.every(([a, m]) => x % m === a)) return x;
	return 0;
};
const casesTex = (cs: [number, number][]) =>
	`\\begin{cases} ${cs.map(([a, m]) => `x \\equiv ${a} \\pmod{${m}}`).join(' \\\\ ')} \\end{cases}`;
const casesText = (cs: [number, number][]) => cs.map(([a, m]) => `x ≡ ${a} (mod ${m})`).join(', ');
const crt =
	(pairs: [number, number][]): Gen =>
	() => {
		const [m1, m2] = pick(pairs);
		const cs: [number, number][] = [
			[r(0, m1 - 1), m1],
			[r(0, m2 - 1), m2],
		];
		return int(
			`${casesTex(cs)}\\ \\text{smallest } x \\ge 0`,
			`${casesText(cs)}; smallest x ≥ 0`,
			crtSolve(cs),
		);
	};
export const crtEasy = crt([
	[3, 5],
	[2, 7],
	[4, 5],
	[3, 7],
	[5, 6],
]);
export const crtMid = crt([
	[7, 9],
	[8, 9],
	[5, 11],
	[7, 8],
]);
/** three congruences; the boss version shows the first two combined, then all three */
export const crt3 =
	(withParts: boolean): Gen =>
	() => {
		const ms = pick([
			[3, 5, 7],
			[2, 5, 9],
			[3, 4, 5],
			[4, 5, 7],
		]);
		const cs = ms.map((m) => [r(0, m - 1), m] as [number, number]);
		const answer = crtSolve(cs);
		const p = int(
			`${casesTex(cs)}\\ \\text{smallest } x \\ge 0`,
			`${casesText(cs)}; smallest x ≥ 0`,
			answer,
		);
		if (withParts) {
			const two = crtSolve(cs.slice(0, 2));
			p.parts = [
				part(
					`x \\bmod ${ms[0] * ms[1]}\\ \\text{(first two)}`,
					`x mod ${ms[0] * ms[1]} (first two)`,
					two,
					0,
				),
				part(
					`x \\equiv ${two} \\pmod{${ms[0] * ms[1]}},\\ x \\equiv ${cs[2][0]} \\pmod{${ms[2]}}`,
					`x ≡ ${two} (mod ${ms[0] * ms[1]}), x ≡ ${cs[2][0]} (mod ${ms[2]})`,
					answer,
					1,
				),
			];
		}
		return p;
	};

// =================== Combinatorics & probability (Casino Strip) ===================
export const factorial: Gen = () => {
	const n = r(3, 7);
	return int(`${n}!`, `${n}!`, fact(n));
};
const WORDS = [
	'BOOK',
	'MOON',
	'LEVEL',
	'APPLE',
	'BANANA',
	'TOOTH',
	'PEPPER',
	'STATS',
	'ROBOT',
	'MATH',
	'GEAR',
];
const arrangements = (w: string) => {
	const counts = [...w].reduce<Record<string, number>>((acc, ch) => {
		acc[ch] = (acc[ch] ?? 0) + 1;
		return acc;
	}, {});
	return Object.values(counts).reduce((acc, c) => acc / fact(c), fact(w.length));
};
export const permutations: Gen = () => {
	if (Math.random() < 0.5) {
		const w = pick(WORDS);
		return int(`\\text{arrangements of } \\mathrm{${w}}`, `arrangements of ${w}`, arrangements(w));
	}
	const n = r(5, 10);
	const k = r(2, 3);
	return int(`P(${n}, ${k})`, `P(${n}, ${k})`, fact(n) / fact(n - k));
};
export const codes: Gen = () => {
	const n = r(4, 10);
	const k = r(2, 4);
	return Math.random() < 0.5
		? int(
				`${k}\\text{-symbol codes from ${n} symbols, no repeats}`,
				`${k}-symbol codes from ${n} symbols, no repeats`,
				fact(n) / fact(n - k),
			)
		: int(
				`${k}\\text{-symbol codes from ${n} symbols}`,
				`${k}-symbol codes from ${n} symbols`,
				n ** k,
			);
};
export const binomEasy: Gen = () => {
	const n = r(4, 10);
	const k = r(1, 3);
	return int(`\\binom{${n}}{${k}}`, `C(${n}, ${k})`, choose(n, k));
};
export const binomMid: Gen = () => {
	if (Math.random() < 0.4) {
		const n = r(5, 16);
		return int(
			`\\text{handshakes among ${n} people}`,
			`handshakes among ${n} people`,
			choose(n, 2),
		);
	}
	const n = r(6, 12);
	const k = r(2, 5);
	return int(`\\binom{${n}}{${k}}`, `C(${n}, ${k})`, choose(n, k));
};
export const committees: Gen = () => {
	const n = r(4, 8);
	const m = r(4, 8);
	const a = r(1, 3);
	const b = r(1, 3);
	return int(
		`\\binom{${n}}{${a}}\\binom{${m}}{${b}}`,
		`C(${n}, ${a}) · C(${m}, ${b})`,
		choose(n, a) * choose(m, b),
	);
};
/** big binomial; the boss shows the falling product and k! first */
export const binomBoss: Gen = () => {
	const n = r(12, 20);
	const k = r(3, 4);
	const top = Array.from({ length: k }, (_, i) => n - i);
	const prod = top.reduce((a, b) => a * b, 1);
	return int(`\\binom{${n}}{${k}}`, `C(${n}, ${k})`, choose(n, k), [
		part(top.join(' \\cdot '), top.join(' · '), prod, 0),
		part(`${k}!`, `${k}!`, fact(k), 0),
		part(`\\frac{${prod}}{${fact(k)}}`, `${prod} / ${fact(k)}`, choose(n, k), 1),
	]);
};
export const probEasy: Gen = () => {
	const kind = r(0, 2);
	if (kind === 0) {
		const k = r(2, 6);
		return fracAns(`P(\\text{a die shows at least } ${k})`, `P(die shows at least ${k})`, 7 - k, 6);
	}
	if (kind === 1) {
		const n = r(2, 4);
		return fracAns(`P(\\text{${n} coins all heads})`, `P(${n} coins all heads)`, 1, 2 ** n);
	}
	const k = r(1, 5);
	return fracAns(
		`P(\\text{a die shows a multiple of } ${k})`,
		`P(die shows a multiple of ${k})`,
		Math.floor(6 / k),
		6,
	);
};
export const probDice: Gen = () => {
	if (Math.random() < 0.25)
		return fracAns(
			`P(\\text{at least one 6 in two rolls})`,
			`P(at least one 6 in two rolls)`,
			11,
			36,
		);
	const s = r(2, 12);
	const ways = 6 - Math.abs(7 - s);
	return fracAns(`P(\\text{two dice sum to } ${s})`, `P(two dice sum to ${s})`, ways, 36);
};
export const probDraws: Gen = () => {
	if (Math.random() < 0.5) {
		const n = r(3, 5);
		const k = r(1, n - 1);
		return fracAns(
			`P(\\text{exactly ${k} heads in ${n} flips})`,
			`P(exactly ${k} heads in ${n} flips)`,
			choose(n, k),
			2 ** n,
		);
	}
	const red = r(2, 6);
	const blue = r(2, 6);
	return fracAns(
		`P(\\text{2 red, drawing 2 from ${red} red and ${blue} blue})`,
		`P(2 red, drawing 2 from ${red} red, ${blue} blue)`,
		choose(red, 2),
		choose(red + blue, 2),
	);
};
export const expectEasy: Gen = () => {
	const n = pick([4, 6, 8, 10, 12, 20]);
	return fracAns(`E[\\text{a fair ${n}-sided die}]`, `E[fair ${n}-sided die]`, n + 1, 2);
};
export const expectGame: Gen = () => {
	const k = r(2, 6);
	const a = r(2, 12) * 5;
	const b = r(1, 5);
	return fracAns(
		`\\text{win } \\$${a} \\text{ with probability } \\tfrac{1}{${k}}, \\text{ else lose } \\$${b}:\\ E`,
		`win $${a} with probability 1/${k}, else lose $${b}: E`,
		a - b * (k - 1),
		k,
	);
};
export const expectTable: Gen = () => {
	if (Math.random() < 0.4) {
		const n = r(3, 9);
		return fracAns(`E[\\text{heads in ${n} flips}]`, `E[heads in ${n} flips]`, n, 2);
	}
	// X = 1, 2, 3 with probabilities that add to 1
	const d = pick([4, 6, 8, 10, 12]);
	const p1 = r(1, d - 2);
	const p2 = r(1, d - p1 - 1);
	const p3 = d - p1 - p2;
	const ps = [p1, p2, p3].map((p) => Q(p, d));
	return fracAns(
		`X = 1, 2, 3 \\text{ with } P = ${ps.map((p) => p.tex).join(', ')}:\\ E[X]`,
		`X = 1, 2, 3 with P = ${ps.map((p) => p.text).join(', ')}: E[X]`,
		p1 + 2 * p2 + 3 * p3,
		d,
	);
};

// =================== Algebra (The Academy) ===================
export const logEasy: Gen = () => {
	if (Math.random() < 0.25) {
		const k = r(2, 9);
		return int(`\\ln e^{${k}}`, `ln e${sup(k)}`, k);
	}
	const b = pick([2, 3, 5, 10]);
	const k = r(1, b === 2 ? 8 : b === 10 ? 4 : 4);
	return int(`\\log_{${b}} ${b ** k}`, `log${b} ${b ** k}`, k);
};
export const logRules: Gen = () => {
	const kind = r(0, 2);
	if (kind === 0) {
		const b = pick([2, 3, 5]);
		const k = r(1, 3);
		return int(`\\log_{${b}} \\frac{1}{${b ** k}}`, `log${b} (1/${b ** k})`, -k);
	}
	const b = pick([2, 3, 6, 10]);
	const k = r(2, 3);
	const total = b ** k;
	const divs = [];
	for (let x = 2; x < total; x++) if (total % x === 0) divs.push(x);
	const x = pick(divs);
	if (kind === 1)
		return int(
			`\\log_{${b}} ${x} + \\log_{${b}} ${total / x}`,
			`log${b} ${x} + log${b} ${total / x}`,
			k,
		);
	const y = r(2, 5);
	return int(
		`\\log_{${b}} ${total * y} - \\log_{${b}} ${y}`,
		`log${b} ${total * y} − log${b} ${y}`,
		k,
	);
};
export const logSolve: Gen = () => {
	const b = pick([2, 3, 5]);
	const k = r(2, b === 2 ? 9 : 4);
	return Math.random() < 0.5
		? int(`${b}^{x} = ${b ** k},\\ x`, `${b}^x = ${b ** k}, x`, k)
		: int(`\\log_{${b}} x = ${k},\\ x`, `log${b} x = ${k}, x`, b ** k);
};
/** (x − p)(x − q) with distinct whole roots */
const twoRoots = () => {
	const p = nz(-9, 9);
	let q = nz(-9, 9);
	while (q === p) q = nz(-9, 9);
	return [p, q];
};
export const quadRoots: Gen = () => {
	const [p, q] = twoRoots();
	const coefs = [1, -(p + q), p * q];
	return special(
		`\\text{roots of } ${polyTex(coefs)}`,
		`roots of ${texToText(polyTex(coefs))}`,
		setAns([re(p), re(q)]),
		`${p}, ${q}`,
	);
};
const factorTerm = (p: number) => `(x${p < 0 ? `+${-p}` : `-${p}`})`;
export const factorMonic: Gen = () => {
	if (Math.random() < 0.3) {
		const k = r(2, 12);
		return special(
			`\\text{factor } x^{2} - ${k * k}`,
			`factor x² − ${k * k}`,
			{ kind: 'expr', form: 'factored', f: (x) => x * x - k * k },
			`(x-${k})(x+${k})`,
		);
	}
	const [p, q] = twoRoots();
	const coefs = [1, -(p + q), p * q];
	return special(
		`\\text{factor } ${polyTex(coefs)}`,
		`factor ${texToText(polyTex(coefs))}`,
		{ kind: 'expr', form: 'factored', f: (x) => polyAt(coefs, x) },
		`${factorTerm(p)}${factorTerm(q)}`,
	);
};
export const factorHard: Gen = () => {
	if (Math.random() < 0.35) {
		// Vieta: sum or product of the roots of ax² + bx + c
		const a = r(2, 5);
		const b = nz(-12, 12);
		const c = nz(-12, 12);
		const coefs = [a, b, c];
		return Math.random() < 0.5
			? fracAns(
					`\\text{sum of the roots of } ${polyTex(coefs)}`,
					`sum of roots of ${texToText(polyTex(coefs))}`,
					-b,
					a,
				)
			: fracAns(
					`\\text{product of the roots of } ${polyTex(coefs)}`,
					`product of roots of ${texToText(polyTex(coefs))}`,
					c,
					a,
				);
	}
	// (ax + b)(x + c)
	const a = r(2, 3);
	const b = nz(-7, 7);
	const c = nz(-7, 7);
	if (gcd(a, b) !== 1) return factorHard();
	const coefs = polyMul([a, b], [1, c]);
	return special(
		`\\text{factor } ${polyTex(coefs)}`,
		`factor ${texToText(polyTex(coefs))}`,
		{ kind: 'expr', form: 'factored', f: (x) => polyAt(coefs, x) },
		`(${polyTex([a, b])})(${polyTex([1, c])})`,
	);
};
/** solve ax² + bx + c = 0 (rational roots); the boss shows the discriminant and its root first */
export const quadBoss: Gen = () => {
	const a1 = r(2, 3);
	const b1 = nz(-7, 7);
	const b2 = nz(-7, 7);
	if (gcd(a1, b1) !== 1 || a1 * b2 === b1) return quadBoss();
	const coefs = polyMul([a1, b1], [1, b2]);
	const [a, b, c] = coefs;
	const disc = b * b - 4 * a * c;
	const r1 = Q(-b1, a1);
	return special(
		`\\text{solve } ${polyTex(coefs)} = 0`,
		`solve ${texToText(polyTex(coefs))} = 0`,
		setAns([re(r1.v), re(-b2)]),
		`${r1.sol}, ${-b2}`,
		[
			part(`b^{2} - 4ac`, 'b² − 4ac', disc, 0),
			part(`\\sqrt{${disc}}`, `√${disc}`, Math.round(Math.sqrt(disc)), 1),
		],
	);
};
const cpar = (re0: number, im0: number) => `(${cx(re0, im0)})`;
export const complexAdd: Gen = () => {
	const [a, b, c, d] = [nz(-9, 9), nz(-9, 9), nz(-9, 9), nz(-9, 9)];
	const add = Math.random() < 0.5;
	const [x, y] = add ? [a + c, b + d] : [a - c, b - d];
	const t = `${cpar(a, b)} ${add ? '+' : '-'} ${cpar(c, d)}`;
	return special(t, t, cxAns(x, y), cx(x, y));
};
export const complexMul: Gen = () => {
	const kind = r(0, 2);
	if (kind === 0) {
		const n = r(5, 40);
		const powers: [number, number][] = [
			[1, 0],
			[0, 1],
			[-1, 0],
			[0, -1],
		];
		const [x, y] = powers[n % 4];
		return special(`i^{${n}}`, `i${sup(n)}`, cxAns(x, y), cx(x, y));
	}
	const [a, b] = [nz(-6, 6), nz(-6, 6)];
	if (kind === 1)
		return special(
			`${cpar(a, b)}${cpar(a, -b)}`,
			`${cpar(a, b)}${cpar(a, -b)}`,
			cxAns(a * a + b * b, 0),
			`${a * a + b * b}`,
		);
	const [c, d] = [nz(-6, 6), nz(-6, 6)];
	const [x, y] = [a * c - b * d, a * d + b * c];
	return special(`${cpar(a, b)}${cpar(c, d)}`, `${cpar(a, b)}${cpar(c, d)}`, cxAns(x, y), cx(x, y));
};
const TRIPLES: [number, number, number][] = [
	[3, 4, 5],
	[5, 12, 13],
	[6, 8, 10],
	[8, 15, 17],
	[7, 24, 25],
	[9, 12, 15],
];
export const complexHard: Gen = () => {
	const kind = r(0, 2);
	if (kind === 0) {
		const [a, b, h] = pick(TRIPLES);
		const [sa, sb] = [pick([1, -1]), pick([1, -1])];
		return int(`\\left|${cx(sa * a, sb * b)}\\right|`, `|${cx(sa * a, sb * b)}|`, h);
	}
	if (kind === 1) {
		// (c + di)(e + fi) / (c + di) = e + fi
		const [c, d, e, f] = [nz(-5, 5), nz(-5, 5), nz(-5, 5), nz(-5, 5)];
		const [x, y] = [c * e - d * f, c * f + d * e];
		return special(
			`\\frac{${cx(x, y)}}{${cx(c, d)}}`,
			`(${cx(x, y)}) / (${cx(c, d)})`,
			cxAns(e, f),
			cx(e, f),
		);
	}
	const n = r(2, 8);
	let z: [number, number] = [1, 0];
	for (let k = 0; k < n; k++) z = [z[0] - z[1], z[0] + z[1]];
	return special(`(1+i)^{${n}}`, `(1+i)${sup(n)}`, cxAns(z[0], z[1]), cx(z[0], z[1]));
};
/** exact trig values at multiples of π/12 we use: k·π/6 and k·π/4 in [0, 2π) */
type Angle = { k: number; d: number };
const angleTex = ({ k, d }: Angle) => {
	const q = Q(k, d);
	if (q.n === 0) return '0';
	return q.d === 1 ? `${q.n === 1 ? '' : q.n}\\pi` : `\\frac{${q.n === 1 ? '' : q.n}\\pi}{${q.d}}`;
};
const angleSol = ({ k, d }: Angle) => {
	const q = Q(k, d);
	if (q.n === 0) return '0';
	return q.d === 1 ? `${q.n === 1 ? '' : q.n}pi` : `${q.n === 1 ? '' : q.n}pi/${q.d}`;
};
/** exact values as typed and as LaTeX: sin/cos are ±{0, 1/2, √2/2, √3/2, 1}; tan adds √3/3, √3 */
const exact = (v: number) => {
	const table: [number, string][] = [
		[0, '0'],
		[0.5, '1/2'],
		[Math.SQRT2 / 2, 'sqrt(2)/2'],
		[Math.sqrt(3) / 2, 'sqrt(3)/2'],
		[1, '1'],
		[Math.sqrt(3) / 3, 'sqrt(3)/3'],
		[Math.sqrt(3), 'sqrt(3)'],
	];
	const hit = table.find(([x]) => Math.abs(Math.abs(v) - x) < 1e-9);
	if (!hit) return null;
	return v < -1e-9 ? `-${hit[1]}` : hit[1];
};
const solTex = (s: string) =>
	s
		.replace(/sqrt\((\d)\)\/(\d)/, '\\frac{\\sqrt{$1}}{$2}')
		.replace(/sqrt\((\d)\)/, '\\sqrt{$1}')
		.replace(/(\d)\/(\d)/, '\\frac{$1}{$2}');
const TRIG = {
	sin: Math.sin,
	cos: Math.cos,
	tan: Math.tan,
};
const angles = (all: boolean): Angle[] => {
	const out: Angle[] = [];
	for (let k = 0; k < 12; k++) out.push({ k, d: 6 });
	for (let k = 1; k < 8; k += 2) out.push({ k, d: 4 });
	return all ? out : out.filter((a) => a.k / a.d <= 0.5);
};
const trigValue =
	(all: boolean, fns: (keyof typeof TRIG)[]): Gen =>
	() => {
		for (;;) {
			const a = pick(angles(all));
			const fn = pick(fns);
			const v = TRIG[fn]((Math.PI * a.k) / a.d);
			if (Math.abs(v) > 1e6) continue;
			const s = exact(v);
			if (s === null) continue;
			const t = `\\${fn}\\left(${angleTex(a)}\\right)`;
			return special(t, texToText(t), num(v), s);
		}
	};
export const trigEasy = trigValue(false, ['sin', 'cos']);
export const trigMid = trigValue(true, ['sin', 'cos', 'tan']);
export const trigSolve: Gen = () => {
	for (;;) {
		const a = pick(angles(true));
		const fn = pick(['sin', 'cos', 'tan'] as const);
		const f = TRIG[fn];
		const v = f((Math.PI * a.k) / a.d);
		const s = exact(v);
		if (s === null || Math.abs(v) > 1e6) continue;
		// every special angle in (0, 2π] with that value, smallest first
		const sols = [...angles(true), { k: 2, d: 1 }]
			.filter((b) => b.k > 0 && Math.abs(f((Math.PI * b.k) / b.d) - v) < 1e-9)
			.sort((x, y) => x.k / x.d - y.k / y.d);
		if (!sols.length) continue;
		const eq = `\\${fn} x = ${solTex(s)}`;
		if (Math.random() < 0.3) {
			const inRange =
				sols.filter((b) => b.k / b.d < 2).length + (Math.abs(f(0) - v) < 1e-9 ? 1 : 0);
			const t = `${eq},\\ \\text{solutions in } [0, 2\\pi)`;
			return int(t, texToText(t), inRange);
		}
		const best = sols[0];
		const t = `${eq},\\ \\text{smallest } x > 0`;
		return special(t, texToText(t), num((Math.PI * best.k) / best.d), angleSol(best));
	}
};

// =================== Linear algebra (Grid Works) ===================
const vec = (n: number, lo = -5, hi = 6) => Array.from({ length: n }, () => r(lo, hi));
const mat = (rows: number, cols: number, lo = -3, hi = 5) =>
	Array.from({ length: rows }, () => vec(cols, lo, hi));
const matMul = (a: number[][], b: number[][]) =>
	a.map((row) => b[0].map((_, j) => row.reduce((acc, v, k) => acc + v * b[k][j], 0)));
export const dotOrSum: Gen = () => {
	if (Math.random() < 0.5) {
		const [u, v] = [vec(3), vec(3)];
		const t = `${vtex(u)} \\cdot ${vtex(v)}`;
		return int(
			t,
			`${vsol(u)} · ${vsol(v)}`,
			u.reduce((acc, x, i) => acc + x * v[i], 0),
		);
	}
	const [u, v] = [vec(2), vec(2)];
	const w = u.map((x, i) => x + v[i]);
	return special(`${vtex(u)} + ${vtex(v)}`, `${vsol(u)} + ${vsol(v)}`, vecAns(w), vsol(w));
};
export const vecCombo: Gen = () => {
	if (Math.random() < 0.35) {
		const [a, b, c] = pick([
			[3, 4, 0],
			[2, 3, 6],
			[1, 2, 2],
			[4, 4, 7],
			[2, 6, 9],
		]);
		const v = [a, b, c].map((x) => x * pick([1, -1]));
		return int(`\\left\\lVert ${vtex(v)} \\right\\rVert`, `|${vsol(v)}|`, Math.hypot(a, b, c));
	}
	const [u, v] = [vec(3, -4, 5), vec(3, -4, 5)];
	const k = r(2, 3);
	const w = u.map((x, i) => k * x - v[i]);
	return special(`${k}${vtex(u)} - ${vtex(v)}`, `${k}${vsol(u)} − ${vsol(v)}`, vecAns(w), vsol(w));
};
export const matVecCross: Gen = () => {
	if (Math.random() < 0.5) {
		const A = mat(2, 2);
		const v = vec(2, -4, 5);
		const w = A.map((row) => row[0] * v[0] + row[1] * v[1]);
		return special(
			`${mtex(A)}${mtex(v.map((x) => [x]))}`,
			`${mtext(A)} ${vsol(v)}`,
			vecAns(w),
			vsol(w),
		);
	}
	const [u, v] = [vec(3, -3, 4), vec(3, -3, 4)];
	const w = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
	return special(`${vtex(u)} \\times ${vtex(v)}`, `${vsol(u)} × ${vsol(v)}`, vecAns(w), vsol(w));
};
const productGen =
	(lo: number, hi: number): Gen =>
	() => {
		const [A, B] = [mat(2, 2, lo, hi), mat(2, 2, lo, hi)];
		const C = matMul(A, B);
		return special(`${mtex(A)}${mtex(B)}`, `${mtext(A)} ${mtext(B)}`, matAns(C), msol(C));
	};
export const matMulEasy = productGen(0, 3);
export const matMulMid = productGen(-3, 5);
export const matMulHard: Gen = () => {
	if (Math.random() < 0.5) {
		const A = mat(2, 2, -3, 4);
		const C = matMul(A, A);
		return special(`${mtex(A)}^{2}`, `${mtext(A)}²`, matAns(C), msol(C));
	}
	const [A, B] = [mat(2, 3, -2, 3), mat(3, 2, -2, 3)];
	const C = matMul(A, B);
	return special(`${mtex(A)}${mtex(B)}`, `${mtext(A)} ${mtext(B)}`, matAns(C), msol(C));
};
/** 3×3 product; the boss shows each entry's dot product, a row at a time */
export const matMulBoss: Gen = () => {
	const [A, B] = [mat(3, 3, -1, 3), mat(3, 3, -1, 3)];
	const C = matMul(A, B);
	const parts: Part[] = [];
	for (let i = 0; i < 3; i++)
		for (let j = 0; j < 3; j++) {
			const terms = A[i]
				.map((v, k) => `${v}\\cdot${B[k][j] < 0 ? `(${B[k][j]})` : B[k][j]}`)
				.join(' + ');
			parts.push(part(terms, texToText(terms), C[i][j], i));
		}
	return special(`${mtex(A)}${mtex(B)}`, `${mtext(A)} ${mtext(B)}`, matAns(C), msol(C), parts);
};
const det = (m: number[][]): number =>
	m.length === 1
		? m[0][0]
		: m[0].reduce(
				(acc, v, j) =>
					acc + (j % 2 ? -1 : 1) * v * det(m.slice(1).map((row) => row.filter((_, k) => k !== j))),
				0,
			);
const detTex = (m: number[][]) => mtex(m, 'vmatrix');
export const det2: Gen = () => {
	const m = mat(2, 2, -5, 9);
	return int(detTex(m), `det ${mtext(m)}`, det(m));
};
/** 3×3 with a few zeros so it's doable in your head */
const sparse3 = () => {
	const m = mat(3, 3, -2, 4);
	for (let z = 0; z < 2; z++) m[r(0, 2)][r(0, 2)] = 0;
	return m;
};
export const det3: Gen = () => {
	const m = sparse3();
	return int(detTex(m), `det ${mtext(m)}`, det(m));
};
export const det3Hard: Gen = () => {
	if (Math.random() < 0.4) {
		// triangular: the product of the diagonal
		const n = pick([3, 4]);
		const m = mat(n, n, -3, 5);
		for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) m[i][j] = 0;
		return int(detTex(m), `det ${mtext(m)}`, det(m));
	}
	const m = mat(3, 3, -3, 5);
	m[r(0, 2)][r(0, 2)] = 0;
	return int(detTex(m), `det ${mtext(m)}`, det(m));
};
/** 4×4 with two nonzero entries on top: expand along the first row (two 3×3 minors, then combine) */
export const det4Boss: Gen = () => {
	const m = [mat(1, 4, 0, 0)[0], ...Array.from({ length: 3 }, () => vec(4, -2, 3))];
	for (let z = 0; z < 3; z++) m[1 + r(0, 2)][r(0, 3)] = 0;
	const cols = [0, 1, 2, 3]
		.sort(() => Math.random() - 0.5)
		.slice(0, 2)
		.sort();
	for (const j of cols) m[0][j] = nz(-3, 4);
	const minors = cols.map((j) => m.slice(1).map((row) => row.filter((_, k) => k !== j)));
	const ds = minors.map(det);
	const combo = cols
		.map((j, i) => {
			const coef = (j % 2 ? -1 : 1) * m[0][j];
			return `${i === 0 ? (coef < 0 ? '-' : '') : coef < 0 ? ' - ' : ' + '}${Math.abs(coef)}\\cdot${ds[i] < 0 ? `(${ds[i]})` : ds[i]}`;
		})
		.join('');
	return int(detTex(m), `det ${mtext(m)}`, det(m), [
		...minors.map((mi) => part(detTex(mi), `det ${mtext(mi)}`, det(mi), 0)),
		part(combo, texToText(combo), det(m), 1),
	]);
};
export const system2: Gen = () => {
	const [x, y] = [r(-6, 8), r(-6, 8)];
	let A = mat(2, 2, -4, 5);
	while (det(A) === 0) A = mat(2, 2, -4, 5);
	const b = A.map((row) => row[0] * x + row[1] * y);
	const lines = A.map(
		([p, q], i) =>
			`${fieldTex(
				[
					{ c: p, e: [1, 0, 0] },
					{ c: q, e: [0, 1, 0] },
				].filter((m) => m.c !== 0) as Mono[],
			)} = ${b[i]}`,
	);
	return special(
		`\\begin{cases} ${lines.join(' \\\\ ')} \\end{cases}\\ (x, y)`,
		`${lines.join(', ')}; (x, y)`,
		vecAns([x, y]),
		vsol([x, y]),
	);
};
/** A = P D P⁻¹ with det P = ±1, so A has whole entries and whole eigenvalues */
export const eigen: Gen = () => {
	const l1 = r(-4, 6);
	let l2 = r(-4, 6);
	while (l2 === l1) l2 = r(-4, 6);
	const P = pick([
		[
			[1, r(-2, 2)],
			[0, 1],
		],
		[
			[1, 0],
			[r(-2, 2), 1],
		],
		[
			[2, 1],
			[1, 1],
		],
		[
			[1, 1],
			[1, 2],
		],
	]);
	const d = det(P);
	const Pinv = [
		[P[1][1] / d, -P[0][1] / d],
		[-P[1][0] / d, P[0][0] / d],
	];
	const A = matMul(
		matMul(P, [
			[l1, 0],
			[0, l2],
		]),
		Pinv,
	);
	return special(
		`\\text{eigenvalues of } ${mtex(A)}`,
		`eigenvalues of ${mtext(A)}`,
		setAns([re(l1), re(l2)]),
		`${l1}, ${l2}`,
	);
};
export const inverse2: Gen = () => {
	let A = mat(2, 2, -3, 4);
	while (![1, -1, 2, -2].includes(det(A))) A = mat(2, 2, -3, 4);
	const d = det(A);
	const inv = [
		[A[1][1], -A[0][1]],
		[-A[1][0], A[0][0]],
	].map((row) => row.map((v) => Q(v, d)));
	return special(
		`${mtex(A)}^{-1}`,
		`${mtext(A)}⁻¹`,
		matAns(inv.map((row) => row.map((q) => q.v))),
		msol(inv.map((row) => row.map((q) => q.sol))),
	);
};

// =================== Calculus (Observatory) ===================
const lim = (to: string, body: string) => `\\lim_{x \\to ${to}} ${body}`;
export const limPoly: Gen = () => {
	const a = r(-4, 5);
	const coefs = [nz(-4, 4), r(-6, 6), r(-9, 9)];
	const t = lim(`${a}`, `\\left(${polyTex(coefs)}\\right)`);
	return int(t, texToText(t), polyAt(coefs, a));
};
export const limCancel: Gen = () => {
	const a = nz(-6, 6);
	const k = nz(-6, 6);
	// (x − a)(x + k) / (x − a) → a + k
	const top = polyMul([1, -a], [1, k]);
	const t = lim(`${a}`, `\\frac{${polyTex(top)}}{${polyTex([1, -a])}}`);
	return int(t, texToText(t), a + k);
};
export const limHard: Gen = () => {
	if (Math.random() < 0.4) {
		const k = r(2, 9);
		const t = lim('0', `\\frac{\\sin(${k}x)}{x}`);
		return int(t, texToText(t), k);
	}
	const a = nz(-4, 4);
	const t = lim(`${a}`, `\\frac{${polyTex([1, 0, 0, -(a ** 3)])}}{${polyTex([1, -a])}}`);
	return int(t, texToText(t), 3 * a * a);
};
export const limInf: Gen = () => {
	const a = nz(-9, 9);
	const d = r(1, 9);
	const t = lim(
		'\\infty',
		`\\frac{${polyTex([a, r(-9, 9), r(-9, 9)])}}{${polyTex([d, 0, nz(1, 9)])}}`,
	);
	return fracAns(t, texToText(t), a, d);
};
export const limInfMixed: Gen = () => {
	if (Math.random() < 0.3) {
		const t = lim(
			'\\infty',
			`\\frac{${polyTex([nz(-9, 9), r(1, 9)])}}{${polyTex([r(1, 5), 0, r(1, 9)])}}`,
		);
		return int(t, texToText(t), 0);
	}
	const a = nz(-9, 9);
	const c = r(2, 9);
	const t = lim('\\infty', `\\frac{${polyTex([a, r(-9, 9)])}}{${polyTex([c, nz(-9, 9)])}}`);
	return fracAns(t, texToText(t), a, c);
};
export const limTrig: Gen = () => {
	const kind = r(0, 2);
	if (kind === 0) {
		const [a, b] = [r(1, 9), r(2, 9)];
		const t = lim('0', `\\frac{\\sin(${cf(a)}x)}{\\sin(${cf(b)}x)}`);
		return fracAns(t, texToText(t), a, b);
	}
	if (kind === 1) {
		const a = r(1, 6);
		const t = lim('0', `\\frac{1 - \\cos(${cf(a)}x)}{x^{2}}`);
		return fracAns(t, texToText(t), a * a, 2);
	}
	const s = r(1, 9);
	const t = lim(`${s * s}`, `\\frac{\\sqrt{x} - ${s}}{x - ${s * s}}`);
	return fracAns(t, texToText(t), 1, 2 * s);
};
const ddx = (body: string) => `\\frac{d}{dx}\\left(${body}\\right)`;
const randPoly = (deg: number) => [nz(-5, 6), ...Array.from({ length: deg }, () => r(-7, 7))];
const polyAns = (coefs: number[]): Ans => ({
	kind: 'expr',
	form: 'poly',
	f: (x) => polyAt(coefs, x),
});
export const derivPoly: Gen = () => {
	const p = randPoly(r(2, 3));
	const d = polyDeriv(p);
	const t = ddx(polyTex(p));
	return special(t, texToText(t), polyAns(d), polySol(d));
};
export const derivAt: Gen = () => {
	const p = randPoly(3);
	const a = r(-3, 3);
	const t = `f(x) = ${polyTex(p)},\\ f'(${a})`;
	return int(t, texToText(t), polyAt(polyDeriv(p), a));
};
export const derivSecond: Gen = () => {
	const p = randPoly(r(3, 4));
	const d = polyDeriv(polyDeriv(p));
	const t = `\\frac{d^{2}}{dx^{2}}\\left(${polyTex(p)}\\right)`;
	return special(t, texToText(t), polyAns(d), polySol(d));
};
const at = (body: string, a: number) => `\\left.${ddx(body)}\\right|_{x=${a}}`;
export const derivProduct: Gen = () => {
	const [a, b, c] = [r(1, 5), nz(-4, 4), r(-2, 3)];
	// (x² + a)(x + b)
	const f = polyMul([1, 0, a], [1, b]);
	const t = at(`(${polyTex([1, 0, a])})(${polyTex([1, b])})`, c);
	return int(t, texToText(t), polyAt(polyDeriv(f), c));
};
export const derivChain: Gen = () => {
	const kind = r(0, 2);
	if (kind === 0) {
		const [a, b, n, c] = [nz(-3, 3), r(-3, 3), r(2, 4), r(-1, 2)];
		const t = at(`(${polyTex([a, b])})^{${n}}`, c);
		return int(t, texToText(t), n * a * (a * c + b) ** (n - 1));
	}
	const a = nz(-9, 9);
	const t = kind === 1 ? at(`\\sin(${cf(a)}x)`, 0) : at(`e^{${cf(a)}x}`, 0);
	return int(t, texToText(t), a);
};
export const derivQuotient: Gen = () => {
	const [a, b] = [r(-6, 6), r(1, 6)];
	if (a === b) return derivQuotient();
	const c = r(0, 3);
	// d/dx (x + a)/(x + b) = (b − a)/(x + b)²
	const t = at(`\\frac{${polyTex([1, a])}}{${polyTex([1, b])}}`, c);
	return fracAns(t, texToText(t), b - a, (c + b) ** 2);
};
const integral = (lo: string | number, hi: string | number, body: string, dv = 'dx') =>
	`\\int_{${lo}}^{${hi}} ${body} \\, ${dv}`;
/** ∫ of a polynomial between whole numbers, as a reduced fraction */
const definite = (coefs: number[], lo: number, hi: number) => {
	const deg = coefs.length - 1;
	// antiderivative with denominators: Σ c/(p+1) x^(p+1); use a common denominator
	const L = coefs.reduce((acc, _, i) => (acc * (deg - i + 1)) / gcd(acc, deg - i + 1), 1);
	const F = (x: number) =>
		coefs.reduce((acc, c, i) => acc + (c * L * x ** (deg - i + 1)) / (deg - i + 1), 0);
	return Q(Math.round(F(hi) - F(lo)), L);
};
export const integralLinear: Gen = () => {
	const coefs = [nz(-4, 6), r(-5, 5)];
	const b = r(1, 5);
	const q = definite(coefs, 0, b);
	const t = integral(0, b, `(${polyTex(coefs)})`);
	return special(t, texToText(t), num(q.v), q.sol);
};
export const integralQuad: Gen = () => {
	const coefs = [nz(-3, 3), r(-4, 4), r(-5, 5)];
	const a = r(-2, 1);
	const b = a + r(1, 3);
	const q = definite(coefs, a, b);
	const t = integral(a, b, `(${polyTex(coefs)})`);
	return special(t, texToText(t), num(q.v), q.sol);
};
export const integralCubic: Gen = () => {
	const coefs = [nz(-2, 3), r(-3, 3), r(-4, 4), r(-4, 4)];
	const b = r(1, 3);
	const q = definite(coefs, 0, b);
	const t = integral(0, b, `(${polyTex(coefs)})`);
	return special(t, texToText(t), num(q.v), q.sol);
};
/** f = 3a x² + 2b x + c has F = a x³ + b x² + c x; the boss shows F(b), F(a), then the difference */
export const integralBoss: Gen = () => {
	const [a, b, c] = [nz(-2, 3), r(-3, 3), r(-5, 5)];
	const f = [3 * a, 2 * b, c];
	const F = (x: number) => a * x ** 3 + b * x * x + c * x;
	const lo = r(-2, 1);
	const hi = lo + r(1, 3);
	const t = integral(lo, hi, `(${polyTex(f)})`);
	return int(t, texToText(t), F(hi) - F(lo), [
		part(`F(${hi})`, `F(${hi})`, F(hi), 0),
		part(`F(${lo})`, `F(${lo})`, F(lo), 0),
		part(`${F(hi)} - ${F(lo) < 0 ? `(${F(lo)})` : F(lo)}`, `${F(hi)} − ${F(lo)}`, F(hi) - F(lo), 1),
	]);
};
export const integralSub: Gen = () => {
	const kind = r(0, 2);
	if (kind === 0) {
		const n = r(1, 4);
		const t = integral(0, 1, `2x(x^{2}+1)^{${n}}`);
		return fracAns(t, texToText(t), 2 ** (n + 1) - 1, n + 1);
	}
	if (kind === 1) {
		const k = r(1, 6);
		const t = integral(0, `\\frac{\\pi}{${2 * k}}`, `\\cos(${cf(k)}x)`);
		return fracAns(t, texToText(t), 1, k);
	}
	const k = r(1, 4);
	const t = integral(0, '\\frac{\\pi}{2}', `${k}\\sin x \\cos x`);
	return fracAns(t, texToText(t), k, 2);
};
export const integralParts: Gen = () => {
	const k = r(1, 5);
	const kind = r(0, 3);
	if (kind === 0) {
		const t = integral(0, 1, `${k === 1 ? '' : k}x e^{x}`);
		return int(t, texToText(t), k);
	}
	if (kind === 1) {
		const t = integral(0, '\\pi', `${k === 1 ? '' : k}x \\sin x`);
		return special(t, texToText(t), num(k * Math.PI), `${k === 1 ? '' : k}pi`);
	}
	if (kind === 2) {
		// ∫₀^{π/2} x cos x dx = π/2 − 1
		const t = integral(0, '\\frac{\\pi}{2}', 'x \\cos x');
		return special(t, texToText(t), num(Math.PI / 2 - 1), 'pi/2 - 1');
	}
	const t = integral(1, 'e', `${k === 1 ? '' : k}\\ln x`);
	return int(t, texToText(t), k);
};
export const integralImproper: Gen = () => {
	const kind = r(0, 2);
	if (kind === 0) {
		const n = r(2, 6);
		const t = integral(1, '\\infty', `\\frac{1}{x^{${n}}}`);
		return fracAns(t, texToText(t), 1, n - 1);
	}
	if (kind === 1) {
		const k = r(1, 9);
		const t = integral(0, '\\infty', `e^{-${k === 1 ? '' : k}x}`);
		return fracAns(t, texToText(t), 1, k);
	}
	const t = integral(0, '\\infty', 'x e^{-x}');
	return int(t, texToText(t), 1);
};
const sumTex = (from: string, to: string, body: string, v = 'k') =>
	`\\sum_{${v}=${from}}^{${to}} ${body}`;
export const seriesEasy: Gen = () => {
	const n = r(5, 100);
	if (Math.random() < 0.5) {
		const t = sumTex('1', `${n}`, 'k');
		return int(t, texToText(t), (n * (n + 1)) / 2);
	}
	const t = sumTex('1', `${n}`, '(2k - 1)');
	return int(t, texToText(t), n * n);
};
export const seriesGeo: Gen = () => {
	const kind = r(0, 2);
	const q = r(2, 9);
	if (kind === 0) {
		const t = sumTex('0', '\\infty', `\\left(\\frac{1}{${q}}\\right)^{n}`, 'n');
		return fracAns(t, texToText(t), q, q - 1);
	}
	if (kind === 1) {
		const a = r(1, 9);
		const t = sumTex('1', '\\infty', `\\frac{${a}}{${q}^{n}}`, 'n');
		return fracAns(t, texToText(t), a, q - 1);
	}
	const n = r(3, 10);
	const t = sumTex('0', `${n}`, '2^{k}');
	return int(t, texToText(t), 2 ** (n + 1) - 1);
};
export const seriesHard: Gen = () => {
	const kind = r(0, 2);
	if (kind === 0) {
		const N = r(3, 99);
		const t = sumTex('1', `${N}`, '\\frac{1}{n(n+1)}', 'n');
		return fracAns(t, texToText(t), N, N + 1);
	}
	if (kind === 1) {
		const n = r(3, 20);
		const t = sumTex('1', `${n}`, 'k^{2}');
		return int(t, texToText(t), (n * (n + 1) * (2 * n + 1)) / 6);
	}
	const q = r(2, 9);
	const t = sumTex('0', '\\infty', `\\left(-\\frac{1}{${q}}\\right)^{n}`, 'n');
	return fracAns(t, texToText(t), q, q + 1);
};

// =================== Differential equations (Tide Works) ===================
export const odeSimple: Gen = () => {
	const kind = r(0, 2);
	if (kind === 0) {
		const [a, y0, x] = [r(1, 4), r(-5, 9), r(1, 5)];
		const t = `y' = ${2 * a === 1 ? '' : 2 * a}x,\\ y(0) = ${y0},\\ y(${x})`;
		return int(t, texToText(t), a * x * x + y0);
	}
	if (kind === 1) {
		const [y0, x] = [r(-5, 9), r(1, 3)];
		const t = `y' = 3x^{2},\\ y(0) = ${y0},\\ y(${x})`;
		return int(t, texToText(t), x ** 3 + y0);
	}
	const [c, y0, x] = [nz(-6, 9), r(-9, 9), r(1, 6)];
	const t = `y' = ${c},\\ y(0) = ${y0},\\ y(${x})`;
	return int(t, texToText(t), c * x + y0);
};
export const odeExp: Gen = () => {
	const k = r(1, 3);
	const A = r(1, 9);
	if (Math.random() < 0.5) {
		const t = `y' = ${k === 1 ? '' : k}y,\\ y(0) = ${A},\\ y(\\ln 2)`;
		return int(t, texToText(t), A * 2 ** k);
	}
	const B = A * 2 ** k;
	const t = `y' = -${k === 1 ? '' : k}y,\\ y(0) = ${B},\\ y(\\ln 2)`;
	return int(t, texToText(t), A);
};
export const odeSeparable: Gen = () => {
	if (Math.random() < 0.5) {
		const A = r(1, 9);
		const n = pick([2, 3, 5]);
		const t = `y' = 2xy,\\ y(0) = ${A},\\ y\\left(\\sqrt{\\ln ${n}}\\right)`;
		return int(t, texToText(t), A * n);
	}
	// y' = y², y(0) = A: y = A / (1 − Ax); at x = 1/(2A), y = 2A
	const A = r(1, 6);
	const t = `y' = y^{2},\\ y(0) = ${A},\\ y\\left(\\frac{1}{${2 * A}}\\right)`;
	return int(t, texToText(t), 2 * A);
};
export const halfLife: Gen = () => {
	const k = r(1, 4);
	const h = r(2, 9);
	const N = r(1, 9) * 2 ** k * 25;
	const t = `N(0) = ${N},\\ \\text{half-life } ${h},\\ N(${k * h})`;
	return int(t, texToText(t), N / 2 ** k);
};
export const cooling: Gen = () => {
	if (Math.random() < 0.5) {
		const k = r(1, 4);
		const d = r(2, 6);
		const P = r(1, 9) * 100;
		const t = `P(0) = ${P},\\ \\text{doubles every } ${d},\\ P(${k * d})`;
		return int(t, texToText(t), P * 2 ** k);
	}
	const Ta = r(1, 5) * 5;
	const m = r(2, 8) * 2;
	const t1 = r(5, 20);
	const t = `T' = -k(T - ${Ta}),\\ T(0) = ${Ta + 4 * m},\\ T(${t1}) = ${Ta + 2 * m},\\ T(${2 * t1})`;
	return int(t, texToText(t), Ta + m);
};
export const equilibrium: Gen = () => {
	if (Math.random() < 0.5) {
		const b = r(2, 6);
		const a = b * r(1, 9);
		const t = `y' = ${a} - ${b}y,\\ \\lim_{t \\to \\infty} y(t)`;
		return int(t, texToText(t), a / b);
	}
	const K = r(2, 20) * 50;
	const rr = pick(['0.1', '0.3', '0.5', '2']);
	const t = `P' = ${rr}P\\left(1 - \\frac{P}{${K}}\\right),\\ P(0) = ${r(1, 9) * 10},\\ \\lim_{t \\to \\infty} P(t)`;
	return int(t, texToText(t), K);
};
const charPoly = (b: number, c: number) =>
	`y''${signed(b, "y'").replace(/ [+-] 0y'/, '')}${signed(c, 'y').replace(/ [+-] 0y$/, '')} = 0`;
export const charRoots: Gen = () => {
	const [p, q] = twoRoots();
	const t = `${charPoly(-(p + q), p * q)},\\ \\text{characteristic roots}`;
	return special(t, texToText(t), setAns([re(p), re(q)]), `${p}, ${q}`);
};
export const charComplex: Gen = () => {
	const a = r(-4, 4);
	const b = r(1, 5);
	// roots a ± bi: r² − 2a r + (a² + b²)
	const t = `${charPoly(-2 * a, a * a + b * b)},\\ \\text{characteristic roots}`;
	return special(
		t,
		texToText(t),
		setAns([
			{ re: a, im: b },
			{ re: a, im: -b },
		]),
		`${cx(a, b)}, ${cx(a, -b)}`,
	);
};
/** y'' − (r₁+r₂)y' + r₁r₂y = 0 with y = c₁e^{r₁x} + c₂e^{r₂x}; asks y(ln 2) */
export const odeIvp =
	(withParts: boolean): Gen =>
	() => {
		const r1 = r(1, 3);
		let r2 = r(1, 3);
		while (r2 === r1) r2 = r(1, 3);
		const [c1, c2] = [nz(-3, 4), nz(-3, 4)];
		const y0 = c1 + c2;
		const yp0 = c1 * r1 + c2 * r2;
		const answer = c1 * 2 ** r1 + c2 * 2 ** r2;
		const t = `${charPoly(-(r1 + r2), r1 * r2)},\\ y(0) = ${y0},\\ y'(0) = ${yp0},\\ y(\\ln 2)`;
		const p = int(t, texToText(t), answer);
		if (withParts) {
			const [hi, lo] =
				r1 > r2
					? [
							[r1, c1],
							[r2, c2],
						]
					: [
							[r2, c2],
							[r1, c1],
						];
			p.parts = [
				part(`\\text{larger root}`, 'larger root', hi[0], 0),
				part(`\\text{smaller root}`, 'smaller root', lo[0], 0),
				part(`c\\ \\text{on}\\ e^{${cf(hi[0])}x}`, `c on e^${cf(hi[0])}x`, hi[1], 1),
				part(`c\\ \\text{on}\\ e^{${cf(lo[0])}x}`, `c on e^${cf(lo[0])}x`, lo[1], 1),
			];
		}
		return p;
	};

// =================== Vector calculus (Wind Farm) ===================
/** monomial c·x^i y^j z^k */
type Mono = { c: number; e: [number, number, number] };
const VARS = ['x', 'y', 'z'];
const monoTex = (m: Mono, first: boolean) => {
	const body = m.e.map((p, i) => (p === 0 ? '' : p === 1 ? VARS[i] : `${VARS[i]}^{${p}}`)).join('');
	const c = Math.abs(m.c) === 1 && body ? '' : `${Math.abs(m.c)}`;
	return first ? `${m.c < 0 ? '-' : ''}${c}${body}` : ` ${m.c < 0 ? '-' : '+'} ${c}${body}`;
};
const fieldTex = (ms: Mono[]) => (ms.length ? ms.map((m, i) => monoTex(m, i === 0)).join('') : '0');
const monoAt = (m: Mono, p: number[]) => m.e.reduce((acc, e, i) => acc * p[i] ** e, m.c);
const fieldAt = (ms: Mono[], p: number[]) => ms.reduce((acc, m) => acc + monoAt(m, p), 0);
const partial = (ms: Mono[], v: number): Mono[] =>
	ms
		.filter((m) => m.e[v] > 0)
		.map((m) => {
			const e = [...m.e] as [number, number, number];
			e[v]--;
			return { c: m.c * m.e[v], e };
		});
/** n random non-constant monomials of total degree ≤ maxDeg, like terms combined */
function randField(n: number, dims: number, maxDeg = 2): Mono[] {
	const out: Mono[] = [];
	let made = 0;
	while (made < n) {
		const e: [number, number, number] = [
			r(0, maxDeg),
			dims > 1 ? r(0, maxDeg) : 0,
			dims > 2 ? r(0, maxDeg) : 0,
		];
		const deg = e[0] + e[1] + e[2];
		if (deg === 0 || deg > maxDeg) continue;
		made++;
		const same = out.find((m) => m.e.every((p, k) => p === e[k]));
		if (same) same.c += nz(-4, 5);
		else out.push({ c: nz(-4, 5), e });
	}
	return out.filter((m) => m.c !== 0);
}
const point = (dims: number) => Array.from({ length: dims }, () => r(-2, 2));
const ptTex = (p: number[]) => `(${p.join(', ')})`;
export const gradient2: Gen = () => {
	let f = randField(2, 2);
	while (!f.length) f = randField(2, 2);
	const p = point(2);
	const g = [0, 1].map((v) => fieldAt(partial(f, v), p));
	const t = `\\nabla\\left(${fieldTex(f)}\\right) \\text{ at } ${ptTex(p)}`;
	return special(t, texToText(t), vecAns(g), vsol(g));
};
export const gradient3: Gen = () => {
	let f = randField(3, 3);
	while (f.length < 2) f = randField(3, 3);
	const p = point(3);
	const g = [0, 1, 2].map((v) => fieldAt(partial(f, v), p));
	const t = `\\nabla\\left(${fieldTex(f)}\\right) \\text{ at } ${ptTex(p)}`;
	return special(t, texToText(t), vecAns(g), vsol(g));
};
export const directional: Gen = () => {
	let f = randField(2, 2);
	while (!f.length) f = randField(2, 2);
	const p = point(2);
	const g = [0, 1].map((v) => fieldAt(partial(f, v), p));
	const [a, b, h] = pick(TRIPLES);
	const u = [a * pick([1, -1]), b * pick([1, -1])];
	const t = `D_{u}\\left(${fieldTex(f)}\\right) \\text{ at } ${ptTex(p)},\\ u = \\left(${Q(u[0], h).tex}, ${Q(u[1], h).tex}\\right)`;
	return fracAns(t, texToText(t), g[0] * u[0] + g[1] * u[1], h);
};
const fieldVecTex = (F: Mono[][]) =>
	`\\left\\langle ${F.map(fieldTex).join(',\\ ')} \\right\\rangle`;
const randVecField = () => [0, 1, 2].map(() => randField(2, 3));
export const divergence: Gen = () => {
	const F = randVecField();
	const p = point(3);
	const d = [0, 1, 2].reduce((acc, v) => acc + fieldAt(partial(F[v], v), p), 0);
	const t = `\\nabla \\cdot ${fieldVecTex(F)} \\text{ at } ${ptTex(p)}`;
	return int(t, texToText(t), d);
};
export const curl: Gen = () => {
	const F = randVecField();
	const p = point(3);
	const d = (i: number, v: number) => fieldAt(partial(F[i], v), p);
	const c = [d(2, 1) - d(1, 2), d(0, 2) - d(2, 0), d(1, 0) - d(0, 1)];
	const t = `\\nabla \\times ${fieldVecTex(F)} \\text{ at } ${ptTex(p)}`;
	return special(t, texToText(t), vecAns(c), vsol(c));
};
export const laplacian: Gen = () => {
	if (Math.random() < 0.5) return divergence();
	let f = randField(3, 3, 3);
	while (f.length < 2) f = randField(3, 3, 3);
	const p = point(3);
	const l = [0, 1, 2].reduce((acc, v) => acc + fieldAt(partial(partial(f, v), v), p), 0);
	const t = `\\nabla^{2}\\left(${fieldTex(f)}\\right) \\text{ at } ${ptTex(p)}`;
	return int(t, texToText(t), l);
};
const dbl = (a: number, b: number, body: string) =>
	`\\int_{0}^{${a}}\\!\\int_{0}^{${b}} ${body} \\, dy\\, dx`;
export const doubleLinear: Gen = () => {
	const [a, b, c, d] = [r(1, 4), r(1, 4), nz(-3, 4), nz(-3, 4)];
	// ∫∫ (cx + dy) = c a² b / 2 + d a b² / 2
	const t = dbl(
		a,
		b,
		`(${monoTex({ c, e: [1, 0, 0] }, true)}${monoTex({ c: d, e: [0, 1, 0] }, false)})`,
	);
	return fracAns(t, texToText(t), c * a * a * b + d * a * b * b, 2);
};
export const doubleProduct: Gen = () => {
	const [a, b, i, j] = [r(1, 3), r(1, 3), r(1, 3), r(0, 2)];
	const c = r(1, 4);
	// ∫₀^a x^i dx · ∫₀^b y^j dy
	const body = monoTex({ c, e: [i, j, 0] }, true);
	const t = dbl(a, b, body);
	return fracAns(t, texToText(t), c * a ** (i + 1) * b ** (j + 1), (i + 1) * (j + 1));
};
/** F = ∇f along any path from A to B: f(B) − f(A); the boss shows both first */
export const lineIntegral =
	(withParts: boolean): Gen =>
	() => {
		let f = randField(3, 3, 3);
		while (f.length < 2) f = randField(3, 3, 3);
		const F = [0, 1, 2].map((v) => partial(f, v));
		const A = point(3);
		const B = point(3);
		const fa = fieldAt(f, A);
		const fb = fieldAt(f, B);
		const t = `\\int_{C} ${fieldVecTex(F)} \\cdot d\\mathbf{r},\\ C: ${ptTex(A)} \\to ${ptTex(B)}`;
		const p = int(t, texToText(t), fb - fa);
		if (withParts)
			p.parts = [
				part(`f${ptTex(B)}`, `f${ptTex(B)}`, fb, 0),
				part(`f${ptTex(A)}`, `f${ptTex(A)}`, fa, 0),
				part(`${fb} - ${fa < 0 ? `(${fa})` : fa}`, `${fb} − ${fa}`, fb - fa, 1),
			];
		return p;
	};

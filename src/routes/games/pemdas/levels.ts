import type { Gen } from './problems';
import * as P from './problems';

export type RobotType =
	| 'spider'
	| 'janitor'
	| 'trooper'
	| 'brute'
	| 'juggernaut'
	| 'toybox'
	| 'titan'
	| 'overlord';

/**
 * Robots walk at the same speed on every level; easier levels drop them in closer
 * (and with less spread) instead of making them walk faster.
 */
export const WALK = 70;

/** bosses walk the whole road in 3, 4 and 5 minutes */
const bossSpeed = (seconds: number) => WALK / seconds;

export const ROBOTS: Record<
	RobotType,
	{ speed: number; damage: number; bounty: number; size: number; boss: boolean }
> = {
	spider: { speed: 2.5, damage: 1, bounty: 1, size: 0.6, boss: false },
	janitor: { speed: 1, damage: 1, bounty: 2, size: 0.85, boss: false },
	trooper: { speed: 1, damage: 1, bounty: 10, size: 1, boss: false },
	brute: { speed: 0.85, damage: 3, bounty: 25, size: 1.2, boss: false },
	juggernaut: { speed: bossSpeed(180), damage: 99, bounty: 100, size: 1.5, boss: true },
	/** a toy chest on wheels: walks and fights like the juggernaut */
	toybox: { speed: bossSpeed(180), damage: 99, bounty: 60, size: 1.45, boss: true },
	titan: { speed: bossSpeed(240), damage: 99, bounty: 250, size: 1.75, boss: true },
	overlord: { speed: bossSpeed(300), damage: 99, bounty: 1000, size: 2.1, boss: true },
};

export type Spawn = { type: RobotType; gen: Gen; count: number };
export type PaletteKey =
	| 'frac'
	| 'sqrt'
	| 'pi'
	| 'i'
	| 'x'
	| 'pow'
	| 'paren'
	| 'plus'
	| 'comma'
	| 'vec2'
	| 'vec3'
	| 'mat2'
	| 'mat3';
export type Wave = Spawn[];
export type LevelDef = {
	id: string;
	name: string;
	desc: string;
	/** unlocked once ANY of these is beaten (none = open from the start) */
	requires?: string[];
	/** seconds for a speed-1 robot to walk the whole road (WALK on every level) */
	walkTime: number;
	/** where regular robots drop in, 0 = far end of the road, 1 = you (default [0, 0.5]) */
	spawn?: [number, number];
	/** seconds before the next wave arrives even if this one isn't cleared */
	waveTime: number;
	crate: Gen;
	waves: Wave[];
	/** position on the level-select map, in node units */
	node: [number, number];
	/** short label on the map badge (default: the id) */
	badge?: string;
	/** neighborhood name, shown on the map; rematches use their parent's */
	district?: string;
	/** scenery theme (default: the id, or the parent's for rematches) */
	theme?: string;
	/**
	 * answers are typed as LaTeX or plain-text math (judged for value and form) instead of
	 * whole numbers; `palette` lists the template keys shown over the keypad
	 */
	latex?: { palette: PaletteKey[] };
	/** per-level bounty overrides; anything missing uses ROBOTS[type].bounty */
	bounty?: Partial<Record<RobotType, number>>;
};

/**
 * Regular-robot bounties grow level by level (never decreasing for any type) so a level's
 * expected haul climbs steadily; boss bounties stay fixed in ROBOTS.
 */
const pay = (spider: number, janitor: number, trooper: number, brute: number) => ({
	spider,
	janitor,
	trooper,
	brute,
});

/** the main level whose district/scenery a level uses */
export const isRematch = (lv: LevelDef) => lv.id.includes('.');
export const themeOf = (lv: LevelDef): string =>
	lv.theme ?? (isRematch(lv) ? (lv.requires?.[0] ?? lv.id) : lv.id);

const s = (type: RobotType, gen: Gen, count = 1): Spawn => ({ type, gen, count });

/**
 * Junior levels: three slow waves dropped in far away, each robot paying `n` (so every level
 * pays a little more, all well under Old Town's ~$158).
 */
function junior(
	id: string,
	name: string,
	desc: string,
	n: number,
	waves: Wave[],
	crate?: Gen,
): LevelDef {
	return {
		id,
		name,
		desc,
		badge: id.toUpperCase(),
		requires: n > 1 ? [`j${n - 1}`] : undefined,
		walkTime: WALK,
		spawn: [0, 0.25],
		waveTime: 55,
		crate: crate ?? waves[0][0].gen,
		node: [n - 6.5, -2.6],
		district: 'Toy Town',
		theme: 'toy',
		bounty: pay(n, n, n, 15),
		waves,
	};
}

export const LEVELS: LevelDef[] = [
	{
		id: '1',
		name: 'Add & Subtract',
		desc: 'Single digits. Last wave: two-digit ± one-digit.',
		walkTime: WALK,
		spawn: [0.36, 0.68],
		waveTime: 40,
		crate: P.addSub21,
		node: [0, 0],
		district: 'Suburbs',
		bounty: pay(1, 1, 1, 1),
		waves: [
			[s('janitor', P.addSub1, 4), s('janitor', P.addTiny, 2)],
			[s('janitor', P.addSub1, 6), s('janitor', P.addTiny, 3)],
			[s('janitor', P.addSub1, 3), s('janitor', P.addSub21, 4), s('janitor', P.addTiny, 3)],
		],
	},
	{
		id: '2',
		name: 'Times & Divide',
		desc: 'Factors under 10. Last wave: up to 16.',
		requires: ['1', 'j8'],
		walkTime: WALK,
		spawn: [0.29, 0.64],
		waveTime: 40,
		crate: P.mulDiv(16),
		node: [1, 0],
		district: 'Market Row',
		bounty: pay(2, 5, 5, 5),
		waves: [
			[s('janitor', P.mulDiv(9), 4), s('spider', P.mulDiv(5), 2)],
			[s('janitor', P.mulDiv(9), 6), s('spider', P.mulDiv(5), 3)],
			[s('janitor', P.mulDiv(9), 3), s('janitor', P.mulDiv(16, 6), 4), s('spider', P.mulDiv(5), 3)],
		],
	},
	{
		id: '3',
		name: 'Brackets',
		desc: 'Mixed operators and brackets, single digits.',
		requires: ['2'],
		walkTime: WALK,
		spawn: [0.14, 0.57],
		waveTime: 45,
		crate: P.mixed1Hard,
		node: [2, 0],
		district: 'Old Town',
		bounty: pay(2, 6, 10, 10),
		waves: [
			[s('janitor', P.mixed1Easy, 4), s('spider', P.addSub1, 2)],
			[s('janitor', P.mixed1, 3), s('trooper', P.mixed1, 3), s('spider', P.mulDiv(9), 3)],
			[s('trooper', P.mixed1, 3), s('trooper', P.mixed1Hard, 4), s('spider', P.mulDiv(9), 3)],
		],
	},
	{
		id: '4',
		name: 'Big Sums',
		desc: 'Two- and three-digit addition and subtraction. Last wave: four-digit sums.',
		requires: ['3'],
		walkTime: WALK,
		waveTime: 50,
		crate: P.add4,
		node: [3, 0],
		district: 'Bank Quarter',
		// brutes carry the 4-digit sums; trooper pay trimmed to keep the level's total near 212
		bounty: pay(2, 6, 12, 25),
		waves: [
			[s('janitor', P.add22, 4), s('spider', P.addSub21, 2)],
			[s('janitor', P.add22, 2), s('trooper', P.addSub23, 4), s('spider', P.addSub21, 3)],
			[s('trooper', P.addSub23, 3), s('brute', P.add4, 3), s('spider', P.add22, 3)],
		],
	},
	{
		id: '5',
		name: 'Hard Multiplication',
		desc: '2-digit × 1-digit. Miniboss: 2-digit × 2-digit.',
		requires: ['4'],
		walkTime: WALK,
		spawn: [0, 0.46],
		waveTime: 55,
		crate: P.mul(2, 1, 6),
		node: [4, 0],
		district: 'Factory District',
		bounty: pay(3, 6, 28, 28),
		waves: [
			[s('janitor', P.mul(2, 1), 4), s('spider', P.mulDiv(9), 2)],
			[s('trooper', P.mul(2, 1), 4), s('spider', P.mulDiv(9), 3)],
			[
				s('juggernaut', P.mulParts(2, 2, true)),
				s('trooper', P.mul(2, 1), 2),
				s('spider', P.mulDiv(9), 3),
			],
		],
	},
	{
		id: '5.5',
		node: [4, -1.2],
		name: 'Juggernaut Rematch',
		desc: '2-digit × 2-digit bosses. Use the Infrared Scope to see their sub-problems.',
		requires: ['5'],
		walkTime: WALK,
		waveTime: 70,
		crate: P.mul(2, 1),
		waves: [
			[s('juggernaut', P.mulParts(2, 2, true))],
			[s('juggernaut', P.mulParts(2, 2, true))],
			[s('juggernaut', P.mulParts(2, 2, true), 2)],
		],
	},
	{
		id: '6',
		name: 'Hard Mixed',
		desc: '2-digit × 1-digit, division to 16, two-digit ±.',
		requires: ['5'],
		walkTime: WALK,
		spawn: [0, 0.46],
		waveTime: 55,
		crate: P.mixed6Hard,
		node: [5, 0],
		district: 'Rail Yard',
		bounty: pay(3, 6, 28, 33),
		waves: [
			[s('janitor', P.mixed6Easy, 4), s('spider', P.mulDiv(12), 2)],
			[s('janitor', P.mixed6Easy, 2), s('trooper', P.mixed6, 4), s('spider', P.mulDiv(12), 3)],
			[s('trooper', P.mixed6, 3), s('brute', P.mixed6Hard, 3), s('spider', P.mulDiv(12), 3)],
		],
	},
	{
		id: '7',
		name: 'Triple Digits',
		desc: '3-digit × 1-digit. Boss: 3-digit × 2-digit.',
		requires: ['6'],
		walkTime: WALK,
		spawn: [0, 0.39],
		waveTime: 60,
		crate: P.mul(3, 1),
		node: [6, 0],
		district: 'Downtown',
		bounty: pay(4, 7, 35, 40),
		waves: [
			[s('janitor', P.mul(2, 1), 3), s('trooper', P.mul(3, 1), 2), s('spider', P.mulDiv(12), 2)],
			[s('trooper', P.mul(3, 1), 3), s('brute', P.mul(3, 1, 6), 2), s('spider', P.mulDiv(12), 3)],
			[
				s('titan', P.mulParts(3, 2, true)),
				s('trooper', P.mul(3, 1), 2),
				s('spider', P.mulDiv(12), 3),
			],
		],
	},
	{
		id: '7.5',
		node: [6, -1.2],
		name: 'Titan Rematch',
		desc: '3-digit × 2-digit bosses. Use the Infrared Scope to see their sub-problems.',
		requires: ['7'],
		walkTime: WALK,
		waveTime: 90,
		crate: P.mul(3, 1),
		waves: [
			[s('titan', P.mulParts(3, 2, true))],
			[s('titan', P.mulParts(3, 2, true))],
			[s('titan', P.mulParts(3, 2, true), 2)],
		],
	},
	{
		id: '8',
		name: 'Powers',
		desc: 'Squares up to 40², cubes up to 10³.',
		requires: ['7'],
		walkTime: WALK,
		waveTime: 50,
		crate: P.powersHard,
		node: [7, 0],
		district: 'Power Plant',
		bounty: pay(4, 7, 36, 44),
		waves: [
			[s('janitor', P.squaresEasy, 4), s('spider', P.squaresEasy, 2)],
			[s('janitor', P.powers, 2), s('trooper', P.powers, 4), s('spider', P.squaresEasy, 3)],
			[s('trooper', P.powers, 3), s('brute', P.powersHard, 4), s('spider', P.squaresEasy, 3)],
		],
	},
	{
		id: '9',
		name: 'The Overlord',
		desc: 'Titans: add up nine partial products. Overlord: 3-digit × 3-digit.',
		requires: ['8'],
		walkTime: WALK,
		waveTime: 100,
		crate: P.mul(3, 1),
		node: [8, 0],
		district: 'Robot Citadel',
		bounty: pay(5, 8, 40, 50),
		waves: [
			[s('titan', P.partialSum), s('trooper', P.citadelTrooper, 3), s('spider', P.addSub33, 3)],
			[
				s('titan', P.partialSum),
				s('trooper', P.citadelTrooper, 2),
				s('brute', P.citadelBrute, 2),
				s('spider', P.addSub33, 3),
			],
			// the overlord comes alone, once the road is clear
			[s('overlord', P.mulParts(3, 3, true))],
		],
	},
	{
		id: '9.5',
		node: [8, -1.2],
		name: 'Overlord Rematch',
		desc: '3-digit × 3-digit. Use the Infrared Scope to see their sub-problems.',
		requires: ['9'],
		walkTime: WALK,
		waveTime: 180,
		crate: P.mul(3, 1),
		waves: [[s('overlord', P.mulParts(3, 3, true))], [s('overlord', P.mulParts(3, 3, true))]],
	},

	// ---------- Junior track: slow, gentle, no spiders; leads into level 2 ----------
	junior('j1', 'Tiny Sums', 'Adding numbers up to 5.', 1, [
		[s('janitor', P.addUpTo(5), 4)],
		[s('janitor', P.addUpTo(5), 5)],
		[s('janitor', P.addUpTo(5), 6)],
	]),
	junior(
		'j2',
		'Adding Up',
		'Adding numbers up to 9. Boss: a brute with two-digit addition.',
		2,
		[
			[s('janitor', P.addUpTo(9), 4)],
			[s('janitor', P.addUpTo(9), 5)],
			[s('brute', P.add2Parts), s('janitor', P.addUpTo(9), 5)],
		],
		P.add2Parts,
	),
	junior('j3', 'Take Away', 'Subtracting single digits.', 3, [
		[s('janitor', P.subSingle, 4)],
		[s('janitor', P.subSingle, 5)],
		[s('janitor', P.subSingle, 6)],
	]),
	junior('j4', 'Little Times', 'Multiplying numbers up to 7.', 4, [
		[s('janitor', P.mulUpTo(7), 4)],
		[s('janitor', P.mulUpTo(7), 3), s('trooper', P.mulUpTo(7), 2)],
		[s('janitor', P.mulUpTo(7), 3), s('trooper', P.mulUpTo(7), 3)],
	]),
	junior(
		'j5',
		'Mix It Up',
		'Adding, taking away and times. Boss: the Toybox, with two-digit subtraction.',
		5,
		[
			[s('janitor', P.juniorMixed, 4)],
			[s('janitor', P.juniorMixed, 3), s('trooper', P.juniorMixed, 2)],
			[s('toybox', P.sub2Parts), s('janitor', P.juniorMixed, 3), s('trooper', P.juniorMixed, 2)],
		],
		P.sub2Parts,
	),
	junior('j6', 'Teen Sums', 'A number under 20 plus or minus one under 10.', 6, [
		[s('janitor', P.addSubTeens, 4)],
		[s('janitor', P.addSubTeens, 3), s('trooper', P.addSubTeens, 2)],
		[s('janitor', P.addSubTeens, 3), s('trooper', P.addSubTeens, 3)],
	]),
	junior('j7', 'Times Tables', 'Multiplying numbers up to 11.', 7, [
		[s('janitor', P.mulUpTo(11), 4)],
		[s('janitor', P.mulUpTo(11), 3), s('trooper', P.mulUpTo(11), 2)],
		[s('janitor', P.mulUpTo(11), 3), s('trooper', P.mulUpTo(11), 3)],
	]),
	junior(
		'j8',
		'Long Problems',
		'Two to four numbers, all adding and taking away, or all times. Boss: the Toybox, with teen × teen.',
		8,
		[
			[s('janitor', P.juniorChain, 4)],
			[s('janitor', P.juniorChain, 3), s('trooper', P.juniorChain, 2)],
			[s('toybox', P.teenMulParts), s('janitor', P.juniorChain, 3), s('trooper', P.juniorChain, 2)],
		],
		P.teenMulParts,
	),
];

import type { Gen } from './problems';
import * as P from './problems';

export type RobotType =
	| 'spider'
	| 'janitor'
	| 'trooper'
	| 'brute'
	| 'juggernaut'
	| 'titan'
	| 'overlord';

export const ROBOTS: Record<
	RobotType,
	{ speed: number; damage: number; bounty: number; size: number; boss: boolean }
> = {
	spider: { speed: 2.5, damage: 1, bounty: 3, size: 0.6, boss: false },
	janitor: { speed: 1, damage: 1, bounty: 5, size: 0.85, boss: false },
	trooper: { speed: 1, damage: 2, bounty: 10, size: 1, boss: false },
	brute: { speed: 0.85, damage: 3, bounty: 15, size: 1.2, boss: false },
	juggernaut: { speed: 0.5, damage: 99, bounty: 50, size: 1.5, boss: true },
	titan: { speed: 0.4, damage: 99, bounty: 100, size: 1.75, boss: true },
	overlord: { speed: 0.3, damage: 99, bounty: 250, size: 2.1, boss: true },
};

export type Spawn = { type: RobotType; gen: Gen; count: number };
export type Wave = Spawn[];
export type LevelDef = {
	id: string;
	name: string;
	desc: string;
	requires?: string;
	/** seconds for a speed-1 robot to walk the whole road */
	walkTime: number;
	/** seconds before the next wave arrives even if this one isn't cleared */
	waveTime: number;
	crate: Gen;
	waves: Wave[];
	map: { x: number; y: number };
	/** neighborhood shown on the level-select map (rematch levels share their parent's) */
	district?: string;
};

const s = (type: RobotType, gen: Gen, count = 1): Spawn => ({ type, gen, count });

export const LEVELS: LevelDef[] = [
	{
		id: '1',
		name: 'Add & Subtract',
		desc: 'Single digits. Last wave: two-digit ± one-digit.',
		walkTime: 60,
		waveTime: 40,
		crate: P.addSub21,
		map: { x: 8, y: 80 },
		district: 'Suburbs',
		waves: [
			[s('janitor', P.addSub1, 4), s('spider', P.addTiny, 2)],
			[s('janitor', P.addSub1, 3), s('trooper', P.addSub1, 3), s('spider', P.addTiny, 3)],
			[s('trooper', P.addSub1, 3), s('brute', P.addSub21, 4), s('spider', P.addTiny, 3)],
		],
	},
	{
		id: '2',
		name: 'Times & Divide',
		desc: 'Factors under 10. Last wave: up to 16.',
		requires: '1',
		walkTime: 60,
		waveTime: 40,
		crate: P.mulDiv(16),
		map: { x: 18, y: 60 },
		district: 'Market Row',
		waves: [
			[s('janitor', P.mulDiv(9), 4), s('spider', P.mulDiv(5), 2)],
			[s('janitor', P.mulDiv(9), 3), s('trooper', P.mulDiv(9), 3), s('spider', P.mulDiv(5), 3)],
			[s('trooper', P.mulDiv(9), 3), s('brute', P.mulDiv(16, 6), 4), s('spider', P.mulDiv(5), 3)],
		],
	},
	{
		id: '3',
		name: 'Brackets',
		desc: 'Mixed operators and brackets, single digits.',
		requires: '2',
		walkTime: 60,
		waveTime: 45,
		crate: P.mixed1Hard,
		map: { x: 28, y: 78 },
		district: 'Old Town',
		waves: [
			[s('janitor', P.mixed1Easy, 4), s('spider', P.addSub1, 2)],
			[s('janitor', P.mixed1, 3), s('trooper', P.mixed1, 3), s('spider', P.mulDiv(9), 3)],
			[s('trooper', P.mixed1, 3), s('brute', P.mixed1Hard, 4), s('spider', P.mulDiv(9), 3)],
		],
	},
	{
		id: '4',
		name: 'Big Sums',
		desc: 'Two- and three-digit addition. Last wave: four digits.',
		requires: '3',
		walkTime: 70,
		waveTime: 50,
		crate: P.add4,
		map: { x: 38, y: 55 },
		district: 'Bank Quarter',
		waves: [
			[s('janitor', P.add22, 4), s('spider', P.addSub21, 2)],
			[s('janitor', P.add22, 2), s('trooper', P.add23, 4), s('spider', P.addSub21, 3)],
			[s('trooper', P.add23, 3), s('brute', P.add4, 3), s('spider', P.add22, 3)],
		],
	},
	{
		id: '5',
		name: 'Hard Multiplication',
		desc: '2-digit × 1-digit. Miniboss: 2-digit × 2-digit.',
		requires: '4',
		walkTime: 75,
		waveTime: 55,
		crate: P.mul(2, 1, 6),
		map: { x: 48, y: 75 },
		district: 'Factory District',
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
		name: 'Juggernaut Rematch',
		desc: '2-digit × 2-digit bosses, no hints.',
		requires: '5',
		walkTime: 75,
		waveTime: 70,
		crate: P.mul(2, 1),
		map: { x: 52, y: 92 },
		waves: [
			[s('juggernaut', P.mulParts(2, 2, false))],
			[s('juggernaut', P.mulParts(2, 2, false))],
			[s('juggernaut', P.mulParts(2, 2, false), 2)],
		],
	},
	{
		id: '6',
		name: 'Hard Mixed',
		desc: '2-digit × 1-digit, division to 16, two-digit ±.',
		requires: '5',
		walkTime: 75,
		waveTime: 55,
		crate: P.mixed6Hard,
		map: { x: 60, y: 55 },
		district: 'Rail Yard',
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
		requires: '6',
		walkTime: 85,
		waveTime: 60,
		crate: P.mul(3, 1),
		map: { x: 70, y: 75 },
		district: 'Downtown',
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
		name: 'Titan Rematch',
		desc: '3-digit × 2-digit bosses, no hints.',
		requires: '7',
		walkTime: 85,
		waveTime: 90,
		crate: P.mul(3, 1),
		map: { x: 74, y: 92 },
		waves: [
			[s('titan', P.mulParts(3, 2, false))],
			[s('titan', P.mulParts(3, 2, false))],
			[s('titan', P.mulParts(3, 2, false), 2)],
		],
	},
	{
		id: '8',
		name: 'Powers',
		desc: 'Squares up to 40², cubes up to 10³.',
		requires: '7',
		walkTime: 70,
		waveTime: 50,
		crate: P.powersHard,
		map: { x: 80, y: 55 },
		district: 'Power Plant',
		waves: [
			[s('janitor', P.squaresEasy, 4), s('spider', P.squaresEasy, 2)],
			[s('janitor', P.powers, 2), s('trooper', P.powers, 4), s('spider', P.squaresEasy, 3)],
			[s('trooper', P.powers, 3), s('brute', P.powersHard, 4), s('spider', P.squaresEasy, 3)],
		],
	},
	{
		id: '9',
		name: 'The Overlord',
		desc: 'Two titans with 3-digit × 2-digit. Overlord: 3-digit × 3-digit.',
		requires: '8',
		walkTime: 90,
		waveTime: 100,
		crate: P.mul(3, 1),
		map: { x: 90, y: 72 },
		district: 'Robot Citadel',
		waves: [
			[s('titan', P.mulParts(3, 2, true))],
			[s('titan', P.mulParts(3, 2, true))],
			[s('overlord', P.mulParts(3, 3, true))],
		],
	},
	{
		id: '9.5',
		name: 'Overlord Rematch',
		desc: '3-digit × 3-digit, no hints.',
		requires: '9',
		walkTime: 90,
		waveTime: 180,
		crate: P.mul(3, 1),
		map: { x: 93, y: 90 },
		waves: [[s('overlord', P.mulParts(3, 3, false))], [s('overlord', P.mulParts(3, 3, false))]],
	},
];

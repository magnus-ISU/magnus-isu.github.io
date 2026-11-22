export type ItemKey = 'dynamite' | 'emp' | 'barrier' | 'shield';
export type UpgradeKey = 'laser' | 'scope' | 'targeting' | 'antimatter';

/** `code` is a KeyboardEvent.code, so hotkeys follow key position rather than layout */
export const ITEMS: {
	key: ItemKey;
	code: string;
	label: string;
	name: string;
	price: number;
	desc: string;
}[] = [
	{
		key: 'dynamite',
		code: 'KeyQ',
		label: 'Q',
		name: 'Dynamite',
		price: 50,
		desc: 'Blows up robots near the front one. Bosses are immune.',
	},
	{
		key: 'emp',
		code: 'KeyW',
		label: 'W',
		name: 'EMP',
		price: 100,
		desc: 'Freezes every robot for 5s. Each robot can only be frozen once.',
	},
	{
		key: 'barrier',
		code: 'KeyE',
		label: 'E',
		name: 'Barrier',
		price: 150,
		desc: 'A wall holds robots back for 10s. Each robot is only held once.',
	},
	{
		key: 'shield',
		code: 'KeyR',
		label: 'R',
		name: 'Shield',
		price: 200,
		desc: 'Blocks the next robot to reach you. Bosses get knocked back 15s instead.',
	},
];
export const ITEM_CAP = 5;

export const UPGRADES: { key: UpgradeKey; name: string; price: number; desc: string }[] = [
	{
		key: 'laser',
		name: 'Laser Pointer',
		price: 250,
		desc: 'Halves the penalty for firing into the ground with Backspace.',
	},
	{
		key: 'scope',
		name: 'Infrared Scope',
		price: 500,
		desc: 'Reveals boss sub-problems you can shoot for partial answers.',
	},
	{
		key: 'targeting',
		name: 'Computer Targeting',
		price: 1000,
		desc: 'Halves the time your guns stay jammed after a wrong answer.',
	},
	{
		key: 'antimatter',
		name: 'Antimatter Bullets',
		price: 2000,
		desc: 'Targets die in half the time.',
	},
];

/** health without any armor */
export const BASE_HP = 2;
/** bought left to right; at most one is worn at a time */
export const ARMOR = [
	{ name: 'Ballistic Vest', hp: 3, price: 100, desc: 'Kevlar plates. Shrugs off a spider bite.' },
	{
		name: 'Titanium Exoskeleton',
		hp: 4,
		price: 250,
		desc: 'A lightweight metal frame that takes a punch.',
	},
	{ name: 'Power Armor', hp: 5, price: 750, desc: 'Servo-driven plating salvaged from a trooper.' },
	{
		name: 'Holtzman Field',
		hp: 7,
		price: 2000,
		desc: 'A personal shield that slows anything that hits it.',
	},
];
export const maxHpOf = (s: Save) => (s.armor.on >= 0 ? ARMOR[s.armor.on].hp : BASE_HP);

export type Attempt = {
	won: boolean;
	stars: number;
	hp: number;
	maxHp: number;
	accuracy: number;
	avgSolve: number;
	/** average seconds to kill a boss, on levels that track it separately */
	bossTime?: number | null;
	kills: number;
	money: number;
	wave: number;
};

export type Save = {
	money: number;
	/** how many armor pieces are owned (bought in order), and which one is worn (-1 = none) */
	armor: { owned: number; on: number };
	items: Record<ItemKey, number>;
	/** owned upgrades; the value is whether it's switched on */
	upgrades: Partial<Record<UpgradeKey, boolean>>;
	stars: Record<string, number>;
	endlessBest: Record<string, number>;
	/** keyed by level id, plus `${id}:endless` */
	records: Record<string, { last: Attempt; best: Attempt }>;
};

const SAVE_KEY = 'pemdas-save-v1';

export const freshSave = (): Save => ({
	money: 0,
	armor: { owned: 0, on: -1 },
	items: { dynamite: 1, emp: 1, barrier: 0, shield: 0 },
	upgrades: {},
	stars: {},
	endlessBest: {},
	records: {},
});

export function loadSave(): Save {
	try {
		const raw = localStorage.getItem(SAVE_KEY);
		if (raw) return { ...freshSave(), ...JSON.parse(raw) };
	} catch {}
	return freshSave();
}

/** write to this browser only (used when a Drive download replaces the save) */
export function persistLocal(save: Save) {
	try {
		localStorage.setItem(SAVE_KEY, JSON.stringify(save));
	} catch {}
}

/** called after every local change, e.g. to schedule a Drive upload */
export const saveHooks = { changed: () => {} };

export function persist(save: Save) {
	persistLocal(save);
	saveHooks.changed();
}

/** higher is better */
export function attemptScore(a: Attempt, endless: boolean) {
	if (endless) return a.wave * 1e6 + a.kills;
	return (a.won ? 1e9 : 0) + a.stars * 1e7 + a.accuracy * 1e5 - Math.min(a.avgSolve, 99) * 100;
}

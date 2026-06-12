// Units absent from this map are standard (available to all regular tribes).
const UNIT_GROUP = {
	Raft: 'naval',
	Scout: 'naval',
	Rammer: 'naval',
	Bomber: 'naval',
	Juggernaut: 'naval',
	Dinghy: 'naval',
	Pirate: 'naval',
	MindBender: 'elyrion',
	Polytaur: 'elyrion',
	DragonEgg: 'elyrion',
	BabyDragon: 'elyrion',
	FireDragon: 'elyrion',
	Mooni: 'polaris',
	IceArcher: 'polaris',
	BattleSled: 'polaris',
	IceFortress: 'polaris',
	Gaami: 'polaris',
	Hexapod: 'cymanti',
	Kiton: 'cymanti',
	Phychi: 'cymanti',
	Raychi: 'cymanti',
	Boomchi: 'cymanti',
	Shaman: 'cymanti',
	Exida: 'cymanti',
	Doomux: 'cymanti',
	Centipede: 'cymanti',
	Segment: 'cymanti',
	InsectEgg: 'cymanti',
	Larva: 'cymanti',
	Moth: 'cymanti',
	LivingIsland: 'cymanti',
	Amphibian: 'aquarion',
	Tridention: 'aquarion',
	Shark: 'aquarion',
	Puffer: 'aquarion',
	Jelly: 'aquarion',
	Crab: 'aquarion',
	NatureBunny: 'easterEgg',
};

// Standard units display in this order; any others follow in config order.
const STANDARD_ORDER = [
	'Warrior',
	'Rider',
	'Archer',
	'Dagger',
	'Cloak',
	'Defender',
	'Swordsman',
	'Knight',
	'Catapult',
	'Giant',
];

// Polaris is the smallest tribe, so it goes last and hosts the easter-egg unit as an extra.
const TABS = [
	{ label: 'Standard', groups: ['standard'] },
	{ label: 'Naval', groups: ['naval'] },
	{ label: 'Elyrion', groups: ['elyrion'] },
	{ label: 'Cymanti', groups: ['cymanti'], columns: 7 },
	{ label: 'Aquarion', groups: ['aquarion'] },
	{ label: 'Polaris', groups: ['polaris', 'easterEgg'] },
];

export function buildUnitTabs(unitStats) {
	const byGroup = {};
	for (const { name } of unitStats) {
		const group = UNIT_GROUP[name] ?? 'standard';
		(byGroup[group] ??= []).push(name);
	}
	const rank = (n) => {
		const i = STANDARD_ORDER.indexOf(n);
		return i === -1 ? STANDARD_ORDER.length : i;
	};
	byGroup.standard?.sort((a, b) => rank(a) - rank(b));
	return TABS.map(({ label, groups, columns = 5 }) => ({
		label,
		columns,
		units: groups.flatMap((g) => byGroup[g] ?? []),
	})).filter((t) => t.units.length > 0);
}

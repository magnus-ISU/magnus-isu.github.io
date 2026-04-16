const modules = import.meta.glob('./monsters/*.js', { eager: true });

const srdSections = new Set([
	'cavern-dwellers',
	'dark-woods',
	'lower-depths',
	'twisted-experiments',
	'the-common-folk',
	'ravenous-hordes',
	'planar-powers',
	'swamp-denizens',
	'undead-legions',
]);

const order = [
	...srdSections,
	'wild-beasts',
	'denizens-of-the-feywild',
	'god-killers',
];

function slugToName(slug) {
	return slug
		.split('-')
		.map((w) => w[0].toUpperCase() + w.slice(1))
		.join(' ');
}

const sections = Object.entries(modules).map(([path, mod]) => {
	const slug = path.replace('./monsters/', '').replace('.js', '');
	return { slug, name: slugToName(slug), monsters: mod.default, homebrew: !srdSections.has(slug) };
});

sections.sort((a, b) => {
	const ai = order.indexOf(a.slug);
	const bi = order.indexOf(b.slug);
	if (ai === -1 && bi === -1) return 0;
	if (ai === -1) return 1;
	if (bi === -1) return -1;
	return ai - bi;
});

/** @type {{ slug: string, name: string, monsters: object[] }[]} */
export const monsterSections = sections;

/** @type {object[]} */
export const allMonsters = sections.flatMap((s) => s.monsters);

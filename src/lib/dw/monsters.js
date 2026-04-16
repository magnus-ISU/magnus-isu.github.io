const modules = import.meta.glob('./monsters/*.js', { eager: true });

function slugToName(slug) {
	return slug
		.split('-')
		.map((w) => w[0].toUpperCase() + w.slice(1))
		.join(' ');
}

/** @type {{ slug: string, name: string, monsters: object[] }[]} */
export const monsterSections = Object.entries(modules).map(([path, mod]) => {
	const slug = path.replace('./monsters/', '').replace('.js', '');
	return { slug, name: slugToName(slug), monsters: mod.default };
});

/** @type {object[]} */
export const allMonsters = monsterSections.flatMap((s) => s.monsters);

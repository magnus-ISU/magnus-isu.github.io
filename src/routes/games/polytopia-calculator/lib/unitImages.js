import SmallSwords from './img/Other/SmallSwords.png';

// Keys are unit config names, i.e. the filename with spaces removed ("Dragon Egg.png" -> DragonEgg).
const modules = import.meta.glob('./img/*/*.png', { eager: true, import: 'default' });

export const unitImages = { Attackers: {}, Defenders: {} };
for (const [path, url] of Object.entries(modules)) {
	const [, team, file] = path.match(/^\.\/img\/(\w+)\/(.+)\.png$/) ?? [];
	if (unitImages[team]) unitImages[team][file.replaceAll(' ', '')] = url;
}

export function displayIcon(typeUnit, team) {
	return unitImages[team]?.[typeUnit] || SmallSwords;
}

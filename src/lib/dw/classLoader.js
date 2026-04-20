const srdRaw = import.meta.glob('/src/lib/dw/srd/*.md', { query: '?raw', import: 'default' });
const homebrewRaw = import.meta.glob('/src/lib/dw/homebrew/**/*.md', {
	query: '?raw',
	import: 'default',
});

export async function loadClassRaw(entry) {
	let path, modules;
	if (entry.source === 'srd') {
		path = `/src/lib/dw/srd/${entry.file}.md`;
		modules = srdRaw;
	} else {
		path = `/src/lib/dw/homebrew/${entry.file}.md`;
		modules = homebrewRaw;
	}
	const resolver = modules[path];
	if (!resolver) return null;
	return await resolver();
}

export function buildCharacterSheet(raw) {
	// Extract class name from "# The Fighter" → "Fighter"
	const nameMatch = raw.match(/^#\s+(?:The\s+)?(.+)/m);
	const className = nameMatch ? nameMatch[1].trim() : 'Unknown';

	// Extract HP from "HP: X+Constitution" or "Your maximum HP is X+Constitution."
	const hpMatch = raw.match(/HP:\s*(\d+)\s*\+/i) || raw.match(/maximum HP is (\d+)\+/i);
	const baseHp = (hpMatch ? +hpMatch[1] : 0) + 9;

	// Extract Damage from "Damage: dX" or "Your base damage is dX."
	const dmgMatch = raw.match(/Damage:\s*(d\d+)/i) || raw.match(/base damage is (d\d+)/i);
	const damage = dmgMatch ? dmgMatch[1] : 'd6';

	// Extract Load from "Load: X+STR" or "Your load is X+Str"
	const loadMatch = raw.match(/Load:\s*(\d+)\s*\+/i) || raw.match(/load is (\d+)\+/i);
	const baseLoad = loadMatch ? +loadMatch[1] : 0;

	// Default stats: STR 2, DEX 1, CON 1, INT 0, WIS 0, CHA -1
	const defaultCon = 1;
	const initialMaxHp = baseHp + 3 * defaultCon;

	const header = [
		`The ${className}, ${className} 1`,
		`EXP 0, Base HP ${baseHp}, Armor 0, Damage ${damage}, Base Load ${baseLoad}, HP ${initialMaxHp}`,
		`STR 2, DEX 1, CON 1, INT 0, WIS 0, CHA -1`,
		``,
	].join('\n');

	return header + '\n' + raw;
}

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const srdDir = path.join(__dirname, '..', 'src', 'lib', 'dw', 'srd');
const outDir = path.join(__dirname, '..', 'src', 'lib', 'dw', 'monsters');

const fileMap = {
	'Caverns.md': 'cavern-dwellers',
	'Woods.md': 'dark-woods',
	'Depths.md': 'lower-depths',
	'Experiments.md': 'twisted-experiments',
	'Folk.md': 'the-common-folk',
	'Hordes.md': 'ravenous-hordes',
	'Planes.md': 'planar-powers',
	'Swamp.md': 'swamp-denizens',
	'Undead.md': 'undead-legions',
};

const CREATURE_TAGS = new Set([
	'Solitary', 'Group', 'Horde',
	'Tiny', 'Small', 'Large', 'Huge',
	'Magical', 'Divine', 'Planar',
	'Terrifying', 'Organized', 'Intelligent', 'Cautious',
	'Devious', 'Stealthy', 'Amorphous', 'Construct', 'Hoarder',
	// Some SRD entries put weapon tags on creature line
	'Messy', 'Forceful',
]);

const ATTACK_TAGS = new Set([
	'Close', 'Reach', 'Near', 'Far', 'Hand', 'Messy', 'Forceful',
]);

function unesc(s) {
	return s.replace(/\\([()!\[\],])/g, '$1').replace(/\\$/g, '');
}

function parseNameTags(line) {
	// Strip trailing comma
	line = line.replace(/,\s*$/, '');
	const words = line.split(/\s+/);
	let splitIdx = words.length;
	for (let i = 0; i < words.length; i++) {
		const w = words[i].replace(/,/g, '');
		if (CREATURE_TAGS.has(w)) {
			splitIdx = i;
			break;
		}
	}
	const name = words.slice(0, splitIdx).join(' ');
	const tags = words.slice(splitIdx).join(' ').replace(/,\s*$/, '');
	return { name, tags: tags || null };
}

function isAttackTagLine(line) {
	const parts = line.split(',').map(p => p.trim());
	return parts.length > 0 && parts.every(p => {
		const w = p.split(/\s+/)[0];
		return ATTACK_TAGS.has(w);
	});
}

function parseAttackLine(line) {
	// Pattern: "Attack Name (damage_expr) HP_NUM HP ARMOR_NUM Armor"
	const m = line.match(/^(.+?)\s*\((.+?)\)\s+(\d+)\s+HP\s+(\d+)\s+Armor/);
	if (!m) return null;
	const atkName = m[1].trim();
	let damageRaw = m[2].trim();
	const hp = parseInt(m[3]);
	const armor = parseInt(m[4]);

	// Extract damage dice, ignores armor, piercing from damageRaw
	// e.g. "d10+1 damage ignores armor" or "d6 damage 1 piercing" or "b[2d10]+4 damage, 4 piercing"
	let damage = '';
	let piercing = null;
	let ignoresArmor = false;

	// Remove "damage" keyword
	damageRaw = damageRaw.replace(/\bdamage\b/gi, '').trim();

	// Check for "ignores armor"
	if (/ignores\s+armor/i.test(damageRaw)) {
		ignoresArmor = true;
		damageRaw = damageRaw.replace(/ignores\s+armor/i, '').trim();
	}

	// Check for "N piercing"
	const piercingMatch = damageRaw.match(/(\d+)\s+piercing/i);
	if (piercingMatch) {
		piercing = parseInt(piercingMatch[1]);
		damageRaw = damageRaw.replace(/\d+\s+piercing/i, '').trim();
	}

	// Clean up commas and whitespace
	damage = damageRaw.replace(/^,|,$/g, '').trim();

	return { name: atkName, damage, hp, armor, piercing, ignoresArmor };
}

function parseMonsters(text) {
	// Remove heading
	text = text.replace(/^#\s+.*\n/, '');

	// Unescape markdown
	text = unesc(text);

	const lines = text.split('\n');
	const monsters = [];
	let i = 0;

	while (i < lines.length) {
		// Skip blank lines
		if (!lines[i].trim()) { i++; continue; }

		// Skip bullet lines at start (shouldn't happen but safety)
		if (/^\s+\*\s/.test(lines[i])) { i++; continue; }

		// This should be a name+tags line
		const nameLine = lines[i].trim();
		if (!nameLine || nameLine.startsWith('#')) { i++; continue; }

		const { name, tags } = parseNameTags(nameLine);
		if (!name) { i++; continue; }

		i++;
		// Skip blanks
		while (i < lines.length && !lines[i].trim()) i++;

		// Try to parse attack line
		let attack = null;
		let attackTags = null;
		let special = null;
		let descParts = [];
		let moves = [];

		// Check if next line is an attack line
		if (i < lines.length && /\(.*\)\s+\d+\s+HP/.test(lines[i])) {
			attack = parseAttackLine(lines[i].trim());
			i++;
			// Skip blanks
			while (i < lines.length && !lines[i].trim()) i++;

			// Check for attack tags line
			if (i < lines.length && isAttackTagLine(lines[i].trim())) {
				attackTags = lines[i].trim();
				i++;
				while (i < lines.length && !lines[i].trim()) i++;
			}
		}

		// Check for Special Qualities
		if (i < lines.length && lines[i].trim().startsWith('**Special Qualities:**')) {
			special = lines[i].trim().replace('**Special Qualities:**', '').trim();
			i++;
			while (i < lines.length && !lines[i].trim()) i++;
		}

		// Collect description lines until we hit bullet points or end
		while (i < lines.length && !/^\s+\*\s/.test(lines[i])) {
			const line = lines[i].trim();
			if (line) descParts.push(line);
			i++;
		}

		// Collect moves (bullet lines)
		while (i < lines.length && /^\s+\*\s/.test(lines[i])) {
			moves.push(lines[i].trim().replace(/^\*\s+/, ''));
			i++;
		}

		// Parse description and instinct
		let description = descParts.join(' ');
		let instinct = null;

		const instinctMatch = description.match(/_Instinct_:\s*(.+?)$/);
		if (instinctMatch) {
			instinct = instinctMatch[1].trim();
			description = description.substring(0, description.indexOf('_Instinct_')).trim();
		}

		// Clean up instinct (remove trailing quotes, periods)
		// Also handle "Instinct: To do X" or just "To do X"

		// Build attack object
		let attacks = [];
		if (attack) {
			const atkObj = { name: attack.name };
			if (attack.damage) atkObj.damage = attack.damage;

			const tagParts = [];
			if (attackTags) tagParts.push(attackTags);
			if (attack.piercing) tagParts.push(`${attack.piercing} piercing`);
			if (attack.ignoresArmor) tagParts.push('ignores armor');
			if (tagParts.length > 0) atkObj.tags = tagParts.join(', ');

			attacks.push(atkObj);
		}

		// Build monster object
		const monster = { name };
		if (tags) monster.tags = tags;
		if (attack) {
			monster.hp = attack.hp;
			monster.armor = attack.armor;
		}
		if (attacks.length > 0) monster.attacks = attacks;
		if (special) monster.special = special;
		if (description) monster.description = description;
		if (instinct) monster.instinct = instinct;
		if (moves.length > 0) monster.moves = moves;

		monsters.push(monster);
	}

	return monsters;
}

function escJs(s) {
	return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function monsterToJs(m, indent = '\t') {
	const lines = [`${indent}{`];
	const i2 = indent + '\t';

	lines.push(`${i2}name: '${escJs(m.name)}',`);
	if (m.tags) lines.push(`${i2}tags: '${escJs(m.tags)}',`);
	if (m.hp != null) lines.push(`${i2}hp: ${m.hp},`);
	if (m.armor != null) lines.push(`${i2}armor: ${m.armor},`);
	if (m.attacks && m.attacks.length > 0) {
		const atks = m.attacks.map(a => {
			const parts = [`name: '${escJs(a.name)}'`];
			if (a.damage) parts.push(`damage: '${escJs(a.damage)}'`);
			if (a.tags) parts.push(`tags: '${escJs(a.tags)}'`);
			return `{ ${parts.join(', ')} }`;
		});
		if (atks.join(', ').length < 80) {
			lines.push(`${i2}attacks: [${atks.join(', ')}],`);
		} else {
			lines.push(`${i2}attacks: [`);
			atks.forEach(a => lines.push(`${i2}\t${a},`));
			lines.push(`${i2}],`);
		}
	}
	if (m.special) lines.push(`${i2}special: '${escJs(m.special)}',`);
	if (m.description) lines.push(`${i2}description: '${escJs(m.description)}',`);
	if (m.instinct) lines.push(`${i2}instinct: '${escJs(m.instinct)}',`);
	if (m.moves && m.moves.length > 0) {
		const movesStr = m.moves.map(v => `'${escJs(v)}'`).join(', ');
		if (movesStr.length < 80) {
			lines.push(`${i2}moves: [${movesStr}],`);
		} else {
			lines.push(`${i2}moves: [`);
			m.moves.forEach(v => lines.push(`${i2}\t'${escJs(v)}',`));
			lines.push(`${i2}],`);
		}
	}

	lines.push(`${indent}},`);
	return lines.join('\n');
}

// Process all files
for (const [srdFile, slug] of Object.entries(fileMap)) {
	const filePath = path.join(srdDir, srdFile);
	if (!fs.existsSync(filePath)) {
		console.error(`Missing: ${filePath}`);
		continue;
	}

	const text = fs.readFileSync(filePath, 'utf-8');
	const monsters = parseMonsters(text);

	console.log(`${srdFile} → ${slug}.js: ${monsters.length} monsters`);

	// Print first 2 for verification
	monsters.slice(0, 2).forEach(m => {
		console.log(`  ${m.name} (${m.tags || 'no tags'}) HP:${m.hp ?? '-'} Armor:${m.armor ?? '-'} Atks:${m.attacks?.length ?? 0} Moves:${m.moves?.length ?? 0}`);
	});

	const jsContent = `export default [\n${monsters.map(m => monsterToJs(m)).join('\n')}\n];\n`;
	const outPath = path.join(outDir, `${slug}.js`);
	fs.writeFileSync(outPath, jsContent);
}

console.log('\nDone!');

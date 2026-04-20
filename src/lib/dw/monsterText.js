/**
 * Parse the compact text format into a monster object.
 *
 * Format:
 *   name, tag, tag, tag...
 *   hp, armor, description
 *   instinct, special qualities
 *   attack: Name ; damage ; tags
 *   move; move; move
 */
export function parseMonsterText(raw) {
	const lines = raw.split('\n');
	const get = (i) => lines[i]?.trim() || '';

	// Line 0: name, tag, tag, tag...
	const nameParts = get(0).split(',').map((s) => s.trim());
	const name = nameParts[0] || '';
	const tags = nameParts.slice(1).filter(Boolean).join(', ');

	// Line 1: hp, armor, description
	const line1 = get(1).split(',').map((s) => s.trim());
	const hp = line1[0] ? +line1[0] : null;
	const armor = line1[1] ? +line1[1] : null;
	const description = line1.slice(2).join(', ').replaceAll('\\n', '\n');

	// Line 2: instinct, special qualities
	const line2 = get(2).split(',').map((s) => s.trim());
	const instinct = line2[0] || '';
	const special = line2.slice(1).filter(Boolean).join(', ');

	const attacks = [];
	const moves = [];
	for (let i = 3; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;
		if (line.toLowerCase().startsWith('attack:')) {
			const parts = line.slice(7).split(';').map((s) => s.trim());
			attacks.push({ name: parts[0] || '', damage: parts[1] || '', tags: parts[2] || '' });
		} else {
			for (const m of line.split(';').map((s) => s.trim()).filter(Boolean)) moves.push(m);
		}
	}

	return {
		name: name || 'Unnamed',
		...(tags && { tags }),
		...(hp !== null && !isNaN(hp) && { hp }),
		...(armor !== null && !isNaN(armor) && { armor }),
		attacks: attacks.filter((a) => a.name),
		...(special && { special }),
		...(description && { description }),
		...(instinct && { instinct }),
		moves,
	};
}

/**
 * Serialize a monster object back to the compact text format.
 */
export function monsterToText(m) {
	const line0 = [m.name, ...(m.tags ? m.tags.split(',').map((s) => s.trim()).filter(Boolean) : [])].join(', ');
	const line1 = [m.hp ?? '', m.armor ?? '', m.description || ''].join(', ');
	const line2 = [m.instinct || '', m.special || ''].join(', ');
	const lines = [line0, line1, line2];
	for (const atk of m.attacks || []) {
		const parts = [atk.name, atk.damage, atk.tags].filter(Boolean);
		lines.push(`attack: ${parts.join(' ; ')}`);
	}
	if (m.moves?.length) lines.push(m.moves.join('; '));
	while (lines.length > 1 && !lines[lines.length - 1]) lines.pop();
	return lines.join('\n');
}

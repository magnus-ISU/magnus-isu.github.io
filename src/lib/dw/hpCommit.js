/**
 * Parse an HP input string and return the new HP value.
 * @param {string} raw      - User input: "+5", "-3", or "12"
 * @param {number} current  - Current HP
 * @param {number|null} max - Max HP (caps healing), or null for no cap
 * @param {number} armor    - Armor value (subtracted from damage)
 * @returns {number|null}   - New HP value, or null if input is invalid
 */
export function commitHp(raw, current, max, armor = 0) {
	raw = raw.trim();
	if (!raw) return null;
	if (raw.startsWith('+')) {
		const heal = parseInt(raw.slice(1), 10);
		if (Number.isNaN(heal)) return null;
		return Math.min(current + heal, max ?? Infinity);
	}
	if (raw.startsWith('-')) {
		const dmg = parseInt(raw.slice(1), 10);
		if (Number.isNaN(dmg)) return null;
		const effective = Math.max(0, dmg - armor);
		return Math.max(0, current - effective);
	}
	const val = parseInt(raw, 10);
	return Number.isNaN(val) ? null : val;
}

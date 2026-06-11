const FLAG_CHARS = {
	v: 'veteran',
	d: 'defenceBonus',
	w: 'wallBonus',
	s: 'safeBonus',
	p: 'poisonedBonus',
	b: 'boostedBonus',
	x: 'splashDamage',
	e: 'explodeDamage',
};

function encodeUnit(u) {
	let flags = '';
	for (const [c, key] of Object.entries(FLAG_CHARS)) if (u[key]) flags += c;
	const defaultMax = u.config.maxHealth + (u.veteran ? 5 : 0);
	const hpField = u.healthBefore !== u.healthMax ? String(u.healthBefore) : '';
	const maxField = u.healthMax !== defaultMax ? String(u.healthMax) : '';
	const parts = [u.typeUnit, flags, hpField, maxField];
	while (parts.length > 1 && parts[parts.length - 1] === '') parts.pop();
	return parts.join('-');
}

export function encodeTeam(units) {
	return units.map(encodeUnit).join('~');
}

export function decodeTeam(str, team, getUnitConfig) {
	if (!str) return [];
	return str
		.split('~')
		.map((spec, id) => decodeUnit(spec, team, id, getUnitConfig))
		.filter((u) => u !== null)
		.map((u, id) => ({ ...u, id }));
}

function decodeUnit(spec, team, id, getUnitConfig) {
	if (!spec) return null;
	const [type, flagsStr = '', hpStr = '', maxStr = ''] = spec.split('-');
	let config;
	try {
		config = getUnitConfig(type);
	} catch {
		return null;
	}
	const veteran = flagsStr.includes('v');
	const defaultMax = config.maxHealth + (veteran ? 5 : 0);
	const healthMax = maxStr === '' ? defaultMax : Number(maxStr);
	const healthBefore = hpStr === '' ? healthMax : Number(hpStr);
	const unit = {
		id,
		typeUnit: type,
		team,
		config,
		healthMax,
		healthBefore,
		healthAfter: healthBefore,
		veteran,
		defenceBonus: flagsStr.includes('d'),
		wallBonus: flagsStr.includes('w'),
		safeBonus:
			flagsStr.includes('s') || (team === 'Attackers' && config.skills.includes('surprise')),
		poisonedBonus: flagsStr.includes('p'),
		becamePoisonedBonus: false,
		boostedBonus: flagsStr.includes('b'),
		shipUnit: config.skills.includes('variableHp'),
		splashDamage: flagsStr.includes('x'),
		explodeDamage: flagsStr.includes('e'),
	};
	return unit;
}

export function encodeStateToParams(attackers, defenders, version) {
	const params = new URLSearchParams();
	if (version) params.set('v', version);
	if (attackers.length > 0) params.set('a', encodeTeam(attackers));
	if (defenders.length > 0) params.set('d', encodeTeam(defenders));
	return params;
}

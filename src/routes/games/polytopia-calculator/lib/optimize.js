import {
	calculateAttackForce,
	calculateAttackResult,
	calculateAttackSplash,
	calculateDefenceForce,
	calculateDefenseResult,
	calculateTotalDamage,
} from './damageFormulae.js';

export function simulate(att, def, cfg) {
	const attList = att.map((u) => ({ ...u, healthAfter: u.healthBefore, wasUsed: false }));
	const defList = def.map((u) => ({
		...u,
		healthAfter: u.healthBefore,
		becamePoisonedBonus: u.becamePoisonedBonus,
		wasUsed: false,
	}));

	let idxDefPos = 0;
	let totalAttackResult = 0;
	let defenderRepeatedAttack = 0;

	attList.forEach((attacker) => {
		const defender = defList[idxDefPos];
		if (!defender) return;

		attacker.wasUsed = true;
		defender.wasUsed = true;

		if (defenderRepeatedAttack === 0) defender.becamePoisonedBonus = false;
		defenderRepeatedAttack++;

		const attackerAttack = attacker.config.attack + (attacker.boostedBonus ? 0.5 : 0);
		const attackForce = calculateAttackForce(attackerAttack, attacker.healthBefore, attacker.healthMax);

		let defenderDefenseBonus = defender.wallBonus ? 4 : defender.defenceBonus ? 1.5 : 1;
		if (defender.poisonedBonus || defender.becamePoisonedBonus) {
			if (cfg?.poisonScheme === 'OLD') {
				defenderDefenseBonus = 0.7;
			} else {
				defenderDefenseBonus = defenderDefenseBonus * 0.5;
			}
		}

		const defenseForce = calculateDefenceForce(
			defender.config.defence,
			defender.healthAfter,
			defender.healthMax,
			defenderDefenseBonus,
		);
		const totalDamage = calculateTotalDamage(attackForce, defenseForce);

		let attackResult = 0;
		const isSplash =
			attacker.explodeDamage ||
			attacker.typeUnit === 'Segment' ||
			(attacker.splashDamage &&
				(attacker.config.skills.includes('splash') || attacker.config.skills.includes('stomp')));
		if (isSplash) {
			attackResult = calculateAttackSplash(attackForce, totalDamage, attackerAttack);
			if (cfg?.splashScheme === 'FLOOR') attackResult = Math.floor(attackResult);
		} else {
			attackResult = calculateAttackResult(attackForce, totalDamage, attackerAttack);
		}

		totalAttackResult += attackResult;
		defender.healthAfter = defender.healthBefore - totalAttackResult;

		if (defender.healthAfter > 0) {
			const defenceResult = calculateDefenseResult(defenseForce, totalDamage, defender.config.defence);
			if (
				attacker.config.skills.includes('poison') ||
				attacker.typeUnit === 'Segment' ||
				attacker.explodeDamage
			) {
				defender.becamePoisonedBonus = true;
			}
			if (
				!attacker.config.skills.includes('surprise') &&
				!defender.config.skills.includes('stiff') &&
				!attacker.safeBonus
			) {
				attacker.healthAfter = attacker.healthBefore - defenceResult;
			} else if (attacker.explodeDamage || attacker.typeUnit === 'Segment') {
				attacker.healthAfter = 0;
			}
		} else {
			idxDefPos++;
			totalAttackResult = 0;
			defenderRepeatedAttack = 0;
		}
	});

	return { attList, defList };
}

export function scoreOutcome(att, def, attList, defList) {
	let defDmg = 0;
	let attDmg = 0;
	let unitsUsed = 0;
	for (let i = 0; i < defList.length; i++) {
		const before = def[i].healthBefore;
		const after = Math.max(0, defList[i].healthAfter);
		defDmg += before - after;
	}
	for (let i = 0; i < attList.length; i++) {
		const before = att[i].healthBefore;
		const after = Math.max(0, attList[i].healthAfter);
		attDmg += before - after;
		if (attList[i].wasUsed) unitsUsed++;
	}
	return defDmg * 1_000_000 - unitsUsed * 1_000 - attDmg;
}

export function simulateAndScore(att, def, cfg) {
	const { attList, defList } = simulate(att, def, cfg);
	const score = scoreOutcome(att, def, attList, defList);
	return { attList, defList, score };
}

function heapsPerm(arr, n, cb) {
	if (n === 1) {
		cb(arr);
		return;
	}
	for (let i = 0; i < n; i++) {
		heapsPerm(arr, n - 1, cb);
		if (n % 2 === 0) {
			const tmp = arr[i];
			arr[i] = arr[n - 1];
			arr[n - 1] = tmp;
		} else {
			const tmp = arr[0];
			arr[0] = arr[n - 1];
			arr[n - 1] = tmp;
		}
	}
}

function factorial(n) {
	let f = 1;
	for (let i = 2; i <= n; i++) f *= i;
	return f;
}

export function findBestOrder(att, def, cfg, onProgress) {
	if (att.length < 2) return { perm: att.slice(), score: -Infinity };
	const work = att.slice();
	let bestScore = -Infinity;
	let bestPerm = att.slice();
	const total = factorial(work.length);
	const reportEvery = Math.max(1, Math.floor(total / 100));
	let count = 0;
	heapsPerm(work, work.length, (perm) => {
		const { attList, defList } = simulate(perm, def, cfg);
		const score = scoreOutcome(perm, def, attList, defList);
		if (score > bestScore) {
			bestScore = score;
			bestPerm = perm.slice();
		}
		count++;
		if (onProgress && count % reportEvery === 0) onProgress(count / total);
	});
	if (onProgress) onProgress(1);
	return { perm: bestPerm, score: bestScore };
}

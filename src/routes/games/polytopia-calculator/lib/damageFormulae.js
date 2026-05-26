export function calculateAttackForce(attack, health, maxHealth) {
	return attack * (health / maxHealth);
}

export function calculateDefenceForce(defense, health, maxHealth, defenseBonus) {
	return defense * (health / maxHealth) * defenseBonus;
}

export function calculateTotalDamage(attackForce, defenseForce) {
	return attackForce + defenseForce;
}

export function calculateAttackResult(attackForce, totalDamage, attack) {
	return Math.round((attackForce / totalDamage) * attack * 4.5);
}

export function calculateAttackSplash(attackForce, totalDamage, attack) {
	return calculateAttackResult(attackForce, totalDamage, attack) / 2;
}

export function calculateDefenseResult(defenseForce, totalDamage, defense) {
	return Math.round((defenseForce / totalDamage) * defense * 4.5);
}

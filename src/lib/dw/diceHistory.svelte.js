let history = $state([]);

export const diceHistory = {
	get entries() { return history; },
	add(entry) {
		history = [entry, ...history].slice(0, 20);
	}
};

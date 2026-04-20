// Global undo stack for monster HP changes across all MonsterStatblock instances.
// Each entry is a callback that restores the previous HP value.

let stack = $state([]);

export const monsterUndo = {
	push(undoFn) {
		stack = [...stack, undoFn];
	},
	pop() {
		if (!stack.length) return false;
		const fn = stack[stack.length - 1];
		stack = stack.slice(0, -1);
		fn();
		return true;
	},
	get length() {
		return stack.length;
	},
};

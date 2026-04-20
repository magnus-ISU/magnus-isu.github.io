let statblock = $state(false);
let desc = $state(false);

// h1 / Expand All button — toggles both statblock and description expansion
export const globalExpand = {
	get value() { return statblock; },
	toggle() { statblock = !statblock; desc = statblock; },
};

// Clicking a description — toggles only description expansion
export const descExpanded = {
	get value() { return desc; },
	toggle() { desc = !desc; },
};

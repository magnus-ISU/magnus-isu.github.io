import { browser } from '$app/environment';

const STORAGE_KEY = 'dw-character-sheet';
const SLOTS_KEY = 'dw-character-slots';
const ACTIVE_KEY = 'dw-character-active';

function loadSlots() {
	if (!browser) return [''];
	try {
		const raw = localStorage.getItem(SLOTS_KEY);
		if (raw) {
			const arr = JSON.parse(raw);
			if (Array.isArray(arr) && arr.length > 0) return arr;
		}
		// Migrate from old single-sheet key
		const legacy = localStorage.getItem(STORAGE_KEY) ?? '';
		const slots = [legacy];
		localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
		return slots;
	} catch {
		return [''];
	}
}

function loadActive() {
	if (!browser) return 0;
	try {
		const v = localStorage.getItem(ACTIVE_KEY);
		return v !== null ? +v : 0;
	} catch {
		return 0;
	}
}

function saveSlots(slots) {
	if (!browser) return;
	try {
		localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
	} catch {
		/* ignore */
	}
}

function saveActive(idx) {
	if (!browser) return;
	try {
		localStorage.setItem(ACTIVE_KEY, String(idx));
	} catch {
		/* ignore */
	}
}

const slots = $state(loadSlots());
let activeIdx = $state(loadActive());

// Clamp active index
if (activeIdx >= slots.length) activeIdx = 0;

// Always open index 0 on startup — but keep stored index for the tab highlight
// (The user said "always open character index 1" meaning the first one)
activeIdx = 0;

export const characterSheet = {
	get value() {
		return slots[activeIdx] ?? '';
	},
	set value(v) {
		slots[activeIdx] = v;
		saveSlots(slots);
		// Also keep legacy key in sync for the layout's charImage
		if (browser) {
			try {
				localStorage.setItem(STORAGE_KEY, v);
			} catch {
				/* ignore */
			}
		}
	},
	get isEmpty() {
		return !(slots[activeIdx] ?? '').trim();
	},

	get activeIndex() {
		return activeIdx;
	},
	get slotCount() {
		return slots.length;
	},

	/** Get the name from a slot's first line */
	slotName(i) {
		const line0 = (slots[i] ?? '').split('\n')[0]?.trim() || '';
		const comma = line0.indexOf(',');
		return (comma >= 0 ? line0.slice(0, comma).trim() : line0) || '';
	},

	/** Switch to a different slot */
	switchTo(i) {
		if (i < 0 || i >= slots.length) return;
		activeIdx = i;
		saveActive(i);
		// Sync legacy key
		if (browser) {
			try {
				localStorage.setItem(STORAGE_KEY, slots[i] ?? '');
			} catch {
				/* ignore */
			}
		}
	},

	/** Add a new empty slot and switch to it */
	addSlot() {
		slots.push('');
		const newIdx = slots.length - 1;
		activeIdx = newIdx;
		saveActive(newIdx);
		saveSlots(slots);
		if (browser) {
			try {
				localStorage.setItem(STORAGE_KEY, '');
			} catch {
				/* ignore */
			}
		}
	},

	/** Delete a slot (cannot delete last one) */
	deleteSlot(i) {
		if (slots.length <= 1) return;
		slots.splice(i, 1);
		if (activeIdx >= slots.length) activeIdx = slots.length - 1;
		else if (activeIdx > i) activeIdx--;
		saveActive(activeIdx);
		saveSlots(slots);
		if (browser) {
			try {
				localStorage.setItem(STORAGE_KEY, slots[activeIdx] ?? '');
			} catch {
				/* ignore */
			}
		}
	},
};

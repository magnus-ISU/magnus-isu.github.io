// The app's one document store (see sync/docStore.js), made reactive: reading
// through `docs()` subscribes the caller to every change, whether it came from
// an edit here, a pull from Drive or another tab.
import { browser } from '$app/environment';
import { createDocStore, memoryStorage } from '$lib/sync/docStore.js';

let version = $state(0);

export const docStore = createDocStore({ storage: browser ? localStorage : memoryStorage() });

docStore.onChange = () => {
	version++;
};

export function docs() {
	void version;
	return docStore;
}

if (browser) {
	window.addEventListener('storage', (e) => {
		if (e.storageArea === localStorage) docStore.handleStorageKey(e.key);
	});
	// Nothing typed may still be waiting on the write debounce when the page
	// goes away.
	window.addEventListener('pagehide', () => docStore.flush());
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) docStore.flush();
	});
}

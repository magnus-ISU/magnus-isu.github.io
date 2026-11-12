// Decides when to sync with Drive and reports how it is going. What a sync
// does is in sync/engine.js; where the documents live is sync/docStore.js.
//
// The browser's copy is always the working copy. Connecting Drive adds a sync
// loop on top of it; disconnecting just stops the loop.
import { browser } from '$app/environment';
import { docStore, docs } from '$lib/dw/docs.svelte.js';
import { createSyncEngine } from '$lib/sync/engine.js';
import { KINDS } from '$lib/sync/kinds.js';
import { googleAuth } from './auth.svelte.js';
import { createDrive } from './drive.js';

const EDIT_DEBOUNCE_MS = 2000; // quiet time after typing before uploading
const EDIT_MAX_WAIT_MS = 15_000; // …but never hold edits back longer than this
const POLL_MS = 30_000; // how often to look for other devices' changes
const RENEW_BEFORE_MS = 5 * 60_000; // renew the sign-in this long before it lapses
const RETRY_MIN_MS = 5000;
const RETRY_MAX_MS = 5 * 60_000;
const LOCK_NAME = 'dw-drive-sync';

// Names this device in conflict copies ("conflict 2026-11-11 14.02 Firefox Linux").
function deviceName() {
	if (!browser) return '';
	const ua = navigator.userAgent;
	const app = /Edg\//.test(ua)
		? 'Edge'
		: /Firefox\//.test(ua)
			? 'Firefox'
			: /Chrome\//.test(ua)
				? 'Chrome'
				: /Safari\//.test(ua)
					? 'Safari'
					: 'Browser';
	const os = /Android/.test(ua)
		? 'Android'
		: /iPhone|iPad/.test(ua)
			? 'iOS'
			: /Windows/.test(ua)
				? 'Windows'
				: /Mac OS X/.test(ua)
					? 'Mac'
					: /Linux/.test(ua)
						? 'Linux'
						: '';
	return os ? `${app} ${os}` : app;
}

const engine = createSyncEngine({
	drive: createDrive(() => googleAuth.token),
	store: docStore,
	kinds: KINDS,
	device: deviceName(),
});

let syncing = $state(false);
// What is stopping us, if anything: '' | 'auth' | 'offline' | 'error'
let problem = $state('');
let problemDetail = $state('');
let lastSynced = $state(null);

let running = false;
let rerun = false;
let timer = null;
let firstEditAt = 0;
let retryMs = 0;
let started = false;
let renewArmed = false;
// A renewal popup failed (blocked or closed). Don't keep opening popups at
// the user; wait until they click the Drive button themselves.
let renewGaveUp = false;
let lastRunAt = 0;

const enabled = () => docs().drive().enabled;

function schedule(ms) {
	clearTimeout(timer);
	timer = setTimeout(() => {
		timer = null;
		run();
	}, ms);
}

// Only one tab talks to Drive at a time; the others wait their turn and then
// start from whatever the previous one stored.
function withLock(fn) {
	return navigator.locks ? navigator.locks.request(LOCK_NAME, fn) : fn();
}

function isTransient(err) {
	if (!err || typeof err.status !== 'number') return true; // fetch itself failed
	if (err.status === 429 || err.status >= 500) return true;
	return err.status === 403 && /rateLimit/i.test(err.reason || '');
}

async function run() {
	if (!browser || !docStore.drive().enabled) return;
	if (running) {
		rerun = true;
		return;
	}
	if (!googleAuth.token) {
		problem = 'auth';
		armRenewal();
		return;
	}
	running = true;
	syncing = true;
	firstEditAt = 0;
	lastRunAt = Date.now();
	let next = null;
	try {
		const result = await withLock(() => engine.syncOnce());
		problem = '';
		problemDetail = '';
		retryMs = 0;
		lastSynced = new Date();
		// Something was typed while we were busy.
		if (result.unsynced) next = EDIT_DEBOUNCE_MS;
	} catch (err) {
		if (err?.status === 401) {
			googleAuth.expire();
			problem = 'auth';
			armRenewal();
		} else {
			problem = isTransient(err) ? 'offline' : 'error';
			problemDetail = err?.message || String(err);
			if (problem === 'error') console.error('[drive sync]', err);
			retryMs = Math.min(RETRY_MAX_MS, Math.max(RETRY_MIN_MS, retryMs * 2));
			next = retryMs;
		}
	} finally {
		running = false;
		syncing = false;
	}
	if (rerun) {
		rerun = false;
		next = 0;
	}
	if (next !== null && !timer) schedule(next);
}

// Renewing the sign-in needs a popup, and a popup needs a click. So the next
// click anywhere on the page renews it — typing never does.
function armRenewal() {
	if (renewArmed || renewGaveUp || !browser) return;
	renewArmed = true;
	document.addEventListener('click', onClickRenew, { capture: true, once: true });
}

async function onClickRenew() {
	renewArmed = false;
	if (!docStore.drive().enabled || googleAuth.expiresIn > RENEW_BEFORE_MS) return;
	if (await googleAuth.signIn()) {
		problem = '';
		run();
	} else {
		renewGaveUp = true;
		if (!googleAuth.token) problem = 'auth';
	}
}

function tick() {
	if (!docStore.drive().enabled) return;
	if (googleAuth.expiresIn < RENEW_BEFORE_MS) armRenewal();
	if (!document.hidden) run();
}

// The page came back into view: look for changes now rather than at the next
// poll — unless we only just did (focus and visibility often fire together).
function wake() {
	if (Date.now() - lastRunAt > 3000) run();
}

docStore.onLocalEdit = () => {
	if (!browser || !docStore.drive().enabled) return;
	const now = Date.now();
	firstEditAt ||= now;
	schedule(Math.max(0, Math.min(EDIT_DEBOUNCE_MS, firstEditAt + EDIT_MAX_WAIT_MS - now)));
};

export const driveSync = {
	get enabled() {
		return enabled();
	},
	// 'off' | 'auth' | 'syncing' | 'offline' | 'error' | 'saving' | 'synced'
	get status() {
		if (!enabled()) return 'off';
		if (problem === 'auth') return 'auth';
		if (syncing) return 'syncing';
		if (problem) return problem;
		return docs().hasUnsynced(KINDS) ? 'saving' : 'synced';
	},
	get detail() {
		return problemDetail;
	},
	get lastSynced() {
		return lastSynced;
	},
	get notices() {
		return docs().drive().notices;
	},

	// Call once the page is up: starts the background loop.
	start() {
		if (!browser || started) return;
		started = true;
		setInterval(tick, POLL_MS);
		document.addEventListener('visibilitychange', () => {
			if (!document.hidden) wake();
		});
		window.addEventListener('focus', wake);
		window.addEventListener('online', () => run());
		if (docStore.drive().enabled) {
			googleAuth.prepare();
			run();
		}
	},

	// Sign in and start syncing. Must be called from a click.
	async connect() {
		renewGaveUp = false;
		if (!googleAuth.token && !(await googleAuth.signIn())) {
			if (docStore.drive().enabled) problem = 'auth';
			return false;
		}
		// A different account than last time: nothing here belongs to a file
		// there, so everything is uploaded to it as new.
		const account = googleAuth.email;
		const previous = docStore.drive().account;
		if (account && previous && account !== previous) docStore.unlinkAll();
		docStore.setDrive({ enabled: true, ...(account ? { account } : {}) });
		problem = '';
		run();
		return true;
	},

	// Stop syncing. Everything stays in this browser, and stays on Drive.
	disconnect() {
		clearTimeout(timer);
		timer = null;
		docStore.setDrive({ enabled: false });
		googleAuth.signOut();
		problem = '';
		problemDetail = '';
	},

	// The Drive button: sync now, or sign in again if that is what it needs.
	syncNow() {
		if (!docStore.drive().enabled) return;
		if (!googleAuth.token) return this.connect();
		retryMs = 0;
		return run();
	},

	dismissNotice(id) {
		docStore.dismissNotice(id);
	},

	// "This conflict is dealt with": drop the label from the copy, which
	// renames its file back to the plain character name.
	resolveConflict(notice) {
		const doc = docStore.get(notice.docId);
		if (doc?.conflict) {
			docStore.patch(doc.id, { conflict: '', metaDirty: true });
			docStore.onLocalEdit();
		}
		docStore.dismissNotice(notice.id);
	},
};

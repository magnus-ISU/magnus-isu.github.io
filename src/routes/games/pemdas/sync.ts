// Google Drive sync for the PEMDAS Blaster save, working like Dungeon World's:
// connect once, then it uploads after changes, polls for other devices'
// changes, and renews the sign-in on your next click when it lapses.
//
// The whole save is one JSON file in a "PEMDAS Blaster" Drive folder. When
// both this browser and Drive changed since the last sync, the merge keeps the
// best value of everything (most money, items, stars, best records, ...).
import { googleAuth } from '$lib/google/auth.svelte.js';
import { createDrive } from '$lib/google/drive.js';
import {
	ARMOR,
	type Attempt,
	attemptScore,
	freshSave,
	ITEM_CAP,
	persistLocal,
	type Save,
} from './save';

const STATE_KEY = 'pemdas-drive-v1';
const DEBOUNCE_MS = 2000;
const POLL_MS = 30_000;
const RENEW_BEFORE_MS = 5 * 60_000;
const RETRY_MIN_MS = 5000;
const RETRY_MAX_MS = 5 * 60_000;
const MIME = 'application/json';
const FILE_NAME = 'PEMDAS Blaster save.json';

type SyncState = {
	enabled: boolean;
	account?: string;
	fileId?: string;
	rev?: string;
	/** the save as it was at the last sync, for three-way merges */
	base?: string;
};
export type DriveStatus = 'off' | 'auth' | 'syncing' | 'offline' | 'error' | 'saving' | 'synced';

const drive = createDrive(() => googleAuth.token, {
	app: 'pemdas-blaster',
	folderName: 'PEMDAS Blaster',
});

function loadState(): SyncState {
	try {
		return JSON.parse(localStorage.getItem(STATE_KEY) || '') || { enabled: false };
	} catch {
		return { enabled: false };
	}
}
function saveState() {
	try {
		localStorage.setItem(STATE_KEY, JSON.stringify(st));
	} catch {}
}

/** two saves that both changed: keep the best value of everything */
export function mergeSaves(_base: Save | null, mine: Save, theirs: Save): Save {
	const out: Save = structuredClone(theirs);
	out.money = Math.max(mine.money, theirs.money);
	for (const k of Object.keys(out.items) as (keyof Save['items'])[])
		out.items[k] = Math.min(ITEM_CAP, Math.max(mine.items[k] ?? 0, theirs.items[k] ?? 0));
	out.armor = {
		owned: Math.min(ARMOR.length, Math.max(mine.armor.owned, theirs.armor.owned)),
		// wear the best armor either side was wearing
		on: Math.max(mine.armor.on, theirs.armor.on),
	};
	// owned on either side; switched on if either side has it on
	for (const [k, on] of Object.entries(mine.upgrades)) {
		const key = k as keyof Save['upgrades'];
		out.upgrades[key] = !!on || !!theirs.upgrades[key];
	}
	for (const [k, v] of Object.entries(mine.stars)) out.stars[k] = Math.max(v, out.stars[k] ?? 0);
	for (const [k, v] of Object.entries(mine.endlessBest))
		out.endlessBest[k] = Math.max(v, out.endlessBest[k] ?? 0);
	for (const [k, rec] of Object.entries(mine.records)) {
		const other = out.records[k];
		const endless = k.endsWith(':endless');
		const better = (a: Attempt, b: Attempt) =>
			attemptScore(a, endless) >= attemptScore(b, endless) ? a : b;
		out.records[k] = other
			? { last: better(rec.last, other.last), best: better(rec.best, other.best) }
			: rec;
	}
	return out;
}

let st: SyncState = { enabled: false };
let getSave: () => Save = freshSave;
let applyRemote: (s: Save) => void = () => {};
let status: Exclude<DriveStatus, 'off' | 'saving' | 'synced'> | '' = '';
let detail = '';
let lastSynced: Date | null = null;
let running = false;
let rerun = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let retryMs = 0;
let started = false;
let renewArmed = false;
let renewGaveUp = false;
let lastRunAt = 0;

const parse = (text: string | undefined): Save | null => {
	if (!text) return null;
	try {
		return { ...freshSave(), ...JSON.parse(text) };
	} catch {
		return null;
	}
};
const text = (s: Save) => JSON.stringify(s);

function schedule(ms: number) {
	if (timer) clearTimeout(timer);
	timer = setTimeout(() => {
		timer = null;
		run();
	}, ms);
}

function withLock<T>(fn: () => Promise<T>): Promise<T> {
	return navigator.locks ? navigator.locks.request('pemdas-drive-sync', fn) : fn();
}

function isTransient(err: { status?: number; reason?: string } | undefined) {
	if (!err || typeof err.status !== 'number') return true;
	if (err.status === 429 || err.status >= 500) return true;
	return err.status === 403 && /rateLimit/i.test(err.reason || '');
}

/** make this browser and Drive agree */
async function syncOnce() {
	const local = getSave();
	const localText = text(local);
	const base = parse(st.base);
	let remoteFile = st.fileId ? await drive.stat(st.fileId) : null;
	if (remoteFile?.trashed) remoteFile = null;
	if (!remoteFile) {
		// first sync on this account, or the file went away: adopt the oldest existing one
		const files = (await drive.list()).filter((f: { kind: string }) => f.kind === 'save');
		files.sort((a: { createdTime: string }, c: { createdTime: string }) =>
			a.createdTime.localeCompare(c.createdTime),
		);
		remoteFile = files[0] ?? null;
		st.rev = undefined;
	}
	if (!remoteFile) {
		const made = await drive.create({
			name: FILE_NAME,
			text: localText,
			mime: MIME,
			kind: 'save',
			docId: 'save',
			conflict: '',
		});
		Object.assign(st, { fileId: made.id, rev: made.rev, base: localText });
		return;
	}
	st.fileId = remoteFile.id;
	if (remoteFile.rev === st.rev) {
		// Drive unchanged: upload ours if we changed anything
		if (localText !== st.base) {
			const w = await drive.write(remoteFile.id, localText, MIME);
			Object.assign(st, { rev: w.rev, base: localText });
		}
		return;
	}
	const { text: remoteText, rev } = await drive.read(remoteFile.id, remoteFile.rev);
	const remote = parse(remoteText) ?? freshSave();
	const merged = localText === st.base ? remote : mergeSaves(base, local, remote);
	// edits made while we were downloading win: try again on the next run
	if (text(getSave()) !== localText) {
		rerun = true;
		return;
	}
	const mergedText = text(merged);
	applyRemote(merged);
	persistLocal(merged);
	if (mergedText !== remoteText) {
		const w = await drive.write(remoteFile.id, mergedText, MIME);
		Object.assign(st, { rev: w.rev, base: mergedText });
	} else Object.assign(st, { rev, base: mergedText });
}

async function run() {
	if (!st.enabled) return;
	if (running) {
		rerun = true;
		return;
	}
	if (!googleAuth.token) {
		status = 'auth';
		armRenewal();
		return;
	}
	running = true;
	status = 'syncing';
	lastRunAt = Date.now();
	let next: number | null = null;
	try {
		await withLock(syncOnce);
		saveState();
		status = '';
		detail = '';
		retryMs = 0;
		lastSynced = new Date();
	} catch (e) {
		const err = e as { status?: number; reason?: string; message?: string };
		if (err?.status === 401) {
			googleAuth.expire();
			status = 'auth';
			armRenewal();
		} else {
			status = isTransient(err) ? 'offline' : 'error';
			detail = err?.message || String(err);
			if (status === 'error') console.error('[pemdas drive sync]', err);
			retryMs = Math.min(RETRY_MAX_MS, Math.max(RETRY_MIN_MS, retryMs * 2));
			next = retryMs;
		}
	} finally {
		running = false;
		if (status === 'syncing') status = '';
	}
	if (rerun) {
		rerun = false;
		next = 0;
	}
	if (next !== null && !timer) schedule(next);
}

// renewing needs a popup, and a popup needs a click: the next tap anywhere renews it
function armRenewal() {
	if (renewArmed || renewGaveUp) return;
	renewArmed = true;
	document.addEventListener('pointerdown', onClickRenew, { capture: true, once: true });
}
async function onClickRenew() {
	renewArmed = false;
	if (!st.enabled || googleAuth.expiresIn > RENEW_BEFORE_MS) return;
	if (await googleAuth.signIn()) {
		status = '';
		run();
	} else {
		renewGaveUp = true;
		if (!googleAuth.token) status = 'auth';
	}
}

export const pemdasSync = {
	get enabled() {
		return st.enabled;
	},
	get status(): DriveStatus {
		if (!st.enabled) return 'off';
		if (status) return status;
		return text(getSave()) !== st.base ? 'saving' : 'synced';
	},
	get detail() {
		return detail;
	},
	get lastSynced() {
		return lastSynced;
	},
	get account() {
		const a = googleAuth.email;
		return a.endsWith('@gmail.com') ? a.slice(0, -10) : a;
	},

	/** call once: `get` reads the current save, `apply` replaces it after a download */
	start(get: () => Save, apply: (s: Save) => void) {
		getSave = get;
		applyRemote = apply;
		if (started) return;
		started = true;
		st = loadState();
		setInterval(() => {
			if (!st.enabled) return;
			if (googleAuth.expiresIn < RENEW_BEFORE_MS) armRenewal();
			if (!document.hidden) run();
		}, POLL_MS);
		const wake = () => Date.now() - lastRunAt > 3000 && run();
		document.addEventListener('visibilitychange', () => !document.hidden && wake());
		window.addEventListener('focus', wake);
		window.addEventListener('online', () => run());
		// load Google's script now so a later tap can open the sign-in popup immediately
		googleAuth.prepare();
		if (st.enabled) run();
	},

	/** the save changed locally */
	changed() {
		if (st.enabled) schedule(DEBOUNCE_MS);
	},

	/** sign in and start syncing; must be called from a tap/click */
	async connect() {
		renewGaveUp = false;
		if (!googleAuth.token && !(await googleAuth.signIn())) {
			if (st.enabled) status = 'auth';
			return false;
		}
		const account = googleAuth.email;
		// a different account: nothing here belongs to a file there
		if (account && st.account && account !== st.account) st = { enabled: true };
		st.enabled = true;
		if (account) st.account = account;
		saveState();
		status = '';
		run();
		return true;
	},

	/** stop syncing; the save stays here and on Drive */
	disconnect() {
		if (timer) clearTimeout(timer);
		timer = null;
		st.enabled = false;
		saveState();
		googleAuth.signOut();
		status = '';
		detail = '';
	},

	/** the Drive button: sync now, or sign in again if that's what it needs */
	syncNow() {
		if (!st.enabled) return this.connect();
		if (!googleAuth.token) return this.connect();
		retryMs = 0;
		return run();
	},
};

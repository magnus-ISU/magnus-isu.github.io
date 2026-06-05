import { browser } from '$app/environment';
import { googleAuth } from './auth.svelte.js';
import {
	findOrCreateFolder,
	findFile,
	createFile,
	readFile,
	updateFile,
	getFileModifiedTime,
} from './drive.js';

const FOLDER_NAME = 'eldritch-arts';
const FILE_NAME = 'dungeon-world-data.json';
const FILE_ID_KEY = 'google-drive-file-id';
const MODE_KEY = 'storage-mode';
const LOCAL_PREFIX = 'local-backup-';
// Causal sync state: `dirty` says we have local edits not yet pushed since
// `baseModifiedTime`, which is the server modifiedTime we last fully synced to.
// Comparing server.modifiedTime to baseModifiedTime gives an unambiguous answer
// ("did the server move past where I left off?") that does not depend on a
// wall-clock comparison between client and server.
const DIRTY_KEY = 'drive-dirty';
const BASE_MOD_KEY = 'drive-base-modified';
// Minimum gap between escalated sign-in popups so we don't spam the user.
const REAUTH_PROMPT_INTERVAL_MS = 30_000;

let registeredKeys = [];
let fileId = $state(browser ? localStorage.getItem(FILE_ID_KEY) : null);
let folderId = null;
let syncStatus = $state('idle');
let lastSynced = $state(null);
let saveTimeout = null;
let waiting = $state(false);
let listeners = [];
let mode = $state(browser ? (localStorage.getItem(MODE_KEY) || 'local') : 'local');
let storageDebounce = null;
let storageListener = null;
let dirty = browser ? localStorage.getItem(DIRTY_KEY) === '1' : false;
let baseModifiedTime = browser ? localStorage.getItem(BASE_MOD_KEY) : null;
let reauthInFlight = null;
let lastReauthPromptAt = 0;
let conflictNotice = $state(null);

function notifyConflict({ base, server }) {
	conflictNotice = { base, server, at: new Date() };
}

function dropDirty() {
	dirty = false;
	try { localStorage.removeItem(DIRTY_KEY); } catch {}
}

function markDirty() {
	if (dirty) return;
	dirty = true;
	try { localStorage.setItem(DIRTY_KEY, '1'); } catch {}
}

function markClean(modifiedTime) {
	dirty = false;
	if (modifiedTime) baseModifiedTime = modifiedTime;
	try {
		localStorage.removeItem(DIRTY_KEY);
		if (baseModifiedTime) localStorage.setItem(BASE_MOD_KEY, baseModifiedTime);
	} catch {}
}

function resetSyncState() {
	dirty = false;
	baseModifiedTime = null;
	try {
		localStorage.removeItem(DIRTY_KEY);
		localStorage.removeItem(BASE_MOD_KEY);
	} catch {}
}

async function tryReauth({ promptUser }) {
	if (reauthInFlight) return reauthInFlight;
	reauthInFlight = (async () => {
		if (googleAuth.isSignedIn) return true;
		try {
			if (googleAuth.wasConnected) {
				const ok = await googleAuth.refreshToken();
				if (ok) return true;
			}
		} catch {}
		if (!promptUser) return false;
		const now = Date.now();
		if (now - lastReauthPromptAt < REAUTH_PROMPT_INTERVAL_MS) return false;
		lastReauthPromptAt = now;
		try {
			await googleAuth.signIn();
		} catch {}
		return googleAuth.isSignedIn;
	})();
	try {
		return await reauthInFlight;
	} finally {
		reauthInFlight = null;
	}
}

async function withRetry(fn) {
	try {
		return await fn();
	} catch (err) {
		if (err.status === 401 || err.status === 403) {
			const ok = await tryReauth({ promptUser: true });
			if (ok) return fn();
		}
		throw err;
	}
}

async function ensureFile(seedData) {
	const token = googleAuth.token;
	if (!token) return null;

	if (fileId) return fileId;

	if (!folderId) {
		folderId = await withRetry(() => findOrCreateFolder(token, FOLDER_NAME));
	}

	const existing = await withRetry(() => findFile(token, FILE_NAME, folderId));
	if (existing) {
		fileId = existing.id;
		// Attaching to an existing remote file: its current modifiedTime becomes
		// our reference. `dirty` is preserved — any prior local edits are still
		// edits relative to this newly-discovered base.
		baseModifiedTime = existing.modifiedTime;
		try { localStorage.setItem(BASE_MOD_KEY, baseModifiedTime); } catch {}
	} else {
		const initial = seedData || {};
		const result = await withRetry(() => createFile(token, FILE_NAME, folderId, initial));
		fileId = result.id;
		// We just wrote the seed; the server and local are in sync.
		markClean(result.modifiedTime);
	}

	try { localStorage.setItem(FILE_ID_KEY, fileId); } catch {}
	return fileId;
}

function snapshotLocal() {
	for (const key of registeredKeys) {
		try {
			const val = localStorage.getItem(key);
			if (val !== null) localStorage.setItem(LOCAL_PREFIX + key, val);
			else localStorage.removeItem(LOCAL_PREFIX + key);
		} catch {}
	}
}

function restoreLocal() {
	const changed = [];
	for (const key of registeredKeys) {
		try {
			const backup = localStorage.getItem(LOCAL_PREFIX + key);
			const current = localStorage.getItem(key);
			if (backup !== null) {
				localStorage.setItem(key, backup);
				if (current !== backup) changed.push(key);
			} else {
				localStorage.removeItem(key);
				if (current !== null) changed.push(key);
			}
		} catch {}
	}
	return changed;
}

function notifyListeners(changedKeys) {
	for (const fn of listeners) {
		try { fn(changedKeys); } catch {}
	}
}

function collectLocalData() {
	const data = {};
	for (const key of registeredKeys) {
		try {
			const val = localStorage.getItem(key);
			if (val !== null) data[key] = val;
		} catch {}
	}
	return data;
}

export const driveSync = {
	get status() { return waiting ? 'waiting' : syncStatus; },
	get lastSynced() { return lastSynced; },
	get mode() { return mode; },
	get isDrive() { return mode === 'drive'; },
	get conflictNotice() { return conflictNotice; },
	dismissConflict() { conflictNotice = null; },

	registerKey(key) {
		if (!registeredKeys.includes(key)) registeredKeys.push(key);
	},

	onKeysChanged(fn) {
		listeners.push(fn);
		return () => { listeners = listeners.filter((f) => f !== fn); };
	},

	save(key, value) {
		if (!browser) return;
		let prev = null;
		try { prev = localStorage.getItem(key); } catch {}
		try { localStorage.setItem(key, value); } catch {}
		if (prev !== value) markDirty();
		if (mode !== 'drive') return;
		if (googleAuth.isSignedIn) {
			this.schedulePush();
		} else {
			// Verify the session by trying a silent refresh; escalate to a popup
			// if that fails. Throttled inside tryReauth so we don't spam dialogs.
			tryReauth({ promptUser: true }).then((ok) => {
				if (ok) this.schedulePush();
			});
		}
	},

	load(key) {
		if (!browser) return null;
		try { return localStorage.getItem(key); } catch { return null; }
	},

	schedulePush() {
		if (!googleAuth.isSignedIn || mode !== 'drive') return;
		if (saveTimeout) clearTimeout(saveTimeout);
		waiting = true;
		this.checkRemoteUpdates();
		saveTimeout = setTimeout(() => {
			saveTimeout = null;
			waiting = false;
			this.pushToDrive();
		}, 10000);
	},

	// Cheap fetch of just the server's modifiedTime. If the server is unchanged,
	// nothing to do. If it moved, pull — conflict (dirty + server moved) is
	// resolved server-wins, with a modal notification.
	async checkRemoteUpdates() {
		if (!googleAuth.isSignedIn || !fileId) return;
		try {
			const modified = await withRetry(() => getFileModifiedTime(googleAuth.token, fileId));
			if (modified === baseModifiedTime) return;
			if (saveTimeout) {
				clearTimeout(saveTimeout);
				saveTimeout = null;
				waiting = false;
			}
			await this.pullFromDrive();
		} catch {}
	},

	async pushToDrive() {
		if (!googleAuth.isSignedIn || mode !== 'drive') return;
		if (!dirty) {
			syncStatus = 'idle';
			return;
		}
		syncStatus = 'syncing';
		try {
			const id = await ensureFile();
			if (!id) return;

			const serverModified = await withRetry(() => getFileModifiedTime(googleAuth.token, id));
			if (baseModifiedTime && serverModified !== baseModifiedTime) {
				// Server moved since our last sync and we have local edits.
				// Policy: server wins. Drop local edits and pull, surfacing a
				// modal so the user knows their unpushed changes were discarded.
				console.warn(
					'[driveSync] Conflict on push: remote changed since last sync ' +
					`(base=${baseModifiedTime}, server=${serverModified}). Server wins.`,
				);
				notifyConflict({ base: baseModifiedTime, server: serverModified });
				dropDirty();
				syncStatus = 'idle';
				await this.pullFromDrive();
				return;
			}

			const result = await withRetry(() => updateFile(googleAuth.token, id, collectLocalData()));
			markClean(result.modifiedTime);
			lastSynced = new Date();
			syncStatus = 'idle';
		} catch (err) {
			if (err.status === 404) {
				fileId = null;
				folderId = null;
				baseModifiedTime = null;
				try { localStorage.removeItem(FILE_ID_KEY); } catch {}
				try { localStorage.removeItem(BASE_MOD_KEY); } catch {}
				await this.pushToDrive();
				return;
			}
			console.error('Drive push failed:', err);
			syncStatus = 'error';
		}
	},

	async pullFromDrive() {
		if (!googleAuth.isSignedIn || mode !== 'drive') return;
		syncStatus = 'syncing';
		try {
			const id = await ensureFile();
			if (!id) return;

			const modified = await withRetry(() => getFileModifiedTime(googleAuth.token, id));

			// Server unchanged since our last sync.
			if (modified === baseModifiedTime) {
				if (dirty) {
					// Local has edits, server has nothing new — push.
					syncStatus = 'idle';
					await this.pushToDrive();
					return;
				}
				syncStatus = 'idle';
				return;
			}

			// Server has moved past our base. If we also have local edits, that's
			// a real conflict — both sides changed since last sync. Policy:
			// server wins. Drop dirty so the pull below applies cleanly, and
			// surface a modal so the user can see their work was overwritten.
			if (dirty) {
				console.warn(
					'[driveSync] Conflict on pull: both remote and local changed ' +
					`since last sync (base=${baseModifiedTime}, server=${modified}). ` +
					'Server wins.',
				);
				notifyConflict({ base: baseModifiedTime, server: modified });
				dropDirty();
			}

			// Clean pull.
			const data = await withRetry(() => readFile(googleAuth.token, id));
			const changedKeys = [];
			for (const key of registeredKeys) {
				if (key in data) {
					const current = localStorage.getItem(key);
					if (current !== data[key]) {
						localStorage.setItem(key, data[key]);
						changedKeys.push(key);
					}
				}
			}
			markClean(modified);
			lastSynced = new Date();
			syncStatus = 'idle';
			if (changedKeys.length > 0) notifyListeners(changedKeys);
		} catch (err) {
			if (err.status === 404) {
				fileId = null;
				folderId = null;
				baseModifiedTime = null;
				try { localStorage.removeItem(FILE_ID_KEY); } catch {}
				try { localStorage.removeItem(BASE_MOD_KEY); } catch {}
				syncStatus = 'idle';
				return;
			}
			console.error('Drive pull failed:', err);
			syncStatus = 'error';
		}
	},

	async switchToDrive() {
		if (mode === 'drive' && googleAuth.isSignedIn) return;
		const wasSignedIn = googleAuth.isSignedIn;
		if (!wasSignedIn) {
			await googleAuth.signIn();
			if (!googleAuth.isSignedIn) return;
		}

		// Switching modes resets the sync relationship. ensureFile() below will
		// re-establish a base by either attaching to an existing file or creating
		// a fresh one from the seed.
		fileId = null;
		folderId = null;
		resetSyncState();
		try { localStorage.removeItem(FILE_ID_KEY); } catch {}

		snapshotLocal();
		const seed = collectLocalData();

		mode = 'drive';
		try { localStorage.setItem(MODE_KEY, 'drive'); } catch {}

		await ensureFile(seed);
		await this.pullFromDrive();
	},

	async switchToLocal() {
		const hadPendingWrite = saveTimeout !== null;
		if (saveTimeout) {
			clearTimeout(saveTimeout);
			saveTimeout = null;
			waiting = false;
		}
		if (hadPendingWrite && googleAuth.isSignedIn && mode === 'drive' && dirty) {
			await this.pushToDrive();
		}
		mode = 'local';
		syncStatus = 'idle';
		waiting = false;
		lastSynced = null;
		resetSyncState();
		try { localStorage.setItem(MODE_KEY, 'local'); } catch {}
		const changed = restoreLocal();
		if (changed.length > 0) notifyListeners(changed);
	},

	async autoReconnect() {
		if (!browser || mode !== 'drive') return;
		if (googleAuth.isSignedIn) {
			await this.pullFromDrive();
			return;
		}
		// Try silent refresh first; if it fails, escalate to a sign-in popup
		// immediately so the user isn't left silently signed out.
		const ok = await tryReauth({ promptUser: true });
		if (ok) {
			await this.pullFromDrive();
		} else {
			syncStatus = 'error';
		}
	},

	handleVisibilityChange() {
		if (!browser) return;
		if (!document.hidden && googleAuth.isSignedIn && mode === 'drive') {
			this.pullFromDrive();
		}
	},

	startStorageListener() {
		if (storageListener) return;
		storageListener = (e) => {
			if (!e.key || !registeredKeys.includes(e.key)) return;
			if (e.oldValue === e.newValue) return;
			if (storageDebounce) clearTimeout(storageDebounce);
			storageDebounce = setTimeout(() => {
				storageDebounce = null;
				notifyListeners([e.key]);
			}, 500);
		};
		window.addEventListener('storage', storageListener);
	},

	stopStorageListener() {
		if (!storageListener) return;
		window.removeEventListener('storage', storageListener);
		storageListener = null;
		if (storageDebounce) {
			clearTimeout(storageDebounce);
			storageDebounce = null;
		}
	},
};

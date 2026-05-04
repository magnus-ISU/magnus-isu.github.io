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

let registeredKeys = [];
let fileId = $state(browser ? localStorage.getItem(FILE_ID_KEY) : null);
let folderId = null;
let syncStatus = $state('idle');
let lastSynced = $state(null);
let lastKnownModified = null;
let saveTimeout = null;
let waiting = $state(false);
let listeners = [];
let mode = $state(browser ? (localStorage.getItem(MODE_KEY) || 'local') : 'local');
let storageDebounce = null;
let storageListener = null;

async function withRetry(fn) {
	try {
		return await fn();
	} catch (err) {
		if (err.status === 401) {
			const ok = await googleAuth.refreshToken();
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
		lastKnownModified = existing.modifiedTime;
	} else {
		const initial = seedData || {};
		const result = await withRetry(() => createFile(token, FILE_NAME, folderId, initial));
		fileId = result.id;
		lastKnownModified = result.modifiedTime;
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

async function serverIsNewer() {
	if (!fileId || !lastKnownModified) return false;
	try {
		const modified = await withRetry(() => getFileModifiedTime(googleAuth.token, fileId));
		return modified !== lastKnownModified;
	} catch {
		return false;
	}
}

export const driveSync = {
	get status() { return waiting ? 'waiting' : syncStatus; },
	get lastSynced() { return lastSynced; },
	get mode() { return mode; },
	get isDrive() { return mode === 'drive'; },

	registerKey(key) {
		if (!registeredKeys.includes(key)) registeredKeys.push(key);
	},

	onKeysChanged(fn) {
		listeners.push(fn);
		return () => { listeners = listeners.filter((f) => f !== fn); };
	},

	save(key, value) {
		if (!browser) return;
		try { localStorage.setItem(key, value); } catch {}
		if (mode === 'drive' && googleAuth.isSignedIn) {
			this.schedulePush();
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
		this.checkAndPullIfNewer();
		saveTimeout = setTimeout(() => {
			saveTimeout = null;
			waiting = false;
			this.pushToDrive();
		}, 10000);
	},

	async checkAndPullIfNewer() {
		if (!googleAuth.isSignedIn || !fileId) return;
		try {
			if (await serverIsNewer()) {
				if (saveTimeout) {
					clearTimeout(saveTimeout);
					saveTimeout = null;
					waiting = false;
				}
				await this.pullFromDrive();
			}
		} catch {}
	},

	async pushToDrive() {
		if (!googleAuth.isSignedIn || mode !== 'drive') return;
		syncStatus = 'syncing';
		try {
			const id = await ensureFile();
			if (!id) return;

			if (await serverIsNewer()) {
				await this.pullFromDrive();
				return;
			}

			const data = {};
			for (const key of registeredKeys) {
				try {
					const val = localStorage.getItem(key);
					if (val !== null) data[key] = val;
				} catch {}
			}
			const result = await withRetry(() => updateFile(googleAuth.token, id, data));
			lastKnownModified = result.modifiedTime;
			lastSynced = new Date();
			syncStatus = 'idle';
		} catch (err) {
			if (err.status === 404) {
				fileId = null;
				folderId = null;
				lastKnownModified = null;
				try { localStorage.removeItem(FILE_ID_KEY); } catch {}
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
			if (modified === lastKnownModified) {
				syncStatus = 'idle';
				return;
			}

			const data = await withRetry(() => readFile(googleAuth.token, id));
			lastKnownModified = modified;

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

			lastSynced = new Date();
			syncStatus = 'idle';
			if (changedKeys.length > 0) notifyListeners(changedKeys);
		} catch (err) {
			if (err.status === 404) {
				fileId = null;
				folderId = null;
				lastKnownModified = null;
				try { localStorage.removeItem(FILE_ID_KEY); } catch {}
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

		fileId = null;
		folderId = null;
		lastKnownModified = null;
		try { localStorage.removeItem(FILE_ID_KEY); } catch {}

		snapshotLocal();

		const seed = {};
		for (const key of registeredKeys) {
			try {
				const val = localStorage.getItem(key);
				if (val !== null) seed[key] = val;
			} catch {}
		}

		mode = 'drive';
		try { localStorage.setItem(MODE_KEY, 'drive'); } catch {}

		await ensureFile(seed);
		lastKnownModified = null;
		await this.pullFromDrive();
	},

	async switchToLocal() {
		const hadPendingWrite = saveTimeout !== null;
		if (saveTimeout) {
			clearTimeout(saveTimeout);
			saveTimeout = null;
			waiting = false;
		}
		if (hadPendingWrite && googleAuth.isSignedIn && mode === 'drive') {
			await this.pushToDrive();
		}
		mode = 'local';
		syncStatus = 'idle';
		waiting = false;
		lastSynced = null;
		lastKnownModified = null;
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
		if (googleAuth.wasConnected) {
			try {
				const ok = await googleAuth.refreshToken();
				if (ok) {
					await this.pullFromDrive();
				} else {
					this.switchToLocal();
				}
			} catch {
				this.switchToLocal();
			}
		} else {
			this.switchToLocal();
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

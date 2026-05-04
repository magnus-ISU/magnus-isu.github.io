import { browser } from '$app/environment';
import { GOOGLE_CLIENT_ID } from './config.js';

const WAS_CONNECTED_KEY = 'google-drive-was-connected';
const TOKEN_KEY = 'google-drive-access-token';
const TOKEN_EXPIRY_KEY = 'google-drive-token-expiry';

let accessToken = $state(browser ? restoreToken() : null);
let tokenClient = null;
let gisLoaded = false;
let pendingResolve = null;

function restoreToken() {
	try {
		const token = localStorage.getItem(TOKEN_KEY);
		const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
		if (token && expiry && Date.now() < Number(expiry)) return token;
		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(TOKEN_EXPIRY_KEY);
	} catch {}
	return null;
}

function storeToken(token, expiresIn) {
	try {
		localStorage.setItem(TOKEN_KEY, token);
		localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresIn * 1000));
		localStorage.setItem(WAS_CONNECTED_KEY, 'true');
	} catch {}
}

function clearToken() {
	try {
		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(TOKEN_EXPIRY_KEY);
		localStorage.removeItem(WAS_CONNECTED_KEY);
	} catch {}
}

function loadGis() {
	if (gisLoaded) return Promise.resolve();
	return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.src = 'https://accounts.google.com/gsi/client';
		script.onload = () => {
			gisLoaded = true;
			resolve();
		};
		script.onerror = reject;
		document.head.appendChild(script);
	});
}

function initClient() {
	if (tokenClient) return;
	tokenClient = google.accounts.oauth2.initTokenClient({
		client_id: GOOGLE_CLIENT_ID,
		scope: 'https://www.googleapis.com/auth/drive.file',
		callback: (response) => {
			if (response.error) {
				accessToken = null;
				pendingResolve?.reject?.(new Error(response.error));
				pendingResolve = null;
				return;
			}
			accessToken = response.access_token;
			storeToken(response.access_token, response.expires_in || 3600);
			pendingResolve?.resolve?.();
			pendingResolve = null;
		},
	});
}

function requestToken(prompt) {
	return new Promise((resolve, reject) => {
		pendingResolve = { resolve, reject };
		tokenClient.requestAccessToken({ prompt });
	});
}

export const googleAuth = {
	get token() {
		return accessToken;
	},
	get isSignedIn() {
		return accessToken !== null;
	},
	get wasConnected() {
		if (!browser) return false;
		try { return localStorage.getItem(WAS_CONNECTED_KEY) === 'true'; } catch { return false; }
	},

	async signIn() {
		await loadGis();
		initClient();
		await requestToken('consent');
	},

	async refreshToken() {
		await loadGis();
		initClient();
		try {
			await requestToken('');
			return true;
		} catch {
			return false;
		}
	},

	signOut() {
		if (accessToken) {
			try { google.accounts.oauth2.revoke(accessToken); } catch {}
		}
		accessToken = null;
		tokenClient = null;
		clearToken();
	},
};

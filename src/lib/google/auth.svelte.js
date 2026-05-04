import { browser } from '$app/environment';
import { GOOGLE_CLIENT_ID } from './config.js';

const WAS_CONNECTED_KEY = 'google-drive-was-connected';
const TOKEN_KEY = 'google-drive-access-token';
const TOKEN_EXPIRY_KEY = 'google-drive-token-expiry';
const EMAIL_KEY = 'google-drive-email';

let accessToken = $state(browser ? restoreToken() : null);
let email = $state(browser ? (localStorage.getItem(EMAIL_KEY) || '') : '');
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

async function fetchEmail() {
	if (!accessToken) {
		console.warn('[auth] fetchEmail: no access token');
		return;
	}
	try {
		const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (!res.ok) {
			const body = await res.text().catch(() => '');
			console.error('[auth] fetchEmail failed:', res.status, body);
			return;
		}
		const data = await res.json();
		email = data.user?.emailAddress || '';
		if (email) {
			try { localStorage.setItem(EMAIL_KEY, email); } catch {}
		} else {
			console.warn('[auth] fetchEmail: no emailAddress in response', data);
		}
	} catch (err) {
		console.error('[auth] fetchEmail error:', err);
	}
}

export const googleAuth = {
	get token() {
		return accessToken;
	},
	get isSignedIn() {
		return accessToken !== null;
	},
	get email() {
		return email;
	},
	get wasConnected() {
		if (!browser) return false;
		try { return localStorage.getItem(WAS_CONNECTED_KEY) === 'true'; } catch { return false; }
	},

	async signIn() {
		await loadGis();
		initClient();
		try {
			await requestToken('');
		} catch {
			await requestToken('consent');
		}
		await fetchEmail();
	},

	async refreshToken() {
		await loadGis();
		initClient();
		try {
			await requestToken('');
			await fetchEmail();
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
		email = '';
		tokenClient = null;
		clearToken();
		try { localStorage.removeItem(EMAIL_KEY); } catch {}
	},
};

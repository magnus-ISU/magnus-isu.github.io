// Sign-in with Google Identity Services, token model.
//
// A site with no server can only hold a short-lived access token (about an
// hour) and can only get a new one through Google's popup, which browsers
// block unless it is opened from a click. So: `token` is null once the token
// has expired, and signIn() must be called from a click handler. Every request
// settles — a blocked, closed or abandoned popup resolves false rather than
// leaving its caller waiting forever.
import { browser } from '$app/environment';
import { GOOGLE_CLIENT_ID } from './config.js';

const TOKEN_KEY = 'google-drive-access-token';
const TOKEN_EXPIRY_KEY = 'google-drive-token-expiry';
const EMAIL_KEY = 'google-drive-email';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
// Stop using a token this long before Google stops accepting it.
const EXPIRY_MARGIN_MS = 60_000;
const POPUP_TIMEOUT_MS = 120_000;

function stored(key) {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

let accessToken = $state(browser ? stored(TOKEN_KEY) : null);
let expiresAt = $state(browser ? Number(stored(TOKEN_EXPIRY_KEY)) || 0 : 0);
let email = $state(browser ? stored(EMAIL_KEY) || '' : '');
let tokenClient = null;
let gisPromise = null;
let pending = null; // the popup request in flight, if any

function loadGis() {
	gisPromise ||= new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.src = 'https://accounts.google.com/gsi/client';
		script.onload = resolve;
		script.onerror = () => {
			gisPromise = null;
			script.remove();
			reject(new Error('Could not load Google sign-in'));
		};
		document.head.appendChild(script);
	});
	return gisPromise;
}

function saveToken(token, expiresInSeconds) {
	accessToken = token;
	expiresAt = Date.now() + expiresInSeconds * 1000;
	try {
		localStorage.setItem(TOKEN_KEY, accessToken);
		localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiresAt));
	} catch {
		/* still usable for this page load */
	}
}

function dropToken() {
	accessToken = null;
	expiresAt = 0;
	try {
		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(TOKEN_EXPIRY_KEY);
	} catch {
		/* ignore */
	}
}

async function prepare() {
	await loadGis();
	tokenClient ||= google.accounts.oauth2.initTokenClient({
		client_id: GOOGLE_CLIENT_ID,
		scope: SCOPE,
		callback: (response) => {
			const ok = !response.error && !!response.access_token;
			if (ok) saveToken(response.access_token, Number(response.expires_in) || 3600);
			pending?.finish(ok);
		},
		// Popup blocked, or closed without finishing.
		error_callback: () => pending?.finish(false),
	});
}

// Open the popup. Resolves true once a token has been stored, false otherwise.
function requestToken() {
	if (pending) return pending.promise;
	let settle;
	const promise = new Promise((resolve) => {
		settle = resolve;
	});
	const timer = setTimeout(() => pending?.finish(false), POPUP_TIMEOUT_MS);
	pending = {
		promise,
		finish(ok) {
			clearTimeout(timer);
			pending = null;
			settle(ok);
		},
	};
	try {
		// No forced prompt: Google only shows what it needs to (an account
		// chooser, consent the first time), and otherwise closes at once.
		tokenClient.requestAccessToken({ prompt: '', ...(email ? { login_hint: email } : {}) });
	} catch {
		pending.finish(false);
	}
	return promise;
}

async function fetchEmail() {
	try {
		const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (!res.ok) return;
		const address = (await res.json()).user?.emailAddress || '';
		if (!address) return;
		email = address;
		try {
			localStorage.setItem(EMAIL_KEY, email);
		} catch {
			/* ignore */
		}
	} catch {
		/* offline: keep whatever we knew */
	}
}

export const googleAuth = {
	// A token that is still good, or null.
	get token() {
		return accessToken && Date.now() < expiresAt - EXPIRY_MARGIN_MS ? accessToken : null;
	},
	get isSignedIn() {
		return this.token !== null;
	},
	get email() {
		return email;
	},
	// Milliseconds until the token stops being usable (0 if it already has).
	get expiresIn() {
		return accessToken ? Math.max(0, expiresAt - EXPIRY_MARGIN_MS - Date.now()) : 0;
	},

	// Load Google's script ahead of time, so that a later signIn() can open
	// its popup immediately inside the click that asked for it.
	async prepare() {
		try {
			await prepare();
			return true;
		} catch {
			return false;
		}
	},

	// Must be called from a click. Resolves true when signed in.
	async signIn() {
		if (!(await this.prepare())) return false;
		const ok = await requestToken();
		if (ok) await fetchEmail();
		return ok;
	},

	// The server refused the token (revoked, or our clock is off).
	expire() {
		dropToken();
	},

	// Forget the token. Access is not revoked with Google: revoking would
	// force the consent screen on every later sign-in.
	signOut() {
		dropToken();
		email = '';
		try {
			localStorage.removeItem(EMAIL_KEY);
		} catch {
			/* ignore */
		}
	},
};

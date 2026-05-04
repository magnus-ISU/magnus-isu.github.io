<script>
import { onMount } from 'svelte';
import { googleAuth } from '$lib/google/auth.svelte.js';
import { driveSync } from '$lib/google/sync.svelte.js';
import { characterSheet } from '$lib/dw/characterSheet.svelte.js';
import { userMonsters } from '$lib/dw/userMonsters.svelte.js';
import { encounterText } from '$lib/dw/encounterText.svelte.js';

let longPressTimer = null;

onMount(() => {
	const handleVisibility = () => driveSync.handleVisibilityChange();
	document.addEventListener('visibilitychange', handleVisibility);
	driveSync.startStorageListener();
	driveSync.autoReconnect();
	const unsubscribe = driveSync.onKeysChanged(() => {
		characterSheet.refresh();
		userMonsters.refresh();
		encounterText.refresh();
	});
	return () => {
		document.removeEventListener('visibilitychange', handleVisibility);
		driveSync.stopStorageListener();
		unsubscribe();
		if (longPressTimer) clearTimeout(longPressTimer);
	};
});

async function selectDrive(e) {
	if (e.shiftKey && googleAuth.isSignedIn) {
		logout();
		return;
	}
	if (driveSync.isDrive) {
		driveSync.pullFromDrive();
		return;
	}
	await driveSync.switchToDrive();
}

function handleDrivePointerDown() {
	if (!googleAuth.isSignedIn) return;
	longPressTimer = setTimeout(() => {
		longPressTimer = null;
		logout();
	}, 800);
}

function handleDrivePointerUp() {
	if (longPressTimer) {
		clearTimeout(longPressTimer);
		longPressTimer = null;
	}
}

function handleDriveDblClick() {
	if (googleAuth.isSignedIn) logout();
}

function logout() {
	driveSync.switchToLocal();
	googleAuth.signOut();
}

async function selectLocal() {
	if (!driveSync.isDrive) return;
	await driveSync.switchToLocal();
}

const driveLabel = $derived.by(() => {
	let emailStr = '';
	if (googleAuth.email) {
		const addr = googleAuth.email;
		emailStr = ` - ${addr.endsWith('@gmail.com') ? addr.slice(0, -10) : addr}`;
	}
	if (driveSync.status === 'waiting') return 'Waiting…';
	if (driveSync.status === 'syncing') return 'Syncing…';
	if (driveSync.status === 'error') return 'Sync error';
	return `Drive${emailStr}`;
});
</script>

<div class="storage-toggle">
	<button
		class="toggle-half left"
		class:active={!driveSync.isDrive}
		onclick={selectLocal}
	>Local Storage</button>
	<button
		class="toggle-half right"
		class:active={driveSync.isDrive}
		class:waiting={driveSync.isDrive && driveSync.status === 'waiting'}
		class:syncing={driveSync.isDrive && driveSync.status === 'syncing'}
		class:error={driveSync.isDrive && driveSync.status === 'error'}
		onclick={selectDrive}
		ondblclick={handleDriveDblClick}
		onpointerdown={handleDrivePointerDown}
		onpointerup={handleDrivePointerUp}
		onpointercancel={handleDrivePointerUp}
	>{driveLabel}</button>
</div>

<style>
	.storage-toggle {
		display: flex;
		margin: 0.5rem 1rem;
		border: 1px solid #444;
		border-radius: 4px;
		overflow: hidden;
	}

	.toggle-half {
		flex: 1;
		padding: 0.3rem 0.4rem;
		font-size: 0.65rem;
		font-family: inherit;
		border: none;
		cursor: pointer;
		background: transparent;
		color: #666;
		transition: background 0.15s, color 0.15s;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.toggle-half.left {
		border-right: 1px solid #444;
	}

	.toggle-half:hover:not(.active) {
		color: #aaa;
		background: #1e1e1e;
	}

	.toggle-half.active {
		background: #d4a847;
		color: #1e1e1e;
		font-weight: bold;
	}

	.toggle-half.active.waiting {
		background: #8a7a3a;
	}

	.toggle-half.active.syncing {
		background: #b8942e;
	}

	.toggle-half.active.error {
		background: #a04040;
		color: #fff;
	}
</style>

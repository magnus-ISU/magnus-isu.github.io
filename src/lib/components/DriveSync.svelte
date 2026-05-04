<script>
import { onMount } from 'svelte';
import { driveSync } from '$lib/google/sync.svelte.js';

onMount(() => {
	const handleVisibility = () => driveSync.handleVisibilityChange();
	document.addEventListener('visibilitychange', handleVisibility);
	driveSync.autoReconnect();
	const unsubscribe = driveSync.onKeysChanged(() => {
		window.location.reload();
	});
	return () => {
		document.removeEventListener('visibilitychange', handleVisibility);
		unsubscribe();
	};
});

async function selectDrive() {
	if (driveSync.isDrive) {
		driveSync.pullFromDrive();
		return;
	}
	await driveSync.switchToDrive();
}

async function selectLocal() {
	if (!driveSync.isDrive) return;
	await driveSync.switchToLocal();
}

const driveLabel = $derived.by(() => {
	if (!driveSync.isDrive) return 'Google Drive';
	if (driveSync.status === 'waiting') return 'Waiting…';
	if (driveSync.status === 'syncing') return 'Syncing…';
	if (driveSync.status === 'error') return 'Sync error';
	if (driveSync.lastSynced) return `Synced ${driveSync.lastSynced.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
	return 'Google Drive';
});
</script>

<div class="storage-toggle">
	<button
		class="toggle-half left"
		class:active={!driveSync.isDrive}
		onclick={selectLocal}
	>Local</button>
	<button
		class="toggle-half right"
		class:active={driveSync.isDrive}
		class:waiting={driveSync.isDrive && driveSync.status === 'waiting'}
		class:syncing={driveSync.isDrive && driveSync.status === 'syncing'}
		class:error={driveSync.isDrive && driveSync.status === 'error'}
		onclick={selectDrive}
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

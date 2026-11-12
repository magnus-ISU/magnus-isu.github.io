<script>
import { onMount } from 'svelte';
import { docs } from '$lib/dw/docs.svelte.js';
import { googleAuth } from '$lib/google/auth.svelte.js';
import { driveSync } from '$lib/google/sync.svelte.js';

onMount(() => driveSync.start());

const account = $derived.by(() => {
	const addr = googleAuth.email;
	return addr.endsWith('@gmail.com') ? addr.slice(0, -10) : addr;
});

const LABELS = {
	auth: 'Sign in to Drive again',
	syncing: 'Syncing…',
	saving: 'Saving…',
	offline: 'Offline — saved here',
	error: 'Sync error — retry',
};

const label = $derived(LABELS[driveSync.status] ?? (account ? `Drive ✓ ${account}` : 'Drive ✓'));

const HINTS = {
	auth: 'Google sign-in has expired. Your changes are saved in this browser and will upload once you sign in.',
	offline:
		'Drive cannot be reached. Your changes are saved in this browser and will upload when it can.',
	saving: 'Changes waiting to upload.',
};

const hint = $derived.by(() => {
	const status = driveSync.status;
	if (status === 'error') return `${driveSync.detail} — click to try again.`;
	if (HINTS[status]) return HINTS[status];
	const at = driveSync.lastSynced;
	return `Each character is a file in the “Dungeon World” folder of your Drive.${
		at ? ` Last synced ${at.toLocaleTimeString()}.` : ''
	} Click to sync now.`;
});

// A conflict notice can be marked resolved while its copy still carries the label.
function isOpenConflict(notice) {
	return notice.type === 'conflict' && !!docs().get(notice.docId)?.conflict;
}
</script>

<div class="drive-sync">
	{#if driveSync.enabled}
		<div class="drive-row">
			<button
				class="drive-btn on status-{driveSync.status}"
				title={hint}
				onclick={() => driveSync.syncNow()}
			>{label}</button>
			<button
				class="drive-off"
				title="Stop syncing in this browser. Nothing is deleted, here or on Drive."
				aria-label="Disconnect Google Drive"
				onclick={() => driveSync.disconnect()}
			>✕</button>
		</div>
	{:else}
		<button
			class="drive-btn"
			title="Keep each character as a file in your Google Drive, synced between your devices."
			onclick={() => driveSync.connect()}
		>Sync with Google Drive</button>
	{/if}

	{#each driveSync.notices as notice (notice.id)}
		<div class="drive-notice" role="status">
			<p>{notice.message}</p>
			<div class="drive-notice-actions">
				{#if isOpenConflict(notice)}
					<button
						title="Remove the conflict label from the copy"
						onclick={() => driveSync.resolveConflict(notice)}
					>Resolved</button>
				{/if}
				<button onclick={() => driveSync.dismissNotice(notice.id)}>Dismiss</button>
			</div>
		</div>
	{/each}
</div>

<style>
	.drive-sync {
		margin: 0.5rem 1rem;
	}

	.drive-row {
		display: flex;
		border: 1px solid #444;
		border-radius: 4px;
		overflow: hidden;
	}

	.drive-btn {
		flex: 1;
		min-width: 0;
		padding: 0.3rem 0.4rem;
		font-size: 0.65rem;
		font-family: inherit;
		border: 1px solid #444;
		border-radius: 4px;
		cursor: pointer;
		background: transparent;
		color: #888;
		transition: background 0.15s, color 0.15s;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		width: 100%;
	}

	.drive-btn:hover {
		color: #ccc;
		background: #1e1e1e;
	}

	.drive-btn.on {
		border: none;
		border-radius: 0;
		background: #d4a847;
		color: #1e1e1e;
		font-weight: bold;
	}

	.drive-btn.on.status-saving {
		background: #8a7a3a;
	}

	.drive-btn.on.status-syncing {
		background: #b8942e;
	}

	.drive-btn.on.status-offline {
		background: #5a5a5a;
		color: #eee;
	}

	.drive-btn.on.status-auth,
	.drive-btn.on.status-error {
		background: #a04040;
		color: #fff;
	}

	.drive-off {
		padding: 0 0.5rem;
		font-size: 0.65rem;
		font-family: inherit;
		border: none;
		border-left: 1px solid #444;
		background: transparent;
		color: #666;
		cursor: pointer;
	}

	.drive-off:hover {
		color: #ddd;
		background: #1e1e1e;
	}

	.drive-notice {
		margin-top: 0.4rem;
		padding: 0.4rem 0.5rem;
		border: 1px solid #a04040;
		border-radius: 4px;
		background: #1e1e1e;
		color: #ddd;
		font-size: 0.7rem;
		line-height: 1.35;
	}

	.drive-notice p {
		margin: 0 0 0.4rem;
	}

	.drive-notice-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.4rem;
	}

	.drive-notice-actions button {
		padding: 0.15rem 0.5rem;
		font-size: 0.65rem;
		font-family: inherit;
		background: transparent;
		color: #aaa;
		border: 1px solid #444;
		border-radius: 3px;
		cursor: pointer;
	}

	.drive-notice-actions button:hover {
		color: #fff;
		border-color: #777;
	}
</style>

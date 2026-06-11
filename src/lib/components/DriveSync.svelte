<script>
import { onMount } from 'svelte';
import { characterSheet } from '$lib/dw/characterSheet.svelte.js';
import { encounterText } from '$lib/dw/encounterText.svelte.js';
import { userMonsters } from '$lib/dw/userMonsters.svelte.js';
import { googleAuth } from '$lib/google/auth.svelte.js';
import { driveSync } from '$lib/google/sync.svelte.js';

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

// The conflict modal must escape the sidebar: .dw-sidebar is a sticky/fixed
// scroll container, which creates a stacking context, so a position:fixed
// modal inside it is painted and hit-tested behind the page content (clicks
// fall through to whatever is underneath). Reparent it to <body>.
function portal(node) {
	document.body.appendChild(node);
	return {
		destroy() {
			node.remove();
		},
	};
}

const driveLabel = $derived.by(() => {
	let emailStr = '';
	if (driveSync.status === 'waiting') return 'Waiting…';
	if (driveSync.status === 'syncing') return 'Syncing…';
	if (driveSync.status === 'error') return 'Sync error';
	if (googleAuth.email) {
		const addr = googleAuth.email;
		emailStr = ` - ${addr.endsWith('@gmail.com') ? addr.slice(0, -10) : addr}`;
		return `Drive${emailStr}`;
	}
	return `Google Drive`;
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

{#if driveSync.conflictNotice}
	{@const diff = driveSync.conflictNotice.diff}
	<div use:portal>
	<div
		class="conflict-backdrop"
		role="presentation"
		onclick={() => driveSync.dismissConflict()}
	></div>
	<div class="conflict-modal" role="alertdialog" aria-modal="true" aria-labelledby="conflict-title">
		<h2 id="conflict-title">Sync conflict</h2>
		<p>
			Your Drive file was updated from another device while you had unsynced changes
			here. Choose which version to keep.
		</p>
		{#if diff}
			<p class="conflict-summary">{diff.summary}</p>
			<div class="conflict-diff">
				<div class="conflict-side">
					<span class="conflict-side-label">Local</span>
					<pre>{diff.local || '(empty)'}</pre>
				</div>
				<div class="conflict-side">
					<span class="conflict-side-label">Server</span>
					<pre>{diff.server || '(empty)'}</pre>
				</div>
			</div>
		{:else if driveSync.conflictNotice.diffFailed}
			<p class="conflict-summary">The server file could not be read to show what differs.</p>
		{:else}
			<p class="conflict-summary">No content difference was found — only the file's timestamp changed.</p>
		{/if}
		<!-- Each "keep" button sits on the same side as its diff column. -->
		<div class="conflict-actions">
			<button class="conflict-keep" onclick={() => driveSync.resolveConflict('local')}>Keep local</button>
			<button class="conflict-later" onclick={() => driveSync.dismissConflict()}>Decide later</button>
			<button class="conflict-keep" onclick={() => driveSync.resolveConflict('server')}>Keep server</button>
		</div>
	</div>
	</div>
{/if}

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

	/* Above everything else in the app (delete modal is 2000, roll bubble 200). */
	.conflict-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		z-index: 5000;
	}

	.conflict-modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 5001;
		max-width: 32rem;
		width: calc(100vw - 2rem);
		padding: 1rem 1.25rem 1.25rem;
		background: #1e1e1e;
		color: #e0e0e0;
		border: 1px solid #a04040;
		border-radius: 6px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
		font-family: inherit;
		font-size: 0.85rem;
		line-height: 1.4;
	}

	.conflict-modal h2 {
		margin: 0 0 0.5rem;
		font-size: 1rem;
		color: #d4a847;
	}

	.conflict-modal p {
		margin: 0 0 1rem;
	}

	.conflict-summary {
		font-weight: bold;
		color: #fff;
	}

	.conflict-diff {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.conflict-side {
		flex: 1;
		min-width: 0;
	}

	.conflict-side-label {
		display: block;
		font-size: 0.7rem;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #999;
		margin-bottom: 0.25rem;
	}

	/* Mirror the layout: server column is on the right. */
	.conflict-side:last-child .conflict-side-label {
		text-align: right;
	}

	.conflict-side pre {
		margin: 0;
		padding: 0.4rem 0.5rem;
		background: #141414;
		border: 1px solid #333;
		border-radius: 4px;
		font-size: 0.75rem;
		white-space: pre-wrap;
		word-break: break-word;
		max-height: 8rem;
		overflow-y: auto;
	}

	.conflict-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: space-between;
		align-items: center;
	}

	.conflict-keep {
		padding: 0.35rem 1rem;
		background: #d4a847;
		color: #1e1e1e;
		border: none;
		border-radius: 4px;
		font-family: inherit;
		font-size: 0.8rem;
		font-weight: bold;
		cursor: pointer;
	}

	.conflict-keep:hover {
		background: #e0b658;
	}

	.conflict-later {
		padding: 0.35rem 0.75rem;
		background: transparent;
		color: #999;
		border: 1px solid #444;
		border-radius: 4px;
		font-family: inherit;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.conflict-later:hover {
		color: #ddd;
		border-color: #666;
	}
</style>

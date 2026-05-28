<script>
import { parseEncounter, updateMonsterParen } from '$lib/dw/encounterParse.js';
import MonsterStatblock from './MonsterStatblock.svelte';

let { text = '', knownMonsters = [], blockIndex = 0, onEdit = null } = $props();

// Local copy so HP/label edits update instantly without waiting for a re-mount.
// svelte-ignore state_referenced_locally
let localText = $state(text);

const matched = $derived(parseEncounter(localText, knownMonsters).matched);

function persist(monsterName, newLabels, count, hps) {
	localText = updateMonsterParen(localText, monsterName, newLabels, count, hps);
	onEdit?.(blockIndex, localText);
}

function handleLabels(name, newLabels, count, hps) {
	persist(name, newLabels, count, hps);
}

function handleHp(name, newHps, newLabels, count, maxHp) {
	// Omit HP number for instances at full health
	const hpsToSave = newHps.map((h) => (h === maxHp ? null : h));
	persist(name, newLabels, count, hpsToSave);
}
</script>

{#if matched.length > 0}
	<div class="battle-monsters" class:two-col={matched.length >= 2}>
		{#each matched as m, i (i)}
			<MonsterStatblock
				{...m}
				custom={true}
				open={true}
				locked={true}
				descOpen={true}
				onLabelsChange={(newLabels, count, hps) => handleLabels(m.name, newLabels, count, hps)}
				onHpChange={(newHps, newLabels, count, maxHp) =>
					handleHp(m.name, newHps, newLabels, count, maxHp)}
			/>
		{/each}
	</div>
{/if}

<style>
	.battle-monsters {
		margin: 1rem 0;
	}

	.battle-monsters.two-col {
		columns: 2;
		column-gap: 0.5rem;
	}

	.battle-monsters.two-col > :global(.monster) {
		break-inside: avoid;
		margin-bottom: 0.5rem;
	}

	.battle-monsters.two-col > :global(.monster.is-expanded) {
		margin-top: 0;
	}

	@media (max-width: 1028px) {
		.battle-monsters.two-col {
			columns: 1;
		}
	}
</style>

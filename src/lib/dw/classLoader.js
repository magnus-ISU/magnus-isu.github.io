// Loads class (and spell list) markdown for building character sheets. What a
// sheet is made of is in sheetBuilder.js.
import { contentIndex } from './navigation.js';
import { buildCharacterSheet } from './sheetBuilder.js';

const srdRaw = import.meta.glob('/src/lib/dw/srd/*.md', { query: '?raw', import: 'default' });
const homebrewRaw = import.meta.glob('/src/lib/dw/homebrew/**/*.md', {
	query: '?raw',
	import: 'default',
});

export async function loadClassRaw(entry) {
	let path, modules;
	if (entry.source === 'srd') {
		path = `/src/lib/dw/srd/${entry.file}.md`;
		modules = srdRaw;
	} else {
		path = `/src/lib/dw/homebrew/${entry.file}.md`;
		modules = homebrewRaw;
	}
	const resolver = modules[path];
	if (!resolver) return null;
	return await resolver();
}

// The text of a new character sheet for the class with navigation entry
// `entry`, or null if the class has no markdown.
export async function loadClassSheet(entry, artUrl) {
	const raw = await loadClassRaw(entry);
	if (!raw) return null;
	// `spells` names the spell list's page, or says more: { page, heading, emptyNote }.
	const spells = typeof entry.spells === 'string' ? { page: entry.spells } : entry.spells;
	const spellsEntry = spells ? contentIndex[spells.page] : null;
	return buildCharacterSheet(raw, artUrl, {
		hardWrapped: entry.source === 'srd',
		spells: spellsEntry ? { ...spells, raw: await loadClassRaw(spellsEntry) } : null,
		extraDamage: entry.extraDamage,
		stats: entry.stats,
	});
}

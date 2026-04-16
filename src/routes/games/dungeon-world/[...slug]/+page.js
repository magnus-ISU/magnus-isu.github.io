import { error } from '@sveltejs/kit';
import { contentIndex, pageArt } from '$lib/dw/navigation.js';

const srdModules = import.meta.glob('/src/lib/dw/srd/*.md');
const homebrewModules = import.meta.glob('/src/lib/dw/homebrew/**/*.md');

function resolveArt(...keys) {
	for (const k of keys) {
		const v = k && pageArt[k];
		if (!v) continue;
		if (typeof v === 'string') return { art: v, artMirror: false };
		return { art: v.url, artMirror: !!v.mirror };
	}
	return { art: null, artMirror: false };
}

export const load = async ({ params }) => {
	const slug = params.slug;
	const entry = contentIndex[slug];

	if (!entry) {
		// Check auto-discovered monster sections not in static nav
		const { monsterSections } = await import('$lib/dw/monsters.js');
		const section = monsterSections.find(s => s.slug === slug);
		if (!section) error(404, 'Page not found');
		return {
			title: section.name,
			isHomebrew: true,
			slug,
			render: 'monsters',
			monsterSections: [section],
			...resolveArt(slug),
			srdSlug: null,
			homebrewSlug: null
		};
	}

	// Data-driven pages (no markdown file needed)
	if (entry.render === 'monsters') {
		const { monsterSections } = await import('$lib/dw/monsters.js');
		const sections = entry.monsterSection
			? monsterSections.filter((s) => s.slug === entry.monsterSection)
			: monsterSections;
		return {
			title: entry.title,
			isHomebrew: !!entry.homebrew,
			slug,
			render: 'monsters',
			monsterSections: sections,
			...resolveArt(slug, entry.monsterSection),
			srdSlug: entry.srdSlug || null,
			homebrewSlug: entry.homebrewSlug || null
		};
	}

	let modulePath;
	if (entry.source === 'srd') {
		modulePath = `/src/lib/dw/srd/${entry.file}.md`;
	} else {
		modulePath = `/src/lib/dw/homebrew/${entry.file}.md`;
	}

	const modules = entry.source === 'srd' ? srdModules : homebrewModules;
	const resolver = modules[modulePath];

	if (!resolver) {
		error(404, 'Content not found');
	}

	const mod = await resolver();
	return {
		Content: mod.default,
		title: entry.title,
		isHomebrew: !!entry.homebrew,
		slug,
		...resolveArt(slug, slug.replace('-srd', '')),
		srdSlug: entry.srdSlug || null,
		homebrewSlug: entry.homebrewSlug || null
	};
};

export const entries = async () => {
	const { monsterSections } = await import('$lib/dw/monsters.js');
	const staticSlugs = Object.entries(contentIndex)
		.filter(([, e]) => !e.skipSlug)
		.map(([slug]) => ({ slug }));
	const knownMonsterSections = new Set(
		Object.values(contentIndex).filter((e) => e.monsterSection).map((e) => e.monsterSection)
	);
	const dynamicSlugs = monsterSections
		.filter((s) => !contentIndex[s.slug] && !knownMonsterSections.has(s.slug))
		.map((s) => ({ slug: s.slug }));
	return [...staticSlugs, ...dynamicSlugs];
};

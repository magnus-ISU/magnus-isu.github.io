import { error } from '@sveltejs/kit';
import { contentIndex } from '$lib/dw/navigation.js';

const srdModules = import.meta.glob('/src/lib/dw/srd/*.md');
const homebrewModules = import.meta.glob('/src/lib/dw/homebrew/**/*.md');

export const load = async ({ params }) => {
	const slug = params.slug;
	const entry = contentIndex[slug];

	if (!entry) {
		error(404, 'Page not found');
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
		srdSlug: entry.srdSlug || null,
		homebrewSlug: entry.homebrewSlug || null
	};
};

export const entries = () => {
	return Object.keys(contentIndex).map((slug) => ({ slug }));
};

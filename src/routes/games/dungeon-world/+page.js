import { error } from '@sveltejs/kit';
import { contentIndex, defaultSlug } from '$lib/dw/navigation.js';

const srdModules = import.meta.glob('/src/lib/dw/srd/*.md');
const homebrewModules = import.meta.glob('/src/lib/dw/homebrew/**/*.md');

export const load = async () => {
	const entry = contentIndex[defaultSlug];
	const modulePath = `/src/lib/dw/srd/${entry.file}.md`;
	const resolver = srdModules[modulePath];

	if (!resolver) {
		error(404, 'Content not found');
	}

	const mod = await resolver();
	return {
		Content: mod.default,
		title: entry.title,
		isHomebrew: false,
		slug: defaultSlug
	};
};

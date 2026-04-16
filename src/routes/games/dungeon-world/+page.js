import { redirect } from '@sveltejs/kit';
import { defaultSlug } from '$lib/dw/navigation.js';

export const load = () => {
	redirect(307, `/games/dungeon-world/${defaultSlug}`);
};

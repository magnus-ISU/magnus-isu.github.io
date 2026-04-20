import { json } from '@sveltejs/kit';
import fetchPosts from '$lib/assets/js/fetchPosts';
import { postsPerPage } from '$lib/config';

export const prerender = true;

export const GET = async ({ params }) => {
	const { page } = params || 1;

	const options = {
		offset: (page - 1) * postsPerPage,
		limit: postsPerPage,
	};

	const { posts } = await fetchPosts(options);

	return json(posts);
};

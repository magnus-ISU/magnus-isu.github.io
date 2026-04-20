import { redirect } from '@sveltejs/kit';
import fetchPosts from '$lib/assets/js/fetchPosts';
import { postsPerPage } from '$lib/config';

export const load = async ({ url, params, fetch }) => {
	const page = parseInt(params.page, 10) || 1;
	const { category } = params;

	// Prevents duplication of page 1 as the index page
	if (page <= 1) {
		redirect(301, `/blog/category/${category}`);
	}

	const offset = page * postsPerPage - postsPerPage;

	const totalPostsRes = await fetch(`${url.origin}/api/posts/count`);
	const total = await totalPostsRes.json();
	const { posts } = await fetchPosts({ offset, page });

	return {
		posts,
		page,
		category,
		totalPosts: total,
	};
};

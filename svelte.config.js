import preprocess from 'svelte-preprocess';
//import adapter from '@sveltejs/adapter-static';
import { mdsvex } from 'mdsvex';

const mdsvex_config = {
	extensions: ['.md']
};
/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', ...mdsvex_config.extensions],
	preprocess: [preprocess(), mdsvex(mdsvex_config)],

	kit: {
		target: '#svelte',
/*
		adapter: adapter({
			pages: 'build', // path to public directory
			assets: 'build', // path to public directory
			fallback: null
		})
*/
	}
};

export default config;

import adapter from '@sveltejs/adapter-static'
import { mdsvex } from 'mdsvex'

export default {
	kit: {
		// Configure the static adapter
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html', // Required for client-side routing
		}),

		// Set base path based on deployment destination
		paths: {
			base: process.env.NODE_ENV === 'production' ? '/magnus-isu.github.io/' : '',
		},
	},
	preprocess: [
		mdsvex({
			extensions: ['.md'],
			smartypants: true,
		}),
	],
}

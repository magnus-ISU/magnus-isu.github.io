import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [sveltekit()],
	build: {
		reportCompressedSize: false,
	},
	server: {
		fs: {
			allow: ['.'],
		},
	},
};

export default config;

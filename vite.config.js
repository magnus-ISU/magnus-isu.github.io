import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [sveltekit()],
	build: {
		reportCompressedSize: false,
	},
	logLevel: 'warn',
	server: {
		fs: {
			allow: ['.'],
		},
	},
};

export default config;

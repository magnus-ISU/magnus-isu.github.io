module.exports = {
	root: true,
	extends: ['eslint:recommended', 'plugin:svelte/recommended'],
	rules: {
		'svelte/no-at-html-tags': 'off',
		'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
	},
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 'latest',
		extraFileExtensions: ['.svelte'],
	},
	env: {
		browser: true,
		es2024: true,
		node: true,
	},
	overrides: [
		{
			files: ['*.svelte'],
			parser: 'svelte-eslint-parser',
		},
		{
			files: ['*.svelte.js'],
			globals: {
				$state: 'readonly',
				$derived: 'readonly',
				$effect: 'readonly',
				$props: 'readonly',
				$bindable: 'readonly',
				$inspect: 'readonly',
			},
		},
	],
	ignorePatterns: [
		'build/',
		'static/',
		'src/lib/components/character_sheet/',
		'src/routes/games/perfect-pitch/+page.svelte',
	],
};

export { matchers } from './matchers.js';

export const nodes = [
	() => import('./nodes/0'),
	() => import('./nodes/1'),
	() => import('./nodes/2'),
	() => import('./nodes/3'),
	() => import('./nodes/4'),
	() => import('./nodes/5'),
	() => import('./nodes/6'),
	() => import('./nodes/7'),
	() => import('./nodes/8'),
	() => import('./nodes/9'),
	() => import('./nodes/10'),
	() => import('./nodes/11'),
	() => import('./nodes/12'),
	() => import('./nodes/13'),
	() => import('./nodes/14')
];

export const server_loads = [];

export const dictionary = {
		"/": [2],
		"/blog": [~3],
		"/blog/category": [~5],
		"/blog/category/page/[page]": [~9],
		"/blog/category/[category]": [~6],
		"/blog/category/[category]/page": [~7],
		"/blog/category/[category]/page/[page]": [~8],
		"/blog/page": [~10],
		"/blog/page/[page]": [~11],
		"/blog/[post]": [4],
		"/games": [12],
		"/games/obelisk": [13],
		"/games/perfect-pitch": [14]
	};

export const hooks = {
	handleError: (({ error }) => { console.error(error) }),
	
	reroute: (() => {}),
	transport: {}
};

export const decoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.decode]));

export const hash = false;

export const decode = (type, value) => decoders[type](value);

export { default as root } from '../root.js';
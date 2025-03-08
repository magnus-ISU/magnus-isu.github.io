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
	() => import('./nodes/14'),
	() => import('./nodes/15')
];

export const server_loads = [];

export const dictionary = {
		"/": [3],
		"/blog": [~4,[2]],
		"/blog/category": [~6,[2]],
		"/blog/category/page/[page]": [~10,[2]],
		"/blog/category/[category]": [~7,[2]],
		"/blog/category/[category]/page": [~8,[2]],
		"/blog/category/[category]/page/[page]": [~9,[2]],
		"/blog/page": [~11,[2]],
		"/blog/page/[page]": [~12,[2]],
		"/blog/[post]": [5,[2]],
		"/games": [13],
		"/games/obelisk": [14],
		"/games/perfect-pitch": [15]
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
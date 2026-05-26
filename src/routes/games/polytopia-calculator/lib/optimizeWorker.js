import { findBestOrder } from './optimize.js';

self.onmessage = (e) => {
	const { attackers, defenders, cfg } = e.data;
	let lastSent = 0;
	const result = findBestOrder(attackers, defenders, cfg, (frac) => {
		const now = Date.now();
		if (now - lastSent < 30 && frac < 1) return;
		lastSent = now;
		self.postMessage({ type: 'progress', value: frac });
	});
	self.postMessage({ type: 'done', perm: result.perm, score: result.score });
};

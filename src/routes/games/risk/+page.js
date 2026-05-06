export async function load() {
	const [background, connections, paths, defaultStateJson] = await Promise.all([
		import('./background.json').then((m) => m.default),
		import('./connections.json').then((m) => m.default),
		import('./paths.json').then((m) => m.default),
		import('./risk_state.json').then((m) => m.default),
	]);
	return { background, connections, paths, defaultStateJson };
}

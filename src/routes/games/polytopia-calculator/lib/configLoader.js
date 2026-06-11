export async function loadAllConfigs() {
	const configModules = import.meta.glob('./config/*.json', { eager: true });
	const configs = {};
	for (const path in configModules) {
		const version = path.match(/v(\d+)\.json$/)?.[1];
		if (version) {
			configs[version] = configModules[path].default;
		}
	}
	return configs;
}

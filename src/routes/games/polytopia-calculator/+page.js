import { loadAllConfigs } from './lib/configLoader.js';

export async function load() {
	const versionConfigs = await loadAllConfigs();
	return { versionConfigs };
}

let _global = $state('hb');
let _overrides = $state({});

export function getSource(itemSlug) {
	return _overrides[itemSlug] ?? _global;
}

export function toggleSource(itemSlug, target, singleOnly) {
	if (singleOnly) {
		_overrides = { ..._overrides, [itemSlug]: target };
	} else {
		_global = target;
		_overrides = {};
	}
}

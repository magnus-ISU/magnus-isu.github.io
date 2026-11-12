// Pre-pass shared by everything that splits a document into lines: a
// [text](tooltip) whose tooltip spans several lines is folded onto one line
// (newlines become \x01), so line-based parsing never cuts through it.
export function collapseTooltips(src) {
	return src.replace(/\[([^\]]+)\]\(([^)]*\n[^)]*)\)/g, (_, text, body) => {
		return `[${text}](${body.replace(/\n/g, '\x01')})`;
	});
}

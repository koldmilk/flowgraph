// How much of a node's description the canvas shows before clamping it. One long note would otherwise
// stretch its node down the graph; the rest is a hover away, or pinned open per node from the panel.
export const DESCRIPTION_LIMIT = 250;

// Cut on a word boundary when there's one reasonably near the limit, rather than mid-word. The
// markdown is clamped as source text, so a cut can land inside markup (an unclosed `**`); marked
// renders the stray characters literally, which is a fair trade for not having to parse to clamp.
export function clampDescription(text: string): string {
	if (text.length <= DESCRIPTION_LIMIT) return text;
	const cut = text.slice(0, DESCRIPTION_LIMIT);
	const lastSpace = cut.lastIndexOf(' ');
	return (lastSpace > DESCRIPTION_LIMIT * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

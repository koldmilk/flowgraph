// Moves an element to <body>. Anything rendered inside a node lives under the flow's viewport, which
// carries the pan/zoom transform -- so it scales with the canvas, clips to the node's stacking order,
// and can't use `position: fixed` (a transformed ancestor makes fixed positioning relative to *it*
// rather than the window). A hover popover needs none of that, so it's rendered at the top level and
// positioned from screen coordinates instead.
export function portal(node: HTMLElement) {
	document.body.appendChild(node);
	return {
		destroy() {
			node.remove();
		}
	};
}

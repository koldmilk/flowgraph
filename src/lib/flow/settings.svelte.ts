// Canvas-wide preferences, edited from the Settings panel. Module-level state rather than props:
// these belong to the workspace as a whole, not to any node or graph, so they apply across every tab
// and any component can read them without threading them through the editor.
//
// Like the graph itself these live in memory only -- a reload restores the defaults.
export type GridPattern = 'dots' | 'lines' | 'cross' | 'none';

export const GRID_MIN = 8;
export const GRID_MAX = 64;

export const settings = $state({
	gridPattern: 'dots' as GridPattern,
	// Drives the background spacing *and* the snap step, so nodes land on dots you can actually see.
	gridSize: 24,
	snapToGrid: false,
	// The dashes that crawl along the wires. Purely decorative, and the one setting worth turning off
	// on a big graph: every visible edge animates continuously.
	animateSignal: true,
	showMinimap: false,
	// Off by default: an input pin takes one spline, and a new connection replaces what was there.
	// Turning this on lifts that everywhere at once; individual nodes can also opt in on their own.
	allowMultipleInputs: false
});

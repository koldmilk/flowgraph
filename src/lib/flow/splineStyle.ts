// Per-edge look, stored on the edge's own `data` so it survives copy/paste and reroute splits.
//
// 'forward' runs the dashes source -> target (the default), 'reverse' the other way.
//
// There was a 'both' mode here that drew two strands travelling in opposite directions. It never read
// clearly once a wire bent through reroute knots, so it's out until there's a shape for it that does.
export type SplineFlow = 'forward' | 'reverse';

export type SplineData = {
	color?: string;
	flow?: SplineFlow;
	// Opts this one edge out of the dashes, whatever the global Animate signal setting says.
	solid?: boolean;
};

// The cyan every spline wears until it's given a color of its own; matches --spline in FlowEditor.
export const DEFAULT_SPLINE_COLOR = '#7fd6db';

export const splineFlows: { value: SplineFlow; label: string }[] = [
	{ value: 'forward', label: 'Forward' },
	{ value: 'reverse', label: 'Reverse' }
];

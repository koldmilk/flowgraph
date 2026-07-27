// Shared geometry for wires that run through reroute knots.
//
// A knot splits a wire into separate edges, and each edge is normally its own SVG path -- which is why
// the dashes used to restart at every knot and the two strands of a bi-directional wire could swap
// sides at a bend. Instead, the segment that leaves a real pin draws the *whole* run as one path: it
// reads the shape of each downstream segment from here and stitches them together. One path means one
// dash pattern and one consistent offset, with nothing to keep in sync.
export type SplineSegment = {
	sx: number;
	sy: number;
	c1x: number;
	c1y: number;
	c2x: number;
	c2y: number;
	tx: number;
	ty: number;
};

// Keyed by edge id. Only segments that start at a knot publish -- those are the ones somebody else
// has to draw.
export const splineSegments = $state<Record<string, SplineSegment>>({});

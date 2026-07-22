<script lang="ts">
	import { BaseEdge, Position, type BezierEdgeProps } from '@xyflow/svelte';

	let {
		id,
		interactionWidth,
		label,
		labelStyle,
		markerEnd,
		markerStart,
		pathOptions,
		sourcePosition,
		sourceX,
		sourceY,
		style,
		targetPosition,
		targetX,
		targetY
	}: BezierEdgeProps = $props();

	// Higher curvature than the built-in bezier (0.25) so wires exit pins flatter and hold
	// horizontal longer -- the Unreal Blueprint look.
	const CURVATURE = 0.55;

	// Unlike xyflow's stock bezier, we enforce a MINIMUM tangent length at each pin. Stock control
	// offsets scale with horizontal distance only, so vertically-aligned pins (e.g. two stacked
	// reroute knots) degenerate into a straight line that meets neighboring horizontal segments at
	// hard 90-degree corners. Unreal always leaves the pin with real momentum; the floor below keeps
	// corners round, scaled by the perpendicular travel and capped so short hops don't overshoot.
	function controlOffset(distance: number, perpDistance: number, curvature: number) {
		const base = distance >= 0 ? 0.5 * distance : curvature * 25 * Math.sqrt(-distance);
		const floor = Math.min(80, 0.4 * Math.abs(perpDistance));
		return Math.max(base, floor);
	}

	function controlPoint(pos: Position, x: number, y: number, ox: number, oy: number, curvature: number): [number, number] {
		switch (pos) {
			case Position.Left:
				return [x - controlOffset(-ox, oy, curvature), y];
			case Position.Right:
				return [x + controlOffset(ox, oy, curvature), y];
			case Position.Top:
				return [x, y - controlOffset(-oy, ox, curvature)];
			case Position.Bottom:
				return [x, y + controlOffset(oy, ox, curvature)];
		}
	}

	const curvature = $derived(pathOptions?.curvature ?? CURVATURE);

	const geometry = $derived.by(() => {
		const sp = sourcePosition ?? Position.Right;
		const tp = targetPosition ?? Position.Left;
		// Signed deltas oriented "source toward target" / "target toward source".
		const [c1x, c1y] = controlPoint(sp, sourceX, sourceY, targetX - sourceX, targetY - sourceY, curvature);
		const [c2x, c2y] = controlPoint(tp, targetX, targetY, sourceX - targetX, sourceY - targetY, curvature);
		const path = `M${sourceX},${sourceY} C${c1x},${c1y} ${c2x},${c2y} ${targetX},${targetY}`;
		// Bezier midpoint at t=0.5 for the label position.
		const labelX = sourceX * 0.125 + c1x * 0.375 + c2x * 0.375 + targetX * 0.125;
		const labelY = sourceY * 0.125 + c1y * 0.375 + c2y * 0.375 + targetY * 0.125;
		return { path, labelX, labelY };
	});
</script>

<BaseEdge
	{id}
	path={geometry.path}
	labelX={geometry.labelX}
	labelY={geometry.labelY}
	{label}
	{labelStyle}
	{markerStart}
	{markerEnd}
	{interactionWidth}
	{style}
/>

<script lang="ts">
	import { useSvelteFlow, type NodeProps, type Node } from '@xyflow/svelte';
	import { defaultNodeColor } from '../nodeColors';
	import type { ArrowPoint } from '../nodeCatalog';

	// A free-floating pointer: a smooth curve through a list of points, ending in an arrowhead.
	// Points are stored relative to the node's own position, so dragging the arrow body moves the
	// whole thing while the shape stays put. The node's box is kept equal to the points' bounding
	// box (see commit()), which keeps marquee-selection and the selection outline honest.
	type ArrowNodeData = { points?: ArrowPoint[]; color?: string };

	let { id, data, selected, positionAbsoluteX, positionAbsoluteY }: NodeProps<Node<ArrowNodeData>> =
		$props();

	const { updateNode, screenToFlowPosition } = useSvelteFlow();

	const color = $derived(data.color ?? defaultNodeColor.arrow);
	const points = $derived<ArrowPoint[]>(data.points ?? [
		{ x: 0, y: 0 },
		{ x: 160, y: 80 }
	]);

	// PAD keeps the stroke, arrowhead, and grab dots inside the SVG's drawing area: the box is the
	// points' bounding box, so without it anything drawn at an extreme point would be clipped.
	const PAD = 24;
	const box = $derived.by(() => {
		const xs = points.map((p) => p.x);
		const ys = points.map((p) => p.y);
		return {
			minX: Math.min(...xs),
			minY: Math.min(...ys),
			w: Math.max(...xs) - Math.min(...xs),
			h: Math.max(...ys) - Math.min(...ys)
		};
	});

	// Catmull-Rom through every point, converted to cubic beziers, so the curve passes exactly
	// through each control point instead of merely being pulled toward it. Two points stay a
	// straight line.
	//
	// The arrowhead's angle comes from the SAME geometry, not from the last two points: a bezier does
	// not arrive at its endpoint along the straight line from the previous point, so aiming the head
	// that way visibly detaches it wherever the curve bends. The true tangent at t=1 is
	// (endpoint - trailing control point), which is what we capture here.
	const geometry = $derived.by(() => {
		const p = points;
		if (p.length < 2) return { path: '', tip: null, angle: 0 };

		let d = `M${p[0].x},${p[0].y}`;
		// The point behind the tip that defines the curve's arrival direction.
		let approach: ArrowPoint = p[0];

		if (p.length === 2) {
			d += ` L${p[1].x},${p[1].y}`;
		} else {
			for (let i = 0; i < p.length - 1; i++) {
				const p0 = p[i - 1] ?? p[i];
				const p1 = p[i];
				const p2 = p[i + 1];
				const p3 = p[i + 2] ?? p2;
				// Standard Catmull-Rom -> bezier control points (tension 1/6).
				const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
				const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
				d += ` C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`;
				if (i === p.length - 2) approach = c2; // final segment's trailing handle
			}
		}

		const tip = p[p.length - 1];
		let dx = tip.x - approach.x;
		let dy = tip.y - approach.y;
		// Degenerate tangent (coincident points): fall back to the previous point's direction.
		if (Math.hypot(dx, dy) < 0.001) {
			dx = tip.x - p[p.length - 2].x;
			dy = tip.y - p[p.length - 2].y;
		}

		return { path: d, tip, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
	});

	const path = $derived(geometry.path);
	const head = $derived(
		geometry.tip ? { x: geometry.tip.x, y: geometry.tip.y, angle: geometry.angle } : null
	);

	// Write points back, rebasing so the node's position/size track the shape. Points are relative,
	// so when the leftmost/topmost point moves we shift the node by the same amount and subtract it
	// from every point -- the arrow doesn't visually move, but its box stays snug.
	function commit(next: ArrowPoint[]) {
		const minX = Math.min(...next.map((p) => p.x));
		const minY = Math.min(...next.map((p) => p.y));
		const rebased = next.map((p) => ({ x: p.x - minX, y: p.y - minY }));
		const w = Math.max(...rebased.map((p) => p.x));
		const h = Math.max(...rebased.map((p) => p.y));
		updateNode(id, (n) => ({
			position: { x: n.position.x + minX, y: n.position.y + minY },
			width: Math.max(w, 1),
			height: Math.max(h, 1),
			data: { ...n.data, points: rebased }
		}));
	}

	// --- Dragging a control point ---------------------------------------------------------------
	let dragIndex = $state<number | null>(null);

	function startDrag(index: number, event: PointerEvent) {
		if (event.button !== 0) return;
		// Alt+click removes a point instead (never below the two endpoints).
		if (event.altKey) {
			if (points.length > 2) commit(points.filter((_, i) => i !== index));
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		dragIndex = index;
		(event.target as Element).setPointerCapture(event.pointerId);
	}

	function onDrag(event: PointerEvent) {
		if (dragIndex === null) return;
		event.preventDefault();
		event.stopPropagation();
		// Screen -> flow, then back to node-relative coordinates.
		const flow = screenToFlowPosition({ x: event.clientX, y: event.clientY });
		const next = points.map((p, i) =>
			i === dragIndex ? { x: flow.x - positionAbsoluteX, y: flow.y - positionAbsoluteY } : p
		);
		// Live update without rebasing -- rebasing mid-drag would shift the node under the cursor.
		updateNode(id, (n) => ({ data: { ...n.data, points: next } }));
	}

	function endDrag(event: PointerEvent) {
		if (dragIndex === null) return;
		event.stopPropagation();
		dragIndex = null;
		commit(points); // rebase once the drag settles
	}

	// Double-clicking the line inserts a point there, splitting whichever segment was nearest.
	function insertPoint(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		const flow = screenToFlowPosition({ x: event.clientX, y: event.clientY });
		const at = { x: flow.x - positionAbsoluteX, y: flow.y - positionAbsoluteY };

		let bestIndex = 1;
		let bestDist = Infinity;
		for (let i = 0; i < points.length - 1; i++) {
			const d = distanceToSegment(at, points[i], points[i + 1]);
			if (d < bestDist) {
				bestDist = d;
				bestIndex = i + 1;
			}
		}
		commit([...points.slice(0, bestIndex), at, ...points.slice(bestIndex)]);
	}

	function distanceToSegment(p: ArrowPoint, a: ArrowPoint, b: ArrowPoint) {
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const lenSq = dx * dx + dy * dy;
		const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
		return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
	}
</script>

<!-- The SVG overflows the node box by PAD on every side so the stroke, arrowhead, and grab dots are
     never clipped; pointer-events are off except on the line and the dots, so the canvas stays
     usable through the arrow's empty corners. -->
<div class="relative h-full w-full">
	<svg
		class="pointer-events-none absolute overflow-visible"
		style="left: {-PAD}px; top: {-PAD}px;"
		width={box.w + PAD * 2}
		height={box.h + PAD * 2}
	>
		<g transform="translate({PAD}, {PAD})">
			<!-- Fat invisible stroke: a comfortable hit target for double-click-to-add-point. -->
			<path
				d={path}
				fill="none"
				stroke="transparent"
				stroke-width="14"
				class="arrow-interactive cursor-pointer"
				ondblclick={insertPoint}
				role="presentation"
			/>
			<path
				d={path}
				fill="none"
				stroke={color}
				stroke-width={selected ? 3 : 2.5}
				stroke-linecap="round"
				stroke-linejoin="round"
				class="pointer-events-none"
			/>
			{#if head}
				<!-- Apex sits 2px past the endpoint (in tangent space) and the base is well behind it,
				     so the stroke's round cap is always buried inside the triangle -- no seam, whatever
				     the stroke width or curvature. -->
				<polygon
					points="2,0 -12,-6.5 -12,6.5"
					fill={color}
					transform="translate({head.x}, {head.y}) rotate({head.angle})"
					class="pointer-events-none"
				/>
			{/if}

			{#if selected}
				{#each points as p, i (i)}
					<circle
						cx={p.x}
						cy={p.y}
						r="5.5"
						fill="#1e1f22"
						stroke="#ffffff"
						stroke-width="2"
						class="nodrag arrow-interactive cursor-grab"
						onpointerdown={(e) => startDrag(i, e)}
						onpointermove={onDrag}
						onpointerup={endDrag}
						onpointercancel={endDrag}
						role="presentation"
					/>
				{/each}
			{/if}
		</g>
	</svg>
</div>

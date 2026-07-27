<script lang="ts">
	import { Position, useSvelteFlow, useStore, type BezierEdgeProps } from '@xyflow/svelte';
	import { type SplineData } from './splineStyle';
	import { hexToRgba } from './commentColors';
	import { splineSegments, type SplineSegment } from './splineChain.svelte';

	let {
		id,
		data,
		source,
		target,
		selected,
		interactionWidth,
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
	}: BezierEdgeProps & {
		data?: SplineData;
		source?: string;
		target?: string;
		selected?: boolean;
	} = $props();

	const { getNode } = useSvelteFlow();
	const store = useStore();
	const isKnot = (nodeId?: string) => (nodeId ? getNode(nodeId)?.type === 'reroute' : false);

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

	// This edge's own leg of the wire.
	const leg = $derived.by((): SplineSegment => {
		const sp = sourcePosition ?? Position.Right;
		const tp = targetPosition ?? Position.Left;
		// Signed deltas oriented "source toward target" / "target toward source".
		const [c1x, c1y] = controlPoint(sp, sourceX, sourceY, targetX - sourceX, targetY - sourceY, curvature);
		const [c2x, c2y] = controlPoint(tp, targetX, targetY, sourceX - targetX, sourceY - targetY, curvature);
		return { sx: sourceX, sy: sourceY, c1x, c1y, c2x, c2y, tx: targetX, ty: targetY };
	});

	// --- Who draws what -------------------------------------------------------------------------
	// A wire is drawn by the leg that leaves a real pin; the legs after each knot hand their shape
	// over and draw nothing but their own hit area. (A chain with no upstream edge at all -- a knot
	// left dangling -- draws itself, so it never vanishes.)
	const startsAtKnot = $derived(isKnot(source));
	const isHead = $derived(!startsAtKnot || !store.edges.some((e) => e.target === source));

	$effect(() => {
		if (!id || !startsAtKnot) return;
		splineSegments[id] = leg;
	});

	$effect(() => () => {
		if (id) delete splineSegments[id];
	});

	// Every route from this pin to a pin at the far end. Normally there's exactly one; a knot that
	// fans out to several nodes produces one run per branch, each drawn as its own continuous wire.
	type RunLeg = { seg: SplineSegment; selected: boolean };

	const runs = $derived.by((): RunLeg[][] => {
		if (!isHead) return [];
		const first: RunLeg[] = [{ seg: leg, selected: selected ?? false }];
		if (!isKnot(target)) return [first];

		const complete: RunLeg[][] = [];
		const pending: { run: RunLeg[]; knotId: string; seen: Set<string> }[] = [
			{ run: first, knotId: target!, seen: new Set([id ?? '']) }
		];

		while (pending.length && complete.length < 32) {
			const { run, knotId, seen } = pending.pop()!;
			const onward = store.edges.filter((e) => e.source === knotId && !seen.has(e.id));
			if (!onward.length) {
				complete.push(run);
				continue;
			}
			for (const edge of onward) {
				const seg = splineSegments[edge.id];
				// A leg that hasn't reported its shape yet (first frame): stop here rather than guess,
				// and pick it up on the next pass.
				if (!seg) {
					complete.push(run);
					continue;
				}
				const next = [...run, { seg, selected: edge.selected ?? false }];
				if (isKnot(edge.target)) {
					pending.push({ run: next, knotId: edge.target, seen: new Set([...seen, edge.id]) });
				} else {
					complete.push(next);
				}
			}
		}
		return complete;
	});

	// Stitch a run into one path: each leg's curve, joined by a short line across the knot itself. A
	// knot is a node with width, so its two pins sit a little apart -- bridging rather than lifting the
	// pen is what keeps the dash pattern running through the bend instead of restarting at it.
	function runPath(legs: RunLeg[]): string {
		let d = '';
		legs.forEach(({ seg }, i) => {
			d += i === 0 ? `M${seg.sx},${seg.sy}` : ` L${seg.sx},${seg.sy}`;
			d += ` C${seg.c1x},${seg.c1y} ${seg.c2x},${seg.c2y} ${seg.tx},${seg.ty}`;
		});
		return d;
	}

	const wires = $derived(runs.map(runPath));

	// Only the head draws, so selecting any leg of a wire has to light up that one path.
	const chainSelected = $derived(
		(selected ?? false) || runs.some((run) => run.some((leg) => leg.selected))
	);

	const pathClass = $derived(
		[
			'svelte-flow__edge-path',
			data?.solid ? 'spline-solid' : '',
			data?.flow === 'reverse' ? 'spline-reverse' : '',
			chainSelected ? 'spline-selected' : ''
		]
			.filter(Boolean)
			.join(' ')
	);
	// Left unset when the edge has no color of its own, so it keeps the stylesheet's default -- and
	// with it the blurple stroke a selected spline picks up.
	//
	// A colored wire carries its halo in its own hue, since a cyan glow around (say) a red spline reads
	// as the wrong color bleeding out of it. That also means the stylesheet's selection styling can't
	// reach it: both the stroke and the filter are inline. Selection instead shows as a brighter, wider
	// halo in the wire's own color -- keeping the color visible matters, because the wire is selected
	// the whole time you're picking one.
	const glow = $derived.by(() => {
		if (!data?.color) return '';
		const [near, far] = chainSelected ? [0.9, 0.55] : [0.7, 0.35];
		const [nearBlur, farBlur] = chainSelected ? [5, 12] : [3, 7];
		return `filter: drop-shadow(0 0 ${nearBlur}px ${hexToRgba(data.color, near)}) drop-shadow(0 0 ${farBlur}px ${hexToRgba(data.color, far)});`;
	});

	const stroke = $derived(
		[style, data?.color ? `stroke: ${data.color};` : '', glow].filter(Boolean).join(' ')
	);

	// Own leg only: each edge keeps its own hit area, so clicking a wire selects the piece under the
	// pointer (and the attributes panel edits the whole chain from there).
	const ownPath = $derived(
		`M${leg.sx},${leg.sy} C${leg.c1x},${leg.c1y} ${leg.c2x},${leg.c2y} ${leg.tx},${leg.ty}`
	);
</script>

{#each wires as wire, i (i)}
	<path
		id={i === 0 ? id : undefined}
		class={pathClass}
		d={wire}
		fill="none"
		marker-start={markerStart}
		marker-end={markerEnd}
		style={stroke}
	/>
{/each}

{#if (interactionWidth ?? 20) > 0}
	<path
		class="svelte-flow__edge-interaction"
		d={ownPath}
		fill="none"
		stroke-opacity="0"
		stroke-width={interactionWidth ?? 20}
	/>
{/if}

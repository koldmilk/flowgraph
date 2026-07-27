<script lang="ts">
	import {
		Handle,
		Position,
		useUpdateNodeInternals,
		type NodeProps,
		type Node
	} from '@xyflow/svelte';
	import { SELECTION_RING, SELECTION_GLOW } from '../nodeColors';

	type RerouteData = { inputPos?: Position; outputPos?: Position };

	let { id, data, selected }: NodeProps<Node<RerouteData>> = $props();

	// Which side each pin faces is decided by FlowEditor from the connected nodes' positions, so the
	// spline flows smoothly even when it doubles back (Unreal-style). Defaults suit L->R flow.
	const inputPos = $derived(data?.inputPos ?? Position.Left);
	const outputPos = $derived(data?.outputPos ?? Position.Right);

	// Tell Svelte Flow to re-measure whenever a pin flips sides, so edges recompute their curves.
	const updateNodeInternals = useUpdateNodeInternals();
	$effect(() => {
		inputPos;
		outputPos;
		updateNodeInternals(id);
	});

	// Zero-size handles pinned to the knot's center: connections always cross dead-center, while the
	// Position prop steers only the curve direction. pointer-events-none keeps the body draggable.
	const handleClass =
		'!h-0 !w-0 !min-h-0 !min-w-0 !border-0 !bg-transparent !pointer-events-none !left-1/2 !top-1/2 !right-auto !bottom-auto !m-0 !transform-none';
</script>

<!-- Unreal-style reroute knot: a spline appears to flow straight through it. It wears the wire's own
     cyan and glow (via the --spline vars) so the knot reads as part of the wire, not a bead on it. -->
<div
	class="h-2.5 w-2.5 rounded-full"
	style="background-color: var(--spline); box-shadow: {selected
		? `0 0 0 2px ${SELECTION_RING}, ${SELECTION_GLOW}`
		: 'var(--spline-glow-box)'};"
>
	<Handle type="target" position={inputPos} class={handleClass} />
	<Handle type="source" position={outputPos} class={handleClass} />
</div>

<script lang="ts">
	import {
		Handle,
		Position,
		useUpdateNodeInternals,
		type NodeProps,
		type Node
	} from '@xyflow/svelte';

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

<!-- Unreal-style reroute knot: a spline appears to flow straight through it. -->
<div
	class="h-4 w-4 rounded-full border-2 border-[#1e1f22] bg-[#80848e] {selected
		? 'ring-2 ring-[#5865f2]'
		: ''}"
>
	<Handle type="target" position={inputPos} class={handleClass} />
	<Handle type="source" position={outputPos} class={handleClass} />
</div>

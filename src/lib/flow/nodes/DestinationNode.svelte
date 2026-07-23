<script lang="ts">
	import { Handle, Position, type NodeProps, type Node } from '@xyflow/svelte';
	import NodeShell from './NodeShell.svelte';
	import { handleClass, handleStyle } from './handleStyle';
	import { defaultNodeColor } from '../nodeColors';

	type SignalNodeData = { label: string; description?: string; color?: string };

	let { id, data, selected }: NodeProps<Node<SignalNodeData>> = $props();

	const color = $derived(data.color ?? defaultNodeColor.destination);
</script>

<NodeShell {id} label={data.label} description={data.description} {color} {selected}>
	<Handle type="target" position={Position.Left} class={handleClass} style={handleStyle(color)} />
</NodeShell>

<script lang="ts">
	import { Handle, Position, type NodeProps, type Node } from '@xyflow/svelte';
	import NodeShell from './NodeShell.svelte';
	import { handleClass, handleStyle } from './handleStyle';
	import { defaultNodeColor } from '../nodeColors';

	type SignalNodeData = {
		label: string;
		description?: string;
		fullDescription?: boolean;
		color?: string;
	};

	let { id, data, selected }: NodeProps<Node<SignalNodeData>> = $props();

	const color = $derived(data.color ?? defaultNodeColor.source);
</script>

<NodeShell
	{id}
	label={data.label}
	description={data.description}
	showFullDescription={data.fullDescription}
	{color}
	{selected}
>
	<Handle type="source" position={Position.Right} class={handleClass} style={handleStyle(color)} />
</NodeShell>

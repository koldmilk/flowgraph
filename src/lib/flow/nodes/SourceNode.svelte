<script lang="ts">
	import { Handle, Position, type NodeProps, type Node } from '@xyflow/svelte';
	import NodeShell from './NodeShell.svelte';
	import { handleClass } from './handleStyle';

	type SignalNodeData = { label: string; subtitle?: string };

	let { data, selected }: NodeProps<Node<SignalNodeData>> = $props();
</script>

<NodeShell label={data.label} subtitle={data.subtitle} accent="green" {selected}>
	<Handle type="source" position={Position.Right} class={handleClass('green')} />
</NodeShell>

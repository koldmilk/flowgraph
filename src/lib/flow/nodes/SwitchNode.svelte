<script lang="ts">
	import {
		Handle,
		Position,
		useUpdateNodeInternals,
		type NodeProps,
		type Node
	} from '@xyflow/svelte';
	import NodeShell from './NodeShell.svelte';
	import { handleClass, handleStyle } from './handleStyle';
	import { defaultNodeColor } from '../nodeColors';
	import type { SwitchPin } from '../nodeCatalog';

	type SwitchNodeData = {
		label: string;
		description?: string;
		color?: string;
		inputs?: SwitchPin[];
		outputs?: SwitchPin[];
	};

	let { id, data, selected }: NodeProps<Node<SwitchNodeData>> = $props();

	const color = $derived(data.color ?? defaultNodeColor.switch);
	const inputs = $derived(data.inputs ?? []);
	const outputs = $derived(data.outputs ?? []);

	// The pin count is variable, so tell Svelte Flow to re-measure whenever pins are added or removed —
	// otherwise edges keep pointing at stale handle positions.
	const updateNodeInternals = useUpdateNodeInternals();
	$effect(() => {
		inputs.length;
		outputs.length;
		updateNodeInternals(id);
	});
</script>

<!-- Each pin is a row; its Handle is nudged out onto the node's edge (left: -13px offsets the body's
     px-3 padding + border) so the connection point sits on the border, level with the pin's name. -->
<NodeShell {id} label={data.label} description={data.description} {color} {selected}>
	<div class="flex justify-between gap-6 {data.description ? 'mt-3' : ''}">
		<div class="flex min-w-0 flex-col gap-2">
			{#each inputs as pin (pin.id)}
				<div class="relative flex items-center">
					<Handle
						type="target"
						position={Position.Left}
						id={pin.id}
						class={handleClass}
						style="{handleStyle(color)} left: -13px;"
					/>
					<span class="truncate text-xs text-[#c5c8ce]">{pin.name}</span>
				</div>
			{/each}
		</div>
		<div class="flex min-w-0 flex-col items-end gap-2">
			{#each outputs as pin (pin.id)}
				<div class="relative flex items-center justify-end">
					<span class="truncate text-xs text-[#c5c8ce]">{pin.name}</span>
					<Handle
						type="source"
						position={Position.Right}
						id={pin.id}
						class={handleClass}
						style="{handleStyle(color)} right: -13px;"
					/>
				</div>
			{/each}
		</div>
	</div>
</NodeShell>

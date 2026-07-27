<script lang="ts">
	import {
		Handle,
		Position,
		useUpdateNodeInternals,
		type NodeProps,
		type Node
	} from '@xyflow/svelte';
	import NodeDescription from './NodeDescription.svelte';
	import { handleClass, handleStyle } from './handleStyle';
	import { defaultNodeColor, mixHex, selectionShadow } from '../nodeColors';
	import type { SwitchPin } from '../nodeCatalog';

	// A collapsed subgraph. graphId points at the nested graph its contents live in; double-clicking
	// the node (handled in FlowEditor) opens that graph in its own tab. Its named input/output pins are
	// its outer-facing interface, managed from the attributes panel just like a switch node.
	type GroupNodeData = {
		label: string;
		description?: string;
		fullDescription?: boolean;
		color?: string;
		graphId: string;
		inputs?: SwitchPin[];
		outputs?: SwitchPin[];
	};

	let { id, data, selected }: NodeProps<Node<GroupNodeData>> = $props();

	const color = $derived(data.color ?? defaultNodeColor.group);
	// A single flat fill, dulled a touch by blending toward the canvas bg, with a darker stroke a few
	// shades below the fill so the node reads as one solid color with a clean outline.
	const fill = $derived(mixHex(color, '#1e1f22', 0.82));
	const stroke = $derived(mixHex(color, '#000000', 0.6));
	const inputs = $derived(data.inputs ?? []);
	const outputs = $derived(data.outputs ?? []);

	// Re-measure when pins are added/removed so edges track the new handle positions.
	const updateNodeInternals = useUpdateNodeInternals();
	$effect(() => {
		inputs.length;
		outputs.length;
		updateNodeInternals(id);
	});
</script>

<!-- Collapsed-subgraph node: a single flat color (a subgraph glyph in the header marks what it is). -->
<div
	class="relative min-w-47.5 max-w-59.5 rounded-[10px] border shadow-lg shadow-black/40"
	style="background-color: {fill}; border-color: {stroke}; {selected ? selectionShadow : ''}"
>
	<div class="flex items-center gap-1.5 border-b border-black/20 px-3 py-1.5">
		<svg
			class="h-3.5 w-3.5 shrink-0 text-white/90"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<rect x="3" y="3" width="7" height="7" rx="1.5" />
			<rect x="14" y="3" width="7" height="7" rx="1.5" />
			<rect x="3" y="14" width="7" height="7" rx="1.5" />
			<rect x="14" y="14" width="7" height="7" rx="1.5" />
		</svg>
		<div
			class="text-[13px] font-semibold leading-tight wrap-break-word whitespace-pre-wrap text-white"
		>
			{data.label}
		</div>
	</div>

	<!-- Pin rows: each Handle is nudged onto the card edge (offsets the px-3 body padding + border) so
	     the connection point sits on the border, level with the pin's name. -->
	<div class="px-3 py-2">
		{#if data.description}
			<NodeDescription
				value={data.description}
				showFull={data.fullDescription}
				class="mb-2 text-xs text-white/80"
			/>
		{/if}

		<div class="flex justify-between gap-6">
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
						<span class="truncate text-xs text-white/85">{pin.name}</span>
					</div>
				{/each}
			</div>
			<div class="flex min-w-0 flex-col items-end gap-2">
				{#each outputs as pin (pin.id)}
					<div class="relative flex items-center justify-end">
						<span class="truncate text-xs text-white/85">{pin.name}</span>
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

		<div class="mt-2 flex items-center gap-1 text-[10px] text-white/60">
			<svg class="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
			Double-click to open
		</div>
	</div>
</div>

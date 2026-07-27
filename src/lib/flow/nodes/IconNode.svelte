<script lang="ts">
	import { Handle, Position, type NodeProps, type Node } from '@xyflow/svelte';
	import NodeShell from './NodeShell.svelte';
	import DescriptionPopover from './DescriptionPopover.svelte';
	import IconGlyph from '../icons/IconGlyph.svelte';
	import { handleClass, handleStyle } from './handleStyle';
	import { defaultNodeColor, nodeColorStyles, selectionShadow } from '../nodeColors';
	import { DEFAULT_ICON, DEFAULT_ICON_STYLE, type IconStyle } from '../materialIcons';

	// A Material icon wired into the flow: one input, one output. The name is optional -- without it
	// the node collapses to a bare glyph, so a chain of icons reads as symbols rather than as a row of
	// titled boxes. Give it a name and it takes the same shell as every other node.
	type IconNodeData = {
		label?: string;
		description?: string;
		fullDescription?: boolean;
		color?: string;
		icon?: string;
		iconStyle?: IconStyle;
	};

	let { id, data, selected }: NodeProps<Node<IconNodeData>> = $props();

	const color = $derived(data.color ?? defaultNodeColor.icon);
	const styles = $derived(nodeColorStyles(color));
	const icon = $derived(data.icon ?? DEFAULT_ICON);
	const iconStyle = $derived(data.iconStyle ?? DEFAULT_ICON_STYLE);
	const label = $derived(data.label?.trim() ?? '');

	// Glyph size in px, shared by both layouts so a node doesn't resize its icon when you name it.
	// Sized to nearly fill the compact square (72px), leaving just enough margin for the border.
	const GLYPH = 52;
</script>

{#snippet pins()}
	<Handle type="target" position={Position.Left} class={handleClass} style={handleStyle(color)} />
	<Handle type="source" position={Position.Right} class={handleClass} style={handleStyle(color)} />
{/snippet}

{#if label}
	<NodeShell
		{id}
		{label}
		description={data.description}
		showFullDescription={data.fullDescription}
		{color}
		{selected}
	>
		<div class="flex justify-center py-1" style="color: {color};">
			<IconGlyph name={icon} style={iconStyle} size={GLYPH} />
		</div>
		{@render pins()}
	</NodeShell>
{:else}
	<!-- Unnamed: a square just big enough for the glyph, keeping the border/selection treatment of a
	     full node so it still reads as part of the graph. There's no room for a description here, so
	     the whole square becomes the hover target for one. -->
	<DescriptionPopover value={data.description ?? ''} enabled={!!data.description}>
		<div
			class="relative flex h-18 w-18 items-center justify-center rounded-[10px] border shadow-lg shadow-black/40"
			style="{styles.border} {styles.body} color: {color}; {selected ? selectionShadow : ''}"
		>
			<IconGlyph name={icon} style={iconStyle} size={GLYPH} />
			{@render pins()}
		</div>
	</DescriptionPopover>
{/if}

<script lang="ts">
	import type { NodeProps, Node } from '@xyflow/svelte';
	import MarkdownView from '../MarkdownView.svelte';
	import { mixHex, nodeColorStyles, defaultNodeColor, selectionShadow } from '../nodeColors';

	// A standalone note: markdown text in a colored box. It carries no handles, so nothing can be
	// wired to it -- it's an annotation that floats on the canvas.
	type TextNodeData = { description?: string; color?: string };

	let { data, selected }: NodeProps<Node<TextNodeData>> = $props();

	const color = $derived(data.color ?? defaultNodeColor.text);
	// A dark tinted fill (like the other nodes' bodies) keeps the markdown readable, while the border
	// and the left accent bar carry the chosen color.
	const fill = $derived(mixHex(color, '#1e1f22', 0.16));
	const border = $derived(nodeColorStyles(color).border);
	const text = $derived(data.description ?? '');
</script>

<div
	class="relative min-w-52 max-w-80 overflow-hidden rounded-[10px] border shadow-lg shadow-black/40"
	style="background-color: {fill}; {border} {selected ? selectionShadow : ''}"
>
	<!-- Left accent bar: the color reads at a glance without washing out the text. -->
	<div class="absolute inset-y-0 left-0 w-1" style="background-color: {color};"></div>

	<div class="py-2 pr-3 pl-4">
		{#if text.trim()}
			<MarkdownView value={text} class="text-xs text-[#dbdee1]" />
		{:else}
			<span class="text-xs text-[#949ba4] italic">Empty note — add text in the attributes panel</span>
		{/if}
	</div>
</div>

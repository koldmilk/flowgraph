<script lang="ts">
	import type { Snippet } from 'svelte';
	import { NodeResizeControl } from '@xyflow/svelte';
	import { SELECTION_RING, SELECTION_GLOW } from '../nodeColors';

	// Shared chrome for the media nodes (images, video, audio): a white-bordered box with a corner grip
	// that scales it. Pictures and video keep their aspect ratio locked, since stretching them is never
	// what you want -- the node's box is expected to already match the content's proportions. An audio
	// player has no proportions to preserve, so it opts out.
	let {
		selected = false,
		minWidth = 60,
		minHeight = 60,
		keepAspectRatio = true,
		children
	}: {
		selected?: boolean;
		minWidth?: number;
		minHeight?: number;
		keepAspectRatio?: boolean;
		children?: Snippet;
	} = $props();
</script>

<div class="relative h-full w-full">
	<div
		class="h-full w-full overflow-hidden rounded-lg border-2 border-white"
		style={selected ? `box-shadow: 0 0 0 2px ${SELECTION_RING}, ${SELECTION_GLOW};` : ''}
	>
		{@render children?.()}
	</div>

	<!-- Resize grip: a short leader line running out past the bottom-right corner to a small circle,
	     so the grab point sits clear of the content instead of overlapping it. -->
	<NodeResizeControl
		position="bottom-right"
		{minWidth}
		{minHeight}
		{keepAspectRatio}
		autoScale={false}
		class="media-grip"
	>
		<svg class="pointer-events-none h-full w-full overflow-visible" viewBox="0 0 24 24">
			<path d="M2 2 L12 12" stroke="#ffffff" stroke-width="2" stroke-linecap="round" fill="none" />
			<circle cx="16.5" cy="16.5" r="4.5" fill="none" stroke="#ffffff" stroke-width="2" />
		</svg>
	</NodeResizeControl>
</div>

<style>
	/* The three-class selector out-specifies the library's `.svelte-flow__resize-control.handle`,
	   whose 5px white square we replace outright. translate:0 anchors the box's top-left on the
	   node's corner so the grip reads as extending outward from it. */
	:global(.svelte-flow__resize-control.handle.media-grip) {
		width: 24px;
		height: 24px;
		border: none;
		border-radius: 0;
		background: transparent;
		translate: 0 0;
	}
</style>

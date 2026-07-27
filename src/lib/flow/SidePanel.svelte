<script lang="ts">
	import { scale } from 'svelte/transition';
	import type { Component, Snippet } from 'svelte';

	// The chrome shared by every right-hand panel (attributes, settings): a full-height card anchored
	// to the top-right corner, with a header whose icon collapses it back to the dock. The card scales
	// out of the corner it's anchored to, so it appears to grow from the dock button that opened it.
	//
	// Only one panel is open at a time -- they all occupy the same spot -- so the editor owns which one
	// is showing and each panel just reports that it wants to close.
	let {
		title,
		icon: Icon,
		onclose,
		children
	}: {
		title: string;
		// The same glyph as this panel's dock button, so the header reads as "this is what you opened".
		icon: Component<{ class?: string }>;
		onclose: () => void;
		children: Snippet;
	} = $props();
</script>

<div
	transition:scale={{ duration: 150, start: 0.85, opacity: 0 }}
	style="transform-origin: top right;"
	class="pointer-events-auto absolute top-4 right-4 bottom-4 z-30 flex w-lg flex-col overflow-hidden rounded-xl border border-black/40 bg-[#2b2d31] text-[#dbdee1] shadow-2xl shadow-black/60 ring-1 ring-white/5"
>
	<div class="flex items-center gap-2 border-b border-black/30 px-2 py-2">
		<button
			type="button"
			class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]"
			title="Collapse panel"
			aria-label="Collapse panel"
			onclick={onclose}
		>
			<Icon class="h-6 w-6" />
		</button>
		<span class="text-sm font-semibold tracking-wide">{title}</span>
	</div>

	<div class="flex-1 overflow-y-auto p-3">
		{@render children()}
	</div>
</div>

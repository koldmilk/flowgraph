<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import MarkdownView from '../MarkdownView.svelte';
	import { portal } from './portal';

	// Hover a node, get its full description in a floating box. Wraps whatever should act as the hover
	// target -- a clamped description, or the whole node for the types that never show one on canvas.
	let {
		value,
		enabled = true,
		class: className = '',
		children
	}: {
		value: string;
		// False when there's nothing hidden to reveal, so hovering does nothing.
		enabled?: boolean;
		class?: string;
		children?: Snippet;
	} = $props();

	// Long enough that the box only shows up when you've settled on a node, rather than flashing at
	// everything the pointer crosses on its way somewhere else.
	const HOVER_DELAY = 1200;

	// Popover geometry, in screen coordinates. Null while hidden.
	const WIDTH = 320;
	const MARGIN = 12;

	let anchor = $state<HTMLElement | null>(null);
	let tip = $state<{ x: number; y: number; below: boolean } | null>(null);
	let timer: ReturnType<typeof setTimeout> | null = null;

	function show() {
		if (!enabled || !value.trim() || !anchor) return;
		if (timer) clearTimeout(timer);
		timer = setTimeout(place, HOVER_DELAY);
	}

	// Measured when the box actually opens, not when the hover started -- the node may have moved.
	function place() {
		if (!anchor) return;
		const rect = anchor.getBoundingClientRect();
		// Open away from the nearer edge, so the popover has room to grow.
		const below = rect.top < window.innerHeight / 2;
		tip = {
			x: Math.min(
				Math.max(rect.left + rect.width / 2, WIDTH / 2 + MARGIN),
				window.innerWidth - WIDTH / 2 - MARGIN
			),
			y: below ? rect.bottom + 8 : rect.top - 8,
			below
		};
	}

	// Placed once, from where the node was standing: dragging the node or panning the canvas would
	// leave it stranded, so a press dismisses it (and cancels a pending open).
	function hide() {
		if (timer) clearTimeout(timer);
		timer = null;
		tip = null;
	}

	// A node can be deleted mid-countdown; don't fire into a torn-down component.
	$effect(() => () => {
		if (timer) clearTimeout(timer);
	});
</script>

<div
	bind:this={anchor}
	class={className}
	onpointerenter={show}
	onpointerleave={hide}
	onpointerdown={hide}
	role="presentation"
>
	{@render children?.()}
</div>

{#if tip}
	<div
		use:portal
		in:fade={{ duration: 260 }}
		out:fade={{ duration: 140 }}
		class="pointer-events-none fixed z-45 max-h-[60vh] overflow-hidden rounded-lg border border-black/40 bg-[#2b2d31] p-2.5 shadow-2xl shadow-black/60"
		style="left: {tip.x}px; top: {tip.y}px; width: {WIDTH}px; transform: translateX(-50%) {tip.below
			? ''
			: 'translateY(-100%)'};"
	>
		<MarkdownView {value} class="text-xs text-[#dbdee1]" />
	</div>
{/if}

<script lang="ts">
	import MarkdownView from '../MarkdownView.svelte';
	import DescriptionPopover from './DescriptionPopover.svelte';
	import { DESCRIPTION_LIMIT, clampDescription } from './description';

	// A node's description on the canvas: clamped by default, with the full text a hover away. The
	// attributes panel has a per-node switch to pin it open instead.
	let {
		value,
		showFull = false,
		class: className = ''
	}: {
		value: string;
		showFull?: boolean;
		class?: string;
	} = $props();

	const clamped = $derived(value.length > DESCRIPTION_LIMIT);
	const shown = $derived(clamped && !showFull ? clampDescription(value) : value);
</script>

<DescriptionPopover {value} enabled={clamped && !showFull} class={className}>
	<MarkdownView value={shown} />
</DescriptionPopover>

<script lang="ts">
	import { Background, BackgroundVariant, useStore } from '@xyflow/svelte';
	import { settings } from './settings.svelte';

	// The canvas backdrop. Rendered as a child of <SvelteFlow> so it can read the live viewport.
	//
	// Lines and crosses get Unreal's two-tier treatment: a fine cell grid with a heavier rule every few
	// cells. The pair is what gives the canvas a sense of scale -- the rules stay readable when you
	// zoom away, while the cells only earn their place close in, so they fade out rather than
	// collapsing into a smear. Dots stay single-tier; they're already sparse enough to read at any zoom.
	const store = useStore();
	// `|| 1` guards the divisions below against a zero zoom before the viewport is initialized.
	const zoom = $derived(store.viewport.zoom || 1);

	// Cells per rule. Eight matches the blueprint editor and divides evenly, so every rule lands on a
	// cell boundary instead of drifting between them.
	const CELLS_PER_RULE = 8;

	// How much room a cell needs on screen (px) before it's worth drawing: below FADE_START the cells
	// are too tight to read as a grid and just muddy the background, and they reach full strength at
	// FADE_FULL. Fading across the gap keeps the grid from popping in mid-zoom.
	const FADE_START = 7;
	const FADE_FULL = 16;

	const cellGap = $derived(settings.gridSize);
	const ruleGap = $derived(settings.gridSize * CELLS_PER_RULE);
	const cellFade = $derived(
		Math.min(1, Math.max(0, (cellGap * zoom - FADE_START) / (FADE_FULL - FADE_START)))
	);

	// Line tiers are darker than the background rather than lighter, the way Unreal etches its grid
	// into the canvas -- so the wires and nodes stay the brightest things on screen. The rules are the
	// darker and thicker of the two.
	const etch = (alpha: number) => `rgba(0, 0, 0, ${alpha.toFixed(3)})`;

	const CELL_ALPHA = 0.3;
	const RULE_ALPHA = 0.55;

	// Crosses go the other way: grey marks drawn over the background, in the same muted tone as the
	// dots. They're isolated ticks rather than continuous lines, so etching them into the canvas
	// leaves too little to see.
	const grey = (alpha: number) => `rgba(148, 155, 164, ${alpha.toFixed(3)})`;

	const CROSS_CELL_ALPHA = 0.28;
	const CROSS_RULE_ALPHA = 0.5;

	const CELL_WIDTH = 0.6;
	const RULE_WIDTH = 1.25;

	// Cross arm length. `size` is in flow units, so dividing by the zoom holds the mark at a fixed size
	// on screen: a reference tick shouldn't grow into a plus sign as you zoom in, and shouldn't shrink
	// to a dot as you pull back. Rules get the longer arms.
	const CELL_MARK_PX = 5;
	const RULE_MARK_PX = 10;

	const BG_COLOR = '#1e1f22';
	const DOT_COLOR = '#3f4147';
</script>

<!-- Cells first, rules over the top: a rule shares its position with every eighth cell, and it should
     be the one you see there. The upper layer has to be transparent or it would paint over the lower
     one (an unset bgColor falls back to the theme's own dark fill). -->
{#if settings.gridPattern === 'lines'}
	<Background
		id="cells"
		variant={BackgroundVariant.Lines}
		gap={cellGap}
		lineWidth={CELL_WIDTH}
		patternColor={etch(CELL_ALPHA * cellFade)}
		bgColor={BG_COLOR}
	/>
	<Background
		id="rules"
		variant={BackgroundVariant.Lines}
		gap={ruleGap}
		lineWidth={RULE_WIDTH}
		patternColor={etch(RULE_ALPHA)}
		bgColor="transparent"
	/>
{:else if settings.gridPattern === 'cross'}
	<Background
		id="cross-cells"
		variant={BackgroundVariant.Cross}
		gap={cellGap}
		size={CELL_MARK_PX / zoom}
		lineWidth={CELL_WIDTH}
		patternColor={grey(CROSS_CELL_ALPHA * cellFade)}
		bgColor={BG_COLOR}
	/>
	<Background
		id="cross-rules"
		variant={BackgroundVariant.Cross}
		gap={ruleGap}
		size={RULE_MARK_PX / zoom}
		lineWidth={RULE_WIDTH}
		patternColor={grey(CROSS_RULE_ALPHA)}
		bgColor="transparent"
	/>
{:else if settings.gridPattern === 'dots'}
	<Background
		id="dots"
		variant={BackgroundVariant.Dots}
		gap={settings.gridSize}
		size={1}
		patternColor={DOT_COLOR}
		bgColor={BG_COLOR}
	/>
{/if}

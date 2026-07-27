<script lang="ts">
	import { iconUrl, iconLabel, DEFAULT_ICON_STYLE, type IconStyle } from '../materialIcons';

	// A Material icon, drawn as a mask rather than an <img>. The source SVGs have no fill of their own
	// (they render black), so masking is what lets an icon take the node's color -- and it costs one
	// cached request per icon instead of inlining any markup. Two-tone icons keep their two levels,
	// since the mask carries their alpha through.
	let {
		name,
		style = DEFAULT_ICON_STYLE,
		size = 24,
		title
	}: {
		name: string;
		style?: IconStyle;
		size?: number;
		// Omit for decoration inside an already-labelled control; pass one when the glyph stands alone.
		title?: string;
	} = $props();

	const mask = $derived(`url("${iconUrl(name, style)}") center / contain no-repeat`);
</script>

<span
	class="inline-block shrink-0 align-middle"
	style="width: {size}px; height: {size}px; background-color: currentColor; mask: {mask}; -webkit-mask: {mask};"
	role="img"
	aria-label={title ?? iconLabel(name)}
></span>

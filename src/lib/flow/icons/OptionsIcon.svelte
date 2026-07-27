<script lang="ts">
	// ion "options-outline". Drawn on a 512 grid, so the stroke width is scaled to match: the rest of
	// the UI uses 24-unit icons at stroke-width 2.
	let { class: cls = 'h-5 w-5' }: { class?: string } = $props();
</script>

<svg
	class={cls}
	viewBox="0 0 512 512"
	fill="none"
	stroke="currentColor"
	stroke-width="32"
	stroke-linecap="round"
	stroke-linejoin="round"
>
	<path d="M368 128h80m-384 0h240m64 256h80m-384 0h240m-96-128h240m-384 0h80" />
	<circle cx="336" cy="128" r="32" />
	<circle cx="176" cy="256" r="32" />
	<circle cx="336" cy="384" r="32" />
</svg>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { accentTheme, type Accent } from './theme';

	let {
		label,
		subtitle,
		accent,
		selected = false,
		children
	}: {
		label: string;
		subtitle?: string;
		accent: Accent;
		selected?: boolean;
		children?: Snippet;
	} = $props();

	const theme = $derived(accentTheme[accent]);
</script>

<div
	class="relative min-w-47.5 rounded-[10px] border shadow-lg shadow-black/40 {theme.border} {selected
		? `ring-2 ring-offset-0 ${theme.ring}`
		: ''}"
>
	<div class="rounded-t-[9px] px-3 py-1.5 {theme.header}">
		<div class="truncate text-[13px] font-semibold leading-tight text-white">{label}</div>
	</div>
	<div class="rounded-b-[9px] px-3 py-2 {theme.body}">
		{#if subtitle}
			<div class="text-xs text-[#949ba4]">{subtitle}</div>
		{/if}
		{@render children?.()}
	</div>
</div>

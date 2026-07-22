<script lang="ts">
	import { accentTheme } from './nodes/theme';
	import { nodeCatalog, type SignalNodeType } from './nodeCatalog';

	let {
		x,
		y,
		options,
		onselect,
		onclose
	}: {
		x: number;
		y: number;
		options: SignalNodeType[];
		onselect: (type: SignalNodeType) => void;
		onclose: () => void;
	} = $props();
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && onclose()} />

<div
	class="fixed inset-0 z-40"
	onpointerdown={onclose}
	role="presentation"
></div>

<div
	data-context-menu
	class="fixed z-50 min-w-44 rounded-lg border border-black/40 bg-[#2b2d31] p-1 shadow-2xl shadow-black/60"
	style="left: {x}px; top: {y}px;"
>
	<div class="px-2 py-1.5 text-[11px] font-semibold tracking-wide text-[#949ba4] uppercase">
		Add Node
	</div>
	{#each options as type (type)}
		<button
			type="button"
			class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[#dbdee1] hover:bg-[#35373c]"
			onclick={() => onselect(type)}
		>
			<span class="h-2.5 w-2.5 rounded-full {accentTheme[nodeCatalog[type].accent].header}"></span>
			{nodeCatalog[type].label}
		</button>
	{/each}
</div>

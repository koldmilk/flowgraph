<script lang="ts">
	import { accentTheme } from './nodes/theme';
	import { nodeCatalog, type PanelNodeType } from './nodeCatalog';

	let {
		x,
		y,
		canPaste,
		onadd,
		oncomment,
		onpaste,
		onclose
	}: {
		x: number;
		y: number;
		canPaste: boolean;
		onadd: (type: PanelNodeType) => void;
		oncomment: () => void;
		onpaste: () => void;
		onclose: () => void;
	} = $props();

	const types: PanelNodeType[] = ['source', 'destination', 'sourceDestination', 'switch'];
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && onclose()} />

<div class="fixed inset-0 z-40" onpointerdown={onclose} role="presentation"></div>

<div
	data-context-menu
	class="fixed z-50 min-w-48 rounded-lg border border-black/40 bg-[#2b2d31] p-1 shadow-2xl shadow-black/60"
	style="left: {x}px; top: {y}px;"
>
	<div class="px-2 py-1.5 text-[11px] font-semibold tracking-wide text-[#949ba4] uppercase">
		Add Node
	</div>
	{#each types as type (type)}
		<button
			type="button"
			class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[#dbdee1] hover:bg-[#35373c]"
			onclick={() => onadd(type)}
		>
			<span class="h-2.5 w-2.5 rounded-full {accentTheme[nodeCatalog[type].accent].header}"></span>
			{nodeCatalog[type].label}
		</button>
	{/each}

	<div class="my-1 h-px bg-white/10"></div>

	<button
		type="button"
		class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[#dbdee1] hover:bg-[#35373c]"
		onclick={oncomment}
	>
		<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<rect x="3" y="4" width="18" height="14" rx="2" stroke-linejoin="round" />
			<path d="M8 21l4-3" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
		Add Comment
	</button>

	<div class="my-1 h-px bg-white/10"></div>

	<button
		type="button"
		disabled={!canPaste}
		class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[#dbdee1] hover:bg-[#35373c] disabled:cursor-default disabled:text-[#5c5e66] disabled:hover:bg-transparent"
		onclick={onpaste}
	>
		<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke-linecap="round" stroke-linejoin="round" />
			<rect x="9" y="3" width="6" height="4" rx="1" stroke-linejoin="round" />
		</svg>
		Paste
	</button>
</div>

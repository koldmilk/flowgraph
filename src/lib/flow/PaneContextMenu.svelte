<script lang="ts">
	import { accentTheme } from './nodes/theme';
	import { nodeCatalog, type PanelNodeType } from './nodeCatalog';
	import { YOUTUBE_ENABLED } from './youtube';

	let {
		x,
		y,
		canPaste,
		selectedCount,
		onadd,
		oncomment,
		oncollapse,
		onpaste,
		onclose
	}: {
		x: number;
		y: number;
		canPaste: boolean;
		// How many collapsible nodes are selected — right-clicking empty space with a live selection
		// still offers to collapse it, so you don't have to aim at a node.
		selectedCount: number;
		// `extra` seeds the new node's data (which kind of file a media node should ask for).
		onadd: (type: PanelNodeType, extra?: Record<string, unknown>) => void;
		oncomment: () => void;
		oncollapse: () => void;
		onpaste: () => void;
		onclose: () => void;
	} = $props();

	const types: PanelNodeType[] = ['source', 'destination', 'sourceDestination', 'switch', 'icon'];

	// Media flyout: opens on hover, to the right unless it would overflow the viewport, in which case
	// it flips left. Mirrors the Convert submenu in the node context menu.
	let menuEl: HTMLDivElement;
	let mediaOpen = $state(false);
	let mediaSide = $state<'right' | 'left'>('right');
	const SUBMENU_WIDTH = 208;

	function openMedia() {
		const rect = menuEl.getBoundingClientRect();
		mediaSide = rect.right + SUBMENU_WIDTH > window.innerWidth ? 'left' : 'right';
		mediaOpen = true;
	}
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && onclose()} />

<div class="fixed inset-0 z-40" onpointerdown={onclose} role="presentation"></div>

<div
	bind:this={menuEl}
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

	<button
		type="button"
		class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[#dbdee1] hover:bg-[#35373c]"
		onclick={() => onadd('text')}
	>
		<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<rect x="3" y="4" width="18" height="16" rx="2" stroke-linejoin="round" />
			<path d="M7 9h10M7 13h7" stroke-linecap="round" />
		</svg>
		Add Text Box
	</button>

	<!-- Media: images, video and audio live together in a flyout to keep the top level short. -->
	<div
		class="relative"
		role="presentation"
		onmouseenter={openMedia}
		onmouseleave={() => (mediaOpen = false)}
	>
		<button
			type="button"
			class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[#dbdee1] hover:bg-[#35373c] {mediaOpen
				? 'bg-[#35373c]'
				: ''}"
		>
			<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<rect x="3" y="4" width="18" height="16" rx="2" stroke-linejoin="round" />
				<circle cx="8.5" cy="9.5" r="1.5" />
				<path d="M21 16l-5-5-6 6-3-3-4 4" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
			Add Media
			<svg
				class="ml-auto h-4 w-4 text-[#949ba4]"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</button>

		{#if mediaOpen}
			<div
				class="absolute top-0 min-w-52 rounded-lg border border-black/40 bg-[#2b2d31] p-1 shadow-2xl shadow-black/60"
				class:left-full={mediaSide === 'right'}
				class:right-full={mediaSide === 'left'}
				style="{mediaSide === 'right' ? 'margin-left' : 'margin-right'}: -2px;"
			>
				<button
					type="button"
					class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[#dbdee1] hover:bg-[#35373c]"
					onclick={() => onadd('media', { kind: 'image' })}
				>
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="4" width="18" height="16" rx="2" stroke-linejoin="round" />
						<circle cx="8.5" cy="9.5" r="1.5" />
						<path d="M21 16l-5-5-6 6-3-3-4 4" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
					Image
				</button>
				<button
					type="button"
					class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[#dbdee1] hover:bg-[#35373c]"
					onclick={() => onadd('media', { kind: 'video' })}
				>
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="2" y="5" width="14" height="14" rx="2" stroke-linejoin="round" />
						<path d="M16 10.5l6-3.5v10l-6-3.5z" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
					Video
				</button>
				<button
					type="button"
					class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[#dbdee1] hover:bg-[#35373c]"
					onclick={() => onadd('media', { kind: 'audio' })}
				>
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M9 18V5l10-2v13" stroke-linecap="round" stroke-linejoin="round" />
						<circle cx="6" cy="18" r="3" />
						<circle cx="16" cy="16" r="3" />
					</svg>
					Audio
				</button>
				{#if YOUTUBE_ENABLED}
					<button
						type="button"
						class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[#dbdee1] hover:bg-[#35373c]"
						onclick={() => onadd('youtube')}
					>
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="2" y="5" width="20" height="14" rx="4" stroke-linejoin="round" />
							<path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor" stroke-linejoin="round" />
						</svg>
						YouTube Video
					</button>
				{/if}
			</div>
		{/if}
	</div>

	<button
		type="button"
		class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[#dbdee1] hover:bg-[#35373c]"
		onclick={() => onadd('arrow')}
	>
		<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M4 19c6-1 9-5 13-13" stroke-linecap="round" />
			<path d="M12 4h5v5" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
		Add Arrow
	</button>

	{#if selectedCount > 0}
		<button
			type="button"
			class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[#dbdee1] hover:bg-[#35373c]"
			onclick={oncollapse}
		>
			<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<rect x="3" y="3" width="7" height="7" rx="1.5" />
				<rect x="14" y="3" width="7" height="7" rx="1.5" />
				<rect x="3" y="14" width="7" height="7" rx="1.5" />
				<rect x="14" y="14" width="7" height="7" rx="1.5" />
			</svg>
			Collapse Nodes
			<span class="ml-auto text-xs text-[#949ba4]">Ctrl+G</span>
		</button>
	{/if}

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

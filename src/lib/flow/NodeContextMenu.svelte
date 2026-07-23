<script lang="ts">
	import { accentTheme } from './nodes/theme';
	import { nodeCatalog, type SignalNodeType } from './nodeCatalog';

	let {
		x,
		y,
		count,
		convertTypes,
		canPaste,
		oncopy,
		oncut,
		onpaste,
		oncomment,
		onconvert,
		ondelete,
		onclose
	}: {
		x: number;
		y: number;
		count: number;
		convertTypes: SignalNodeType[];
		canPaste: boolean;
		oncopy: () => void;
		oncut: () => void;
		onpaste: () => void;
		oncomment: () => void;
		onconvert: (type: SignalNodeType) => void;
		ondelete: () => void;
		onclose: () => void;
	} = $props();

	const label = (verb: string) => (count > 1 ? `${verb} ${count} nodes` : `${verb} node`);

	// Convert flyout: opens on hover, to the right of the menu unless it would overflow the
	// viewport, in which case it flips to the left. Sized to match the main menu width.
	let menuEl: HTMLDivElement;
	let submenuOpen = $state(false);
	let submenuSide = $state<'right' | 'left'>('right');
	const SUBMENU_WIDTH = 208;

	function openSubmenu() {
		const rect = menuEl.getBoundingClientRect();
		submenuSide = rect.right + SUBMENU_WIDTH > window.innerWidth ? 'left' : 'right';
		submenuOpen = true;
	}
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && onclose()} />

<div class="fixed inset-0 z-40" onpointerdown={onclose} role="presentation"></div>

<div
	bind:this={menuEl}
	data-context-menu
	class="fixed z-50 min-w-44 rounded-lg border border-black/40 bg-[#2b2d31] p-1 shadow-2xl shadow-black/60"
	style="left: {x}px; top: {y}px;"
>
	<button
		type="button"
		class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[#dbdee1] hover:bg-[#35373c]"
		onclick={oncopy}
	>
		<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<rect x="9" y="9" width="11" height="11" rx="2" stroke-linejoin="round" />
			<path d="M5 15V5a2 2 0 0 1 2-2h10" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
		{label('Copy')}
	</button>
	<button
		type="button"
		class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[#dbdee1] hover:bg-[#35373c]"
		onclick={oncut}
	>
		<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<circle cx="6" cy="6" r="3" />
			<circle cx="6" cy="18" r="3" />
			<path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
		{label('Cut')}
	</button>
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
		{label('Comment')}
	</button>

	{#if convertTypes.length}
		<!-- Convert node: hovering opens a flyout of the other node types to transform into. -->
		<div
			class="relative"
			role="presentation"
			onmouseenter={openSubmenu}
			onmouseleave={() => (submenuOpen = false)}
		>
			<button
				type="button"
				class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[#dbdee1] hover:bg-[#35373c] {submenuOpen
					? 'bg-[#35373c]'
					: ''}"
			>
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M4 8h13l-3-3M20 16H7l3 3" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
				{count > 1 ? 'Convert nodes' : 'Convert node'}
				<svg class="ml-auto h-4 w-4 text-[#949ba4]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</button>

			{#if submenuOpen}
				<div
					class="absolute top-0 min-w-52 rounded-lg border border-black/40 bg-[#2b2d31] p-1 shadow-2xl shadow-black/60"
					class:left-full={submenuSide === 'right'}
					class:right-full={submenuSide === 'left'}
					style="{submenuSide === 'right' ? 'margin-left' : 'margin-right'}: -2px;"
				>
					<div class="px-2 py-1.5 text-[11px] font-semibold tracking-wide text-[#949ba4] uppercase">
						Convert to
					</div>
					{#each convertTypes as type (type)}
						<button
							type="button"
							class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[#dbdee1] hover:bg-[#35373c]"
							onclick={() => onconvert(type)}
						>
							<span class="h-2.5 w-2.5 rounded-full {accentTheme[nodeCatalog[type].accent].header}"></span>
							{nodeCatalog[type].label}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<div class="my-1 h-px bg-white/10"></div>

	<button
		type="button"
		class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[#f23f42] hover:bg-[#f23f42] hover:text-white"
		onclick={ondelete}
	>
		<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path
				d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
		{label('Delete')}
	</button>
</div>

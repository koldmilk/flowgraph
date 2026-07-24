<script lang="ts">
	// The workspace tab strip: 'Main' plus one tab per open collapsed-group subgraph. Selecting a tab
	// switches the canvas to that graph; the × closes a subgraph tab (its data lives on the group node,
	// so closing only hides the view).
	let {
		tabs,
		activeId,
		onselect,
		onclose
	}: {
		tabs: { id: string; name: string }[];
		activeId: string;
		onselect: (id: string) => void;
		onclose: (id: string) => void;
	} = $props();
</script>

<div class="flex h-8 shrink-0 items-stretch gap-1 border-b border-black/40 bg-[#1e1f22] px-2 pt-1">
	{#each tabs as tab (tab.id)}
		<div
			role="tab"
			tabindex="0"
			aria-selected={tab.id === activeId}
			onclick={() => onselect(tab.id)}
			onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onselect(tab.id)}
			class="flex w-44 cursor-pointer items-center gap-2 rounded-t-md px-3 text-xs select-none {tab.id ===
			activeId
				? 'bg-[#2b2d31] text-[#dbdee1]'
				: 'text-[#949ba4] hover:bg-[#2b2d31]/50 hover:text-[#dbdee1]'}"
		>
			{#if tab.id !== 'main'}
				<svg
					class="h-3.5 w-3.5 shrink-0 opacity-70"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<rect x="3" y="3" width="7" height="7" rx="1.5" />
					<rect x="14" y="3" width="7" height="7" rx="1.5" />
					<rect x="3" y="14" width="7" height="7" rx="1.5" />
					<rect x="14" y="14" width="7" height="7" rx="1.5" />
				</svg>
			{/if}
			<span class="flex-1 truncate text-left">{tab.name}</span>
			{#if tab.id !== 'main'}
				<button
					type="button"
					title="Close tab"
					aria-label="Close tab"
					onclick={(e) => {
						e.stopPropagation();
						onclose(tab.id);
					}}
					class="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[#949ba4] hover:bg-white/10 hover:text-[#dbdee1]"
				>
					<svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
					</svg>
				</button>
			{/if}
		</div>
	{/each}
</div>

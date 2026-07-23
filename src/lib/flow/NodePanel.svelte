<script lang="ts">
	import type { Node } from '@xyflow/svelte';
	import { scale } from 'svelte/transition';
	import MarkdownEditor from './MarkdownEditor.svelte';
	import { nodeCatalog, type SignalNodeType } from './nodeCatalog';
	import { nodeColors, defaultNodeColor } from './nodeColors';

	let {
		node,
		selectedCount,
		collapsed = $bindable(false),
		onupdate
	}: {
		// The single selected signal node whose attributes we edit, or null when the selection
		// isn't exactly one such node.
		node: Node | null;
		selectedCount: number;
		collapsed?: boolean;
		onupdate: (id: string, data: Record<string, unknown>) => void;
	} = $props();

	const label = $derived((node?.data?.label as string | undefined) ?? '');
	const description = $derived((node?.data?.description as string | undefined) ?? '');

	const typeLabel = $derived(
		node && node.type != null && node.type in nodeCatalog
			? nodeCatalog[node.type as keyof typeof nodeCatalog].label
			: (node?.type ?? '')
	);

	// The node's current header color: an explicit data.color, else the type's default.
	const currentColor = $derived(
		((node?.data?.color as string | undefined) ??
			(node && node.type != null && node.type in nodeCatalog
				? defaultNodeColor[node.type as SignalNodeType]
				: '#5865f2'))
	);

	// Each attribute section can be collapsed independently via its +/- toggle.
	let open = $state({ name: true, description: true, color: true });
</script>

{#snippet sectionHeader(title: string, key: 'name' | 'description' | 'color')}
	<button
		type="button"
		class="mb-1 flex w-full items-center text-[11px] font-semibold tracking-wide text-[#949ba4] uppercase hover:text-[#dbdee1]"
		aria-expanded={open[key]}
		onclick={() => (open[key] = !open[key])}
	>
		{title}
		<svg class="ml-auto h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
			<path d={open[key] ? 'M5 12h14' : 'M12 5v14M5 12h14'} stroke-linecap="round" />
		</svg>
	</button>
{/snippet}

{#if collapsed}
	<!-- Collapsed: a round hamburger button in the top-right corner. The expanded panel grows
	     out of this same spot (both anchored top-right, panel scales from that origin). -->
	<button
		type="button"
		class="pointer-events-auto absolute top-4 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-black/40 bg-[#2b2d31] text-[#dbdee1] shadow-2xl shadow-black/60 ring-1 ring-white/5 hover:bg-[#35373c]"
		title="Show attributes"
		aria-label="Show attributes"
		onclick={() => (collapsed = false)}
	>
		<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
		</svg>
	</button>
{:else}
	<div
		transition:scale={{ duration: 150, start: 0.85, opacity: 0 }}
		style="transform-origin: top right;"
		class="pointer-events-auto absolute top-4 right-4 bottom-4 z-30 flex w-lg flex-col overflow-hidden rounded-xl border border-black/40 bg-[#2b2d31] text-[#dbdee1] shadow-2xl shadow-black/60 ring-1 ring-white/5"
	>
		<!-- Header / collapse toggle -->
		<div class="flex items-center gap-2 border-b border-black/30 px-2 py-2">
			<button
				type="button"
				class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]"
				title="Collapse panel"
				aria-label="Collapse panel"
				onclick={() => (collapsed = true)}
			>
				<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
				</svg>
			</button>
			<span class="text-sm font-semibold tracking-wide">Attributes</span>
		</div>

		<div class="flex-1 overflow-y-auto p-3">
			{#if node}
				<div class="mb-3 flex items-center gap-2">
					<span class="h-2.5 w-2.5 rounded-full" style="background-color: {currentColor};"></span>
					<span class="text-[11px] font-semibold tracking-wide text-[#949ba4] uppercase">
						{typeLabel}
					</span>
				</div>

				<div class="mt-3 mb-3 block border-t border-white/10 pt-3">
					{@render sectionHeader('Name', 'name')}
					{#if open.name}
						<input
							type="text"
							value={label}
							oninput={(e) => onupdate(node.id, { label: e.currentTarget.value })}
							class="w-full rounded-md border border-black/30 bg-[#1e1f22] px-2 py-1.5 text-sm text-[#dbdee1] outline-none focus:border-[#5865f2]"
						/>
					{/if}
				</div>

				<div class="mt-3 mb-3 block border-t border-white/10 pt-3">
					{@render sectionHeader('Description', 'description')}
					{#if open.description}
						<MarkdownEditor
							value={description}
							placeholder="Describe this node… (Markdown supported)"
							onchange={(v) => onupdate(node.id, { description: v })}
						/>
					{/if}
				</div>

				<div class="block border-t border-white/10 pt-3">
					{@render sectionHeader('Color', 'color')}
					{#if open.color}
						<div class="flex flex-wrap gap-2">
							{#each nodeColors as c (c.hex)}
								<button
									type="button"
									title={c.name}
									aria-label={c.name}
									onclick={() => onupdate(node.id, { color: c.hex })}
									class="h-7 w-7 rounded-md ring-offset-2 ring-offset-[#2b2d31] transition-shadow hover:ring-2 hover:ring-white/30 {currentColor.toLowerCase() ===
									c.hex.toLowerCase()
										? 'ring-2 ring-white'
										: ''}"
									style="background-color: {c.hex};"
								></button>
							{/each}
						</div>
					{/if}
				</div>
			{:else}
				<p class="mt-4 text-center text-sm text-[#949ba4]">
					{selectedCount > 1 ? 'Multiple nodes selected' : 'No node selected'}
				</p>
			{/if}
		</div>
	</div>
{/if}

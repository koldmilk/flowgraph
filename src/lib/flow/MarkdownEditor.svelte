<script lang="ts">
	import MarkdownView from './MarkdownView.svelte';

	let {
		value,
		onchange,
		placeholder = ''
	}: {
		value: string;
		onchange: (value: string) => void;
		placeholder?: string;
	} = $props();

	let mode = $state<'edit' | 'preview'>('edit');
	let showHelp = $state(false);

	// Quick markdown reference shown by the info button.
	const cheatsheet: { syntax: string; label: string }[] = [
		{ syntax: '# Heading', label: 'Heading' },
		{ syntax: '**bold**', label: 'Bold' },
		{ syntax: '*italic*', label: 'Italic' },
		{ syntax: '- item', label: 'Bullet list' },
		{ syntax: '1. item', label: 'Numbered list' },
		{ syntax: '[text](url)', label: 'Link' },
		{ syntax: '`code`', label: 'Inline code' },
		{ syntax: '> quote', label: 'Blockquote' },
		{ syntax: '---', label: 'Divider' }
	];

	const hasContent = $derived(value.trim().length > 0);
</script>

<div class="rounded-md border border-black/30 bg-[#1e1f22]">
	<div class="flex items-center gap-1 border-b border-black/30 px-1.5 py-1">
		<button
			type="button"
			class="rounded px-2 py-0.5 text-xs font-medium {mode === 'edit'
				? 'bg-[#5865f2] text-white'
				: 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'}"
			onclick={() => (mode = 'edit')}
		>
			Edit
		</button>
		<button
			type="button"
			class="rounded px-2 py-0.5 text-xs font-medium {mode === 'preview'
				? 'bg-[#5865f2] text-white'
				: 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'}"
			onclick={() => (mode = 'preview')}
		>
			Preview
		</button>

		<!-- Markdown help: an info icon that toggles a cheatsheet popover. -->
		<div class="relative ml-auto">
			<button
				type="button"
				class="flex h-5 w-5 items-center justify-center rounded-full text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1] {showHelp
					? 'bg-[#35373c] text-[#dbdee1]'
					: ''}"
				title="Markdown help"
				aria-label="Markdown help"
				onclick={() => (showHelp = !showHelp)}
			>
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="9" />
					<path d="M12 11v5" stroke-linecap="round" />
					<circle cx="12" cy="7.75" r="0.5" fill="currentColor" stroke="none" />
				</svg>
			</button>

			{#if showHelp}
				<!-- click-away backdrop -->
				<button
					type="button"
					class="fixed inset-0 z-40 cursor-default"
					aria-label="Close markdown help"
					onclick={() => (showHelp = false)}
				></button>
				<div
					class="absolute top-7 right-0 z-50 w-56 rounded-lg border border-black/40 bg-[#2b2d31] p-2 shadow-2xl shadow-black/60"
				>
					<div class="mb-1.5 px-1 text-[11px] font-semibold tracking-wide text-[#949ba4] uppercase">
						Markdown
					</div>
					<ul class="space-y-0.5">
						{#each cheatsheet as item (item.label)}
							<li class="flex items-center justify-between gap-3 rounded px-1 py-0.5 text-xs">
								<span class="text-[#b5bac1]">{item.label}</span>
								<code class="rounded bg-[#1e1f22] px-1.5 py-0.5 font-mono text-[#dbdee1]">
									{item.syntax}
								</code>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	</div>

	{#if mode === 'edit'}
		<textarea
			rows="12"
			{value}
			{placeholder}
			oninput={(e) => onchange(e.currentTarget.value)}
			class="block min-h-56 w-full resize-y bg-transparent px-2 py-1.5 font-mono text-sm text-[#dbdee1] outline-none placeholder:text-[#5c5e66]"
		></textarea>
	{:else if hasContent}
		<MarkdownView {value} class="min-h-56 max-h-96 overflow-y-auto px-2 py-1.5 text-sm text-[#dbdee1]" />
	{:else}
		<p class="px-2 py-1.5 text-sm text-[#5c5e66]">Nothing to preview</p>
	{/if}
</div>

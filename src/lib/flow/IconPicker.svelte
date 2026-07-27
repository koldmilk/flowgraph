<script lang="ts">
	import IconGlyph from './icons/IconGlyph.svelte';
	import {
		ICON_STYLES,
		ICON_STYLE_LABELS,
		loadIconNames,
		iconLabel,
		iconSearchKey,
		type IconStyle
	} from './materialIcons';

	let {
		icon,
		style,
		onpick
	}: {
		icon: string;
		style: IconStyle;
		onpick: (icon: string, style: IconStyle) => void;
	} = $props();

	let names = $state<string[]>([]);
	let error = $state('');
	let query = $state('');

	// One fetch for the whole session (materialIcons caches it), so reopening the panel is instant.
	$effect(() => {
		loadIconNames().then(
			(list) => (names = list),
			(err: unknown) => (error = err instanceof Error ? err.message : 'Could not load icons')
		);
	});

	const filtered = $derived.by(() => {
		const needle = iconSearchKey(query);
		return needle ? names.filter((name) => name.includes(needle)) : names;
	});

	// Windowed grid: 2,122 cells would be 2,122 elements each pulling its own SVG, so only the rows in
	// view are rendered and spacers stand in for the rest. Cells are square and fixed, which is what
	// makes a row's height predictable enough to map a scroll offset onto a row index.
	const CELL = 44;
	const VIEW_HEIGHT = 224;
	const OVERSCAN = 1;

	let listEl = $state<HTMLDivElement | null>(null);
	let listWidth = $state(0);
	let scrollTop = $state(0);

	const columns = $derived(Math.max(1, Math.floor(listWidth / CELL) || 1));
	const rowCount = $derived(Math.ceil(filtered.length / columns));
	const firstRow = $derived(Math.max(0, Math.floor(scrollTop / CELL) - OVERSCAN));
	const lastRow = $derived(
		Math.min(rowCount, Math.ceil((scrollTop + VIEW_HEIGHT) / CELL) + OVERSCAN)
	);
	const visible = $derived(filtered.slice(firstRow * columns, lastRow * columns));

	function onSearch() {
		// A new result set is a new list -- staying scrolled into the old one lands you in blank space.
		if (listEl) listEl.scrollTop = 0;
		scrollTop = 0;
	}
</script>

<!-- Style first: it re-skins every cell below, so choosing it is part of browsing rather than a
     separate setting. -->
<div class="mb-2 flex flex-wrap gap-1">
	{#each ICON_STYLES as option (option)}
		<button
			type="button"
			onclick={() => onpick(icon, option)}
			class="rounded px-2 py-1 text-xs {style === option
				? 'bg-[#5865f2] text-white'
				: 'bg-[#1e1f22] text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'}"
		>
			{ICON_STYLE_LABELS[option]}
		</button>
	{/each}
</div>

<div class="mb-2 flex items-center gap-2">
	<input
		type="text"
		bind:value={query}
		oninput={onSearch}
		placeholder="Search {names.length || ''} icons…"
		class="min-w-0 flex-1 rounded-md border border-black/30 bg-[#1e1f22] px-2 py-1.5 text-sm text-[#dbdee1] outline-none focus:border-[#5865f2]"
	/>
	<span class="shrink-0 text-xs text-[#949ba4]">{filtered.length}</span>
</div>

<div
	bind:this={listEl}
	bind:clientWidth={listWidth}
	onscroll={(event) => (scrollTop = event.currentTarget.scrollTop)}
	class="overflow-y-auto rounded-md border border-black/30 bg-[#1e1f22]"
	style="height: {VIEW_HEIGHT}px;"
>
	{#if error}
		<p class="p-3 text-sm text-[#f23f42]">{error}</p>
	{:else if !names.length}
		<p class="p-3 text-sm text-[#949ba4]">Loading icons…</p>
	{:else if !filtered.length}
		<p class="p-3 text-sm text-[#949ba4]">No icon matches “{query}”.</p>
	{:else}
		<div style="height: {firstRow * CELL}px;"></div>
		<div class="grid" style="grid-template-columns: repeat({columns}, minmax(0, 1fr));">
			{#each visible as name (name)}
				<button
					type="button"
					title={iconLabel(name)}
					onclick={() => onpick(name, style)}
					class="flex items-center justify-center rounded {name === icon
						? 'bg-[#5865f2] text-white'
						: 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'}"
					style="height: {CELL}px;"
				>
					<IconGlyph {name} {style} size={24} />
				</button>
			{/each}
		</div>
		<div style="height: {Math.max(0, (rowCount - lastRow) * CELL)}px;"></div>
	{/if}
</div>

<p class="mt-1.5 truncate text-xs text-[#949ba4]">{iconLabel(icon)}</p>

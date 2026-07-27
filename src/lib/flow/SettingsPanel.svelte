<script lang="ts">
	import SidePanel from './SidePanel.svelte';
	import ToggleRow from './ToggleRow.svelte';
	import SettingsIcon from './icons/SettingsIcon.svelte';
	import { settings, GRID_MIN, GRID_MAX, type GridPattern } from './settings.svelte';

	let { onclose }: { onclose: () => void } = $props();

	// Sections collapse independently, matching the attributes panel.
	let open = $state({ canvas: true, splines: true, connections: true, overview: true });

	const patterns: { value: GridPattern; label: string }[] = [
		{ value: 'dots', label: 'Dots' },
		{ value: 'lines', label: 'Lines' },
		{ value: 'cross', label: 'Cross' },
		{ value: 'none', label: 'Off' }
	];
</script>

{#snippet sectionHeader(title: string, key: 'canvas' | 'splines' | 'connections' | 'overview')}
	<button
		type="button"
		class="mb-2.5 flex w-full items-center text-[11px] font-semibold tracking-wide text-[#949ba4] uppercase hover:text-[#dbdee1]"
		aria-expanded={open[key]}
		onclick={() => (open[key] = !open[key])}
	>
		{title}
		<svg class="ml-auto h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
			<path d={open[key] ? 'M5 12h14' : 'M12 5v14M5 12h14'} stroke-linecap="round" />
		</svg>
	</button>
{/snippet}

<SidePanel title="Settings" icon={SettingsIcon} {onclose}>
	<div class="mb-3 block pt-1">
		{@render sectionHeader('Canvas', 'canvas')}
		{#if open.canvas}
			<div class="mb-3 flex gap-1 rounded-md bg-[#1e1f22] p-1">
				{#each patterns as pattern (pattern.value)}
					<button
						type="button"
						onclick={() => (settings.gridPattern = pattern.value)}
						class="flex-1 rounded px-2 py-1 text-sm {settings.gridPattern === pattern.value
							? 'bg-[#5865f2] text-white'
							: 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'}"
					>
						{pattern.label}
					</button>
				{/each}
			</div>

			<div class="mb-1 flex items-center gap-3 px-1.5">
				<span class="flex-1 text-sm text-[#dbdee1]">Grid size</span>
				<span class="text-xs tabular-nums text-[#949ba4]">{settings.gridSize} px</span>
			</div>
			<input
				type="range"
				min={GRID_MIN}
				max={GRID_MAX}
				step="4"
				bind:value={settings.gridSize}
				aria-label="Grid size"
				class="mb-2 w-full accent-[#5865f2]"
			/>

			<ToggleRow
				label="Snap to grid"
				hint="Dragged nodes land on the nearest grid intersection."
				value={settings.snapToGrid}
				onchange={(v) => (settings.snapToGrid = v)}
			/>
		{/if}
	</div>

	<div class="mb-3 block border-t border-white/10 pt-3">
		{@render sectionHeader('Splines', 'splines')}
		{#if open.splines}
			<ToggleRow
				label="Animate signal"
				hint="Dashes travel along the wires in the direction of flow."
				value={settings.animateSignal}
				onchange={(v) => (settings.animateSignal = v)}
			/>
		{/if}
	</div>

	<div class="mb-3 block border-t border-white/10 pt-3">
		{@render sectionHeader('Connections', 'connections')}
		{#if open.connections}
			<ToggleRow
				label="Allow multiple inputs"
				hint="Every input pin accepts more than one spline, instead of the newest replacing the last."
				value={settings.allowMultipleInputs}
				onchange={(v) => (settings.allowMultipleInputs = v)}
			/>
		{/if}
	</div>

	<div class="block border-t border-white/10 pt-3">
		{@render sectionHeader('Overview', 'overview')}
		{#if open.overview}
			<ToggleRow
				label="Show minimap"
				hint="A map of the whole graph in the bottom-right corner."
				value={settings.showMinimap}
				onchange={(v) => (settings.showMinimap = v)}
			/>
		{/if}
	</div>
</SidePanel>

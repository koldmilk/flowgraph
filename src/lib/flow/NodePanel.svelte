<script lang="ts">
	import type { Edge, Node } from '@xyflow/svelte';
	import MarkdownEditor from './MarkdownEditor.svelte';
	import SidePanel from './SidePanel.svelte';
	import IconPicker from './IconPicker.svelte';
	import ToggleRow from './ToggleRow.svelte';
	import { DESCRIPTION_LIMIT } from './nodes/description';
	import { DEFAULT_SPLINE_COLOR, splineFlows, type SplineData } from './splineStyle';
	import { settings } from './settings.svelte';
	import OptionsIcon from './icons/OptionsIcon.svelte';
	import { DEFAULT_ICON, DEFAULT_ICON_STYLE, type IconStyle } from './materialIcons';
	import {
		nodeCatalog,
		convertibleTypes,
		type SignalNodeType,
		type SwitchPin
	} from './nodeCatalog';
	import { nodeColors, defaultNodeColor } from './nodeColors';
	import { commentColors, DEFAULT_COMMENT_COLOR } from './commentColors';

	let {
		node,
		edge = null,
		selectedCount,
		onclose,
		onupdate,
		onupdateedge,
		onconvert,
		onaddpin,
		onremovepin,
		onrenamepin
	}: {
		// The single selected signal node whose attributes we edit, or null when the selection
		// isn't exactly one such node.
		node: Node | null;
		// A lone selected spline, edited instead when no node is selected.
		edge?: Edge | null;
		selectedCount: number;
		onclose: () => void;
		onupdate: (id: string, data: Record<string, unknown>) => void;
		onupdateedge: (id: string, data: Record<string, unknown>) => void;
		onconvert: (id: string, type: SignalNodeType) => void;
		onaddpin: (id: string, side: 'input' | 'output') => void;
		onremovepin: (id: string, side: 'input' | 'output', pinId: string) => void;
		onrenamepin: (id: string, side: 'input' | 'output', pinId: string, name: string) => void;
	} = $props();

	// The three convertible signal types, for the Type dropdown.
	const signalTypes = convertibleTypes;

	// The switch node swaps the Type dropdown for a Pins editor (it isn't convertible); the group node
	// shows neither (it's a collapsed subgraph, edited by opening its tab).
	const isSwitch = $derived(node?.type === 'switch');
	const isGroup = $derived(node?.type === 'group');
	// A text box is just a markdown note with a color -- no name, no type, no pins.
	const isText = $derived(node?.type === 'text');
	// A comment frame carries only a name and a color, and draws from its own palette.
	const isComment = $derived(node?.type === 'comment');
	// An arrow is shape + color; its curve is edited on the canvas, so the panel shows Color only.
	const isArrow = $derived(node?.type === 'arrow');
	// An icon node adds the picker, and has no Type dropdown -- it converts to nothing.
	const isIcon = $derived(node?.type === 'icon');
	// A media node is only a description: its content comes from the file and its box is dragged on
	// the canvas, so there's no name, color or type to set.
	const isMedia = $derived(node?.type === 'media');

	// Only nodes with an input pin can be asked how many splines it takes.
	const INPUT_TYPES = ['destination', 'sourceDestination', 'switch', 'group', 'icon'];
	const hasInputs = $derived(INPUT_TYPES.includes(node?.type ?? ''));
	const multiInput = $derived((node?.data?.multiInput as boolean | undefined) ?? false);
	const icon = $derived((node?.data?.icon as string | undefined) ?? DEFAULT_ICON);
	const iconStyle = $derived((node?.data?.iconStyle as IconStyle | undefined) ?? DEFAULT_ICON_STYLE);
	const inputs = $derived((node?.data?.inputs as SwitchPin[] | undefined) ?? []);
	const outputs = $derived((node?.data?.outputs as SwitchPin[] | undefined) ?? []);

	const label = $derived((node?.data?.label as string | undefined) ?? '');
	const description = $derived((node?.data?.description as string | undefined) ?? '');
	const fullDescription = $derived((node?.data?.fullDescription as boolean | undefined) ?? false);
	// The toggle only means something once there's something being hidden.
	const descriptionClamped = $derived(description.length > DESCRIPTION_LIMIT);

	const typeLabel = $derived(
		isComment
			? 'Comment'
			: node && node.type != null && node.type in nodeCatalog
				? nodeCatalog[node.type as keyof typeof nodeCatalog].label
				: (node?.type ?? '')
	);

	const palette = $derived(isComment ? commentColors : nodeColors);

	// The node's current color: an explicit data.color, else the type's default.
	const currentColor = $derived(
		((node?.data?.color as string | undefined) ??
			(isComment
				? DEFAULT_COMMENT_COLOR
				: node && node.type != null && node.type in nodeCatalog
					? defaultNodeColor[node.type as SignalNodeType]
					: '#5865f2'))
	);

	// A selected spline: its color, which way the signal reads, and whether it's dashed.
	const splineData = $derived((edge?.data ?? {}) as SplineData);
	const splineColor = $derived(splineData.color ?? DEFAULT_SPLINE_COLOR);
	const splineFlow = $derived(splineData.flow ?? 'forward');
	// Swatches for a spline: its own cyan first, then the node palette.
	const splinePalette: { name: string; hex: string }[] = [
		{ name: 'Signal', hex: DEFAULT_SPLINE_COLOR },
		...nodeColors
	];

	// Each attribute section can be collapsed independently via its +/- toggle.
	let open = $state({
		type: true,
		name: true,
		description: true,
		color: true,
		pins: true,
		icon: true,
		flow: true,
		inputs: true
	});

	// Custom (themed) dropdown for the Type selector — a native <select>'s option list can't be
	// styled, so it renders square/light against our dark UI.
	let typeMenuOpen = $state(false);
</script>

{#snippet sectionHeader(
	title: string,
	key: 'type' | 'name' | 'description' | 'color' | 'pins' | 'icon' | 'flow' | 'inputs'
)}
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

<!-- One side of a switch node's pins: a rename field + remove button per pin, then an add button. -->
{#snippet pinList(title: string, side: 'input' | 'output', pins: SwitchPin[])}
	<div class="mb-1.5 text-[11px] font-semibold tracking-wide text-[#949ba4] uppercase">
		{title}
	</div>
	<div class="flex flex-col gap-1.5">
		{#each pins as pin (pin.id)}
			<div class="flex items-center gap-1.5">
				<input
					type="text"
					value={pin.name}
					oninput={(e) => onrenamepin(node!.id, side, pin.id, e.currentTarget.value)}
					class="min-w-0 flex-1 rounded-md border border-black/30 bg-[#1e1f22] px-2 py-1.5 text-sm text-[#dbdee1] outline-none focus:border-[#5865f2]"
				/>
				<button
					type="button"
					title="Remove pin"
					aria-label="Remove pin"
					onclick={() => onremovepin(node!.id, side, pin.id)}
					class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#949ba4] hover:bg-[#f23f42] hover:text-white"
				>
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M5 12h14" stroke-linecap="round" />
					</svg>
				</button>
			</div>
		{/each}
	</div>
	<button
		type="button"
		onclick={() => onaddpin(node!.id, side)}
		class="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-white/15 px-2 py-1.5 text-sm text-[#949ba4] hover:border-[#5865f2] hover:text-[#dbdee1]"
	>
		<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M12 5v14M5 12h14" stroke-linecap="round" />
		</svg>
		Add {side}
	</button>
{/snippet}

<SidePanel title="Attributes" icon={OptionsIcon} {onclose}>
	{#if node}
		<div class="mb-3 flex items-center gap-2">
			<span class="h-2.5 w-2.5 rounded-full" style="background-color: {currentColor};"></span>
			<span class="text-[11px] font-semibold tracking-wide text-[#949ba4] uppercase">
				{typeLabel}
			</span>
		</div>

		{#if !isText && !isArrow && !isMedia}
			<div class="mt-3 mb-3 block border-t border-white/10 pt-3">
				{@render sectionHeader('Name', 'name')}
				{#if open.name}
					<input
						type="text"
						value={label}
						placeholder={isIcon ? 'Optional — blank keeps the node compact' : ''}
						oninput={(e) => onupdate(node.id, { label: e.currentTarget.value })}
						class="w-full rounded-md border border-black/30 bg-[#1e1f22] px-2 py-1.5 text-sm text-[#dbdee1] outline-none focus:border-[#5865f2]"
					/>
				{/if}
			</div>
		{/if}

		{#if hasInputs}
			<div class="mt-3 mb-3 block border-t border-white/10 pt-3">
				{@render sectionHeader('Inputs', 'inputs')}
				{#if open.inputs}
					<ToggleRow
						label="Allow multiple inputs"
						hint={settings.allowMultipleInputs
							? 'Already on for every node, from Settings → Connections.'
							: 'This node’s input pins accept more than one spline.'}
						value={settings.allowMultipleInputs || multiInput}
						onchange={(v) => onupdate(node.id, { multiInput: v })}
					/>
				{/if}
			</div>
		{/if}

		{#if isIcon}
			<div class="mt-3 mb-3 block border-t border-white/10 pt-3">
				{@render sectionHeader('Icon', 'icon')}
				{#if open.icon}
					<IconPicker
						{icon}
						style={iconStyle}
						onpick={(name, style) => onupdate(node.id, { icon: name, iconStyle: style })}
					/>
				{/if}
			</div>
		{/if}

		{#if !isComment && !isArrow}
			<div class="mt-3 mb-3 block border-t border-white/10 pt-3">
				{@render sectionHeader(isText ? 'Text' : 'Description', 'description')}
				{#if open.description}
					<MarkdownEditor
						value={description}
						placeholder={isText
							? 'Write your note… (Markdown supported)'
							: 'Describe this node… (Markdown supported)'}
						onchange={(v) => onupdate(node.id, { description: v })}
					/>
					{#if isMedia}
						<p class="mt-1.5 px-1.5 text-xs text-[#949ba4]">
							Shown on hover only — a media node keeps its picture clear.
						</p>
					{:else if !isText}
						<div class="mt-1.5">
							<ToggleRow
								label="Show full text on node"
								hint={descriptionClamped
									? `Currently clamped to ${DESCRIPTION_LIMIT} characters on the canvas; hover the node to read the rest.`
									: `Applies past ${DESCRIPTION_LIMIT} characters.`}
								value={fullDescription}
								onchange={(v) => onupdate(node.id, { fullDescription: v })}
							/>
						</div>
					{/if}
				{/if}
			</div>
		{/if}

		{#if !isMedia}
			<div class="mb-3 block border-t border-white/10 pt-3">
				{@render sectionHeader('Color', 'color')}
				{#if open.color}
					<div class="flex flex-wrap gap-2">
						{#each palette as c (c.hex)}
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
		{/if}

		{#if isSwitch || isGroup}
			<div class="block border-t border-white/10 pt-3">
				{@render sectionHeader('Pins', 'pins')}
				{#if open.pins}
					{@render pinList('Inputs', 'input', inputs)}
					<div class="mt-4">
						{@render pinList('Outputs', 'output', outputs)}
					</div>
				{/if}
			</div>
		{:else if !isText && !isComment && !isArrow && !isIcon && !isMedia}
		<div class="block border-t border-white/10 pt-3">
			{@render sectionHeader('Type', 'type')}
			{#if open.type}
				<div class="relative">
					<button
						type="button"
						onclick={() => (typeMenuOpen = !typeMenuOpen)}
						class="flex w-full items-center gap-2 rounded-md border bg-[#1e1f22] px-2 py-1.5 text-sm text-[#dbdee1] outline-none {typeMenuOpen
							? 'border-[#5865f2]'
							: 'border-black/30 hover:border-[#4e5058]'}"
					>
						<span
							class="h-2.5 w-2.5 shrink-0 rounded-full"
							style="background-color: {defaultNodeColor[node.type as SignalNodeType]};"
						></span>
						<span>{nodeCatalog[node.type as SignalNodeType].label}</span>
						<svg
							class="ml-auto h-4 w-4 text-[#949ba4] transition-transform {typeMenuOpen
								? 'rotate-180'
								: ''}"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</button>

					{#if typeMenuOpen}
						<!-- click-away backdrop -->
						<button
							type="button"
							class="fixed inset-0 z-40 cursor-default"
							aria-label="Close type menu"
							onclick={() => (typeMenuOpen = false)}
						></button>
						<div
							class="absolute top-full right-0 left-0 z-50 mt-1 rounded-lg border border-black/40 bg-[#2b2d31] p-1 shadow-2xl shadow-black/60"
						>
							{#each signalTypes as t (t)}
								<button
									type="button"
									onclick={() => {
										if (t !== node.type) onconvert(node.id, t);
										typeMenuOpen = false;
									}}
									class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[#dbdee1] hover:bg-[#35373c] {t ===
									node.type
										? 'bg-[#35373c]'
										: ''}"
								>
									<span
										class="h-2.5 w-2.5 shrink-0 rounded-full"
										style="background-color: {defaultNodeColor[t]};"
									></span>
									{nodeCatalog[t].label}
									{#if t === node.type}
										<svg
											class="ml-auto h-4 w-4 text-[#949ba4]"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
										>
											<path d="M5 12l5 5L20 7" stroke-linecap="round" stroke-linejoin="round" />
										</svg>
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>
		{/if}
	{:else if edge}
		<div class="mb-3 flex items-center gap-2">
			<span class="h-2.5 w-2.5 rounded-full" style="background-color: {splineColor};"></span>
			<span class="text-[11px] font-semibold tracking-wide text-[#949ba4] uppercase">Spline</span>
		</div>

		<div class="mt-3 mb-3 block border-t border-white/10 pt-3">
			{@render sectionHeader('Color', 'color')}
			{#if open.color}
				<div class="flex flex-wrap gap-2">
					{#each splinePalette as c (c.hex)}
						<button
							type="button"
							title={c.name}
							aria-label={c.name}
							onclick={() => onupdateedge(edge.id, { color: c.hex })}
							class="h-7 w-7 rounded-md ring-offset-2 ring-offset-[#2b2d31] transition-shadow hover:ring-2 hover:ring-white/30 {splineColor.toLowerCase() ===
							c.hex.toLowerCase()
								? 'ring-2 ring-white'
								: ''}"
							style="background-color: {c.hex};"
						></button>
					{/each}
				</div>
			{/if}
		</div>

		<div class="block border-t border-white/10 pt-3">
			{@render sectionHeader('Flow', 'flow')}
			{#if open.flow}
				<div class="mb-3 flex gap-1 rounded-md bg-[#1e1f22] p-1">
					{#each splineFlows as option (option.value)}
						<button
							type="button"
							onclick={() => onupdateedge(edge.id, { flow: option.value })}
							class="flex-1 rounded px-2 py-1 text-sm {splineFlow === option.value
								? 'bg-[#5865f2] text-white'
								: 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'}"
						>
							{option.label}
						</button>
					{/each}
				</div>

				<ToggleRow
					label="Solid line"
					hint="Drops the travelling dashes on this spline only."
					value={splineData.solid ?? false}
					onchange={(v) => onupdateedge(edge.id, { solid: v })}
				/>
			{/if}
		</div>
	{:else}
		<p class="mt-4 text-center text-sm text-[#949ba4]">
			{selectedCount > 1
				? 'Multiple nodes selected'
				: selectedCount === 1
					? 'This node has no editable attributes'
					: 'No node selected'}
		</p>
	{/if}
</SidePanel>

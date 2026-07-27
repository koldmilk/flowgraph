<script lang="ts">
	import { useSvelteFlow, type NodeProps, type Node } from '@xyflow/svelte';
	import MediaFrame from './MediaFrame.svelte';
	import DescriptionPopover from './DescriptionPopover.svelte';
	import { readMediaFile, acceptFor, type MediaKind } from '../mediaFile';

	// A media file dropped onto the canvas: a picture, a video, or an audio clip. One node type covers
	// all three so they share the frame, the resize grip and the drop path; `kind` picks the renderer.
	// `src` is a data URL (see mediaFile.ts), so the media travels with the graph rather than pointing
	// at a file path that may move.
	//
	// Before a file is chosen, `kind` is the *wanted* kind -- the Add Media menu seeds it so the picker
	// filters to that type. Picking a file overwrites it with what the file actually is.
	// A description never shows on a media node -- the picture *is* the node, and text over it would
	// fight the content. It lives on the hover popover only.
	type MediaNodeData = {
		kind?: MediaKind;
		src?: string;
		alt?: string;
		description?: string;
	};

	let { id, data, selected }: NodeProps<Node<MediaNodeData>> = $props();

	const { updateNode } = useSvelteFlow();

	// Empty state: nothing loaded yet, so offer a picker rather than rendering a blank box.
	let fileInput = $state<HTMLInputElement | null>(null);
	let error = $state('');

	const emptyStates: Record<MediaKind, { label: string; icon: MediaKind }> = {
		image: { label: 'Click to choose an image', icon: 'image' },
		video: { label: 'Click to choose a video', icon: 'video' },
		audio: { label: 'Click to choose an audio file', icon: 'audio' }
	};
	const empty = $derived(emptyStates[data.kind ?? 'image']);

	// Resize the node to the media's own proportions as well as storing it: the placeholder box is an
	// arbitrary default, and since the content fills the box (and resizing locks the ratio for pictures
	// and video), leaving the old box would stretch it and freeze the wrong aspect ratio.
	async function onPick(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		try {
			const { kind, src, width, height } = await readMediaFile(file);
			error = '';
			updateNode(id, (n) => ({ width, height, data: { ...n.data, kind, src, alt: file.name } }));
		} catch (err) {
			// A file we can't read leaves the placeholder in place and says why, rather than blanking
			// the node or failing silently.
			error = err instanceof Error ? err.message : 'Could not load that file';
		}
		// Let the same file be picked again after an error.
		input.value = '';
	}

	// The empty placeholder fills the whole node, so it can't be `nodrag` -- that would leave nothing
	// to grab and the node would be stuck. Instead it stays draggable and we tell a click apart from a
	// drag by how far the pointer travelled: a press that moved was a drag, and must not open the file
	// dialog on release (the pointer ends up over the button either way, so a click still fires).
	const DRAG_SLOP = 4;
	let pressedAt: { x: number; y: number } | null = null;

	function onPress(event: PointerEvent) {
		pressedAt = { x: event.clientX, y: event.clientY };
	}

	function onRelease(event: MouseEvent) {
		const from = pressedAt;
		pressedAt = null;
		if (from && Math.hypot(event.clientX - from.x, event.clientY - from.y) > DRAG_SLOP) return;
		fileInput?.click();
	}
</script>

<DescriptionPopover
	value={data.description ?? ''}
	enabled={!!data.description}
	class="h-full w-full"
>
	<MediaFrame
		{selected}
		keepAspectRatio={data.kind !== 'audio'}
		minWidth={data.kind === 'audio' ? 220 : 60}
		minHeight={data.kind === 'audio' ? 72 : 60}
	>
		{#if data.src && data.kind === 'video'}
			<!-- The control bar owns the bottom strip: pointer events reach it there, so scrubbing works
			     without the canvas reading it as a node drag. Everywhere else the shield takes the press,
			     which is what makes the video draggable at all. -->
			<div class="relative h-full w-full bg-black">
				<!-- svelte-ignore a11y_media_has_caption -->
				<video src={data.src} controls preload="metadata" class="h-full w-full"></video>
				<div class="absolute inset-x-0 top-0 bottom-12 cursor-grab" role="presentation"></div>
			</div>
		{:else if data.src && data.kind === 'audio'}
			<div class="flex h-full w-full flex-col justify-between gap-1 bg-[#1e1f22] px-2 py-1.5">
				<!-- The filename row doubles as the drag handle: the player below is all controls. -->
				<div class="flex items-center gap-1.5 text-[11px] text-[#949ba4]">
					<svg
						class="h-3.5 w-3.5 shrink-0"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M9 18V5l10-2v13" stroke-linecap="round" stroke-linejoin="round" />
						<circle cx="6" cy="18" r="3" />
						<circle cx="16" cy="16" r="3" />
					</svg>
					<span class="truncate">{data.alt ?? 'Audio'}</span>
				</div>
				<audio src={data.src} controls class="nodrag w-full"></audio>
			</div>
		{:else if data.src}
			<img src={data.src} alt={data.alt ?? ''} class="h-full w-full object-fill" draggable="false" />
		{:else}
			<button
				type="button"
				onpointerdown={onPress}
				onclick={onRelease}
				class="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 bg-[#243635] px-3 text-center text-xs text-[#949ba4] hover:text-[#dbdee1]"
			>
				<svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
					{#if empty.icon === 'video'}
						<rect x="2" y="5" width="14" height="14" rx="2" stroke-linejoin="round" />
						<path d="M16 10.5l6-3.5v10l-6-3.5z" stroke-linecap="round" stroke-linejoin="round" />
					{:else if empty.icon === 'audio'}
						<path d="M9 18V5l10-2v13" stroke-linecap="round" stroke-linejoin="round" />
						<circle cx="6" cy="18" r="3" />
						<circle cx="16" cy="16" r="3" />
					{:else}
						<rect x="3" y="4" width="18" height="16" rx="2" stroke-linejoin="round" />
						<circle cx="8.5" cy="9.5" r="1.5" />
						<path d="M21 16l-5-5-6 6-3-3-4 4" stroke-linecap="round" stroke-linejoin="round" />
					{/if}
				</svg>
				{empty.label}
				{#if error}
					<span class="text-[11px] text-[#f23f42]">{error}</span>
				{/if}
			</button>
			<input
				bind:this={fileInput}
				type="file"
				accept={acceptFor(data.kind)}
				class="hidden"
				onchange={onPick}
			/>
		{/if}
	</MediaFrame>
</DescriptionPopover>

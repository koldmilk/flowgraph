<script lang="ts">
	import { useSvelteFlow, type NodeProps, type Node } from '@xyflow/svelte';
	import MediaFrame from './MediaFrame.svelte';
	import { parseYouTubeId, embedUrl, watchUrl } from '../youtube';

	// An embedded YouTube video. Only the video id is stored, so the graph carries a reference rather
	// than any media of its own.
	type YouTubeNodeData = { videoId?: string };

	let { id, data, selected }: NodeProps<Node<YouTubeNodeData>> = $props();

	const { updateNodeData } = useSvelteFlow();

	let draft = $state('');
	let invalid = $state(false);

	// The iframe swallows pointer events, so a shield sits over it by default and the node stays
	// draggable. Double-clicking the shield hands control to the player; deselecting takes it back.
	// (An earlier version dropped the shield on selection -- but selection happens on mousedown, i.e.
	// mid-drag, so the shield vanished under the cursor and the drag died on the first move.)
	let interactive = $state(false);
	$effect(() => {
		if (!selected) interactive = false;
	});

	function submit(event: Event) {
		event.preventDefault();
		const videoId = parseYouTubeId(draft);
		if (!videoId) {
			invalid = true;
			return;
		}
		invalid = false;
		updateNodeData(id, { videoId });
	}
</script>

<MediaFrame {selected} minWidth={160} minHeight={90}>
	{#if data.videoId}
		<div class="relative h-full w-full bg-black">
			<iframe
				src={embedUrl(data.videoId)}
				title="YouTube video player"
				class="h-full w-full"
				frameborder="0"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
				referrerpolicy="strict-origin-when-cross-origin"
				allowfullscreen
			></iframe>

			{#if !interactive}
				<!-- Drag shield. Double-click hands control to the player. -->
				<div
					class="group absolute inset-0 cursor-grab"
					ondblclick={() => (interactive = true)}
					role="presentation"
				>
					{#if selected}
						<div
							class="pointer-events-none absolute inset-x-0 bottom-0 bg-black/65 px-2 py-1 text-center text-[10px] text-white/80"
						>
							Double-click to use the player
						</div>
					{/if}
				</div>
			{:else}
				<!-- While the player has control, dragging is off; a corner button hands it back. -->
				<button
					type="button"
					onclick={() => (interactive = false)}
					class="nodrag absolute top-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white/85 hover:bg-black/90"
				>
					Done
				</button>
				<!-- Some uploaders disable embedding outright; nothing client-side can play those, so
				     offer a way out to the real page. -->
				<a
					href={watchUrl(data.videoId)}
					target="_blank"
					rel="noopener noreferrer"
					class="nodrag absolute top-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white/85 hover:bg-black/90"
				>
					Open on YouTube
				</a>
			{/if}
		</div>
	{:else}
		<form
			onsubmit={submit}
			onpointerdown={(e) => e.stopPropagation()}
			class="nodrag flex h-full w-full flex-col items-center justify-center gap-2 bg-[#241f22] px-3"
		>
			<svg
				class="h-7 w-7 text-[#949ba4]"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.75"
			>
				<rect x="2" y="5" width="20" height="14" rx="4" stroke-linejoin="round" />
				<path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor" stroke-linejoin="round" />
			</svg>
			<input
				bind:value={draft}
				oninput={() => (invalid = false)}
				placeholder="Paste a YouTube link…"
				class="w-full rounded-md border bg-[#1e1f22] px-2 py-1 text-center text-xs text-[#dbdee1] outline-none {invalid
					? 'border-[#f23f42]'
					: 'border-black/40 focus:border-[#5865f2]'}"
			/>
			{#if invalid}
				<span class="text-[11px] text-[#f23f42]">That doesn't look like a YouTube link</span>
			{:else}
				<button
					type="submit"
					class="rounded-md bg-[#5865f2] px-3 py-1 text-xs font-medium text-white hover:bg-[#4752c4]"
				>
					Embed
				</button>
			{/if}
		</form>
	{/if}
</MediaFrame>

<script lang="ts">
	import { NodeResizeControl, useSvelteFlow, type NodeProps, type Node } from '@xyflow/svelte';
	import { hexToRgba, DEFAULT_COMMENT_COLOR } from '../commentColors';

	type CommentData = { label?: string; color?: string };
	let { id, data, selected }: NodeProps<Node<CommentData>> = $props();

	const { updateNodeData } = useSvelteFlow();

	const color = $derived(data?.color ?? DEFAULT_COMMENT_COLOR);
	const label = $derived(data?.label ?? 'Comment');

	let editing = $state(false);
	let draft = $state('');

	// Autofocus + select-all when the label input mounts, so a double-click drops straight into typing.
	function autofocus(node: HTMLInputElement) {
		node.focus();
		node.select();
	}

	function startEdit() {
		draft = label;
		editing = true;
	}

	function commitEdit() {
		if (!editing) return;
		editing = false;
		updateNodeData(id, { label: draft.trim() || 'Comment' });
	}

	function onInputKey(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			commitEdit();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			editing = false;
		}
	}

	// Derived tints exposed as CSS variables so the frame, title bar, and resize grip all
	// draw from the same palette and stay consistent selected vs. unselected.
	const vars = $derived(
		[
			`--c-solid: ${color}`,
			`--c-border: ${hexToRgba(color, selected ? 0.9 : 0.45)}`,
			`--c-fill: ${hexToRgba(color, selected ? 0.08 : 0.05)}`,
			`--c-bar: ${hexToRgba(color, selected ? 0.92 : 0.7)}`
		].join('; ')
	);
</script>

<!-- Unreal-style comment box: a resizable, tinted frame that groups nodes. Only the title bar and
     resize grip take pointer events (see global CSS) so nodes underneath stay clickable and the
     canvas still pans through the body. -->
<div class="comment-root" class:selected style={vars} role="presentation">
	<!-- Tinted frame filling the whole node. -->
	<div class="comment-frame"></div>

	<!-- Title bar: drag handle + editable label. -->
	<div
		class="comment-titlebar comment-drag-handle comment-interactive"
		ondblclick={startEdit}
		role="presentation"
	>
		{#if editing}
			<!-- svelte-ignore a11y_autofocus -->
			<input
				use:autofocus
				bind:value={draft}
				onblur={commitEdit}
				onkeydown={onInputKey}
				onpointerdown={(e) => e.stopPropagation()}
				class="comment-input"
			/>
		{:else}
			<span class="comment-label">{label}</span>
		{/if}
	</div>

	<!-- Always-visible filled corner grip that scales with the frame (autoScale off). -->
	<NodeResizeControl
		position="bottom-right"
		minWidth={160}
		minHeight={90}
		autoScale={false}
		class="comment-interactive comment-resize-handle"
	/>
</div>

<style>
	.comment-root {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.comment-frame {
		position: absolute;
		inset: 0;
		border: 1.5px solid var(--c-border);
		border-radius: 9px;
		background: var(--c-fill);
		transition:
			border-color 120ms ease,
			box-shadow 120ms ease;
	}
	.comment-root.selected .comment-frame {
		box-shadow: 0 0 0 1px var(--c-border);
	}

	.comment-titlebar {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		height: 26px;
		padding: 0 10px;
		background: var(--c-bar);
		border-radius: 8px 8px 0 0;
		cursor: grab;
	}
	.comment-titlebar:active {
		cursor: grabbing;
	}

	.comment-label {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		font-size: 12.5px;
		font-weight: 600;
		letter-spacing: 0.01em;
		color: #ffffff;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
	}
	.comment-input {
		flex: 1;
		min-width: 0;
		background: rgba(0, 0, 0, 0.28);
		border: 1px solid rgba(255, 255, 255, 0.55);
		border-radius: 4px;
		padding: 1px 5px;
		font-size: 12.5px;
		font-weight: 600;
		color: #ffffff;
		outline: none;
	}

	/* Resize grip: a solid filled triangle nested just inside the frame's bottom-right corner,
	   with its radius matched to the frame so it reads as the corner filling in. The compound
	   selector (three classes) out-specifies the library's `.svelte-flow__resize-control.handle`. */
	:global(.svelte-flow__resize-control.handle.comment-resize-handle) {
		width: 22px;
		height: 22px;
		/* Nest 1.5px inside the border so the frame edge stays visible around the grip. */
		translate: calc(-100% - 1.5px) calc(-100% - 1.5px);
		z-index: 3; /* above the translucent frame so the fill isn't tinted by it */
		border: none;
		border-radius: 0 0 7px 0;
		background: var(--c-border);
		/* Mask clips the top-left half away, leaving the bottom-right triangle. */
		-webkit-mask: linear-gradient(to bottom right, transparent 0 50%, #000 50% 100%);
		mask: linear-gradient(to bottom right, transparent 0 50%, #000 50% 100%);
		transition: background 120ms ease;
	}
	/* Selected or hovered: solid, with a soft white highlight fading from the corner tip. */
	.comment-root.selected :global(.comment-resize-handle),
	:global(.comment-resize-handle:hover) {
		background: radial-gradient(circle at 100% 100%, #ffffff 0%, var(--c-solid) 75%);
	}
</style>

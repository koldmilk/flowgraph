<script lang="ts">
	import { NodeResizer, useSvelteFlow, type NodeProps, type Node } from '@xyflow/svelte';
	import { commentColors, hexToRgba, DEFAULT_COMMENT_COLOR } from '../commentColors';

	type CommentData = { label?: string; color?: string };
	let { id, data, selected }: NodeProps<Node<CommentData>> = $props();

	const { updateNodeData } = useSvelteFlow();

	const color = $derived(data?.color ?? DEFAULT_COMMENT_COLOR);
	const label = $derived(data?.label ?? 'Comment');

	let editing = $state(false);
	let draft = $state('');
	let showPalette = $state(false);

	// Autofocus + select-all when the label input mounts, so a double-click drops straight into typing.
	function autofocus(node: HTMLInputElement) {
		node.focus();
		node.select();
	}

	function startEdit() {
		draft = label;
		showPalette = false;
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

	function pickColor(hex: string) {
		updateNodeData(id, { color: hex });
		showPalette = false;
	}
</script>

<!-- Unreal-style comment box: a resizable, colored frame that groups nodes. Only the title bar and
     resize handles take pointer events (see global CSS) so nodes underneath stay clickable and the
     canvas still pans through the body. -->
<div class="comment-root">
	<NodeResizer
		minWidth={160}
		minHeight={90}
		isVisible={selected}
		{color}
		handleClass="comment-interactive"
		lineClass="comment-interactive"
	/>

	<!-- Translucent frame filling the whole node. -->
	<div
		class="comment-frame"
		style="border-color: {hexToRgba(color, selected ? 0.95 : 0.55)}; background: {hexToRgba(
			color,
			0.07
		)};"
	></div>

	<!-- Title bar: drag handle + label + color picker. -->
	<div
		class="comment-titlebar comment-drag-handle comment-interactive"
		style="background: {hexToRgba(color, 0.88)};"
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

		<button
			type="button"
			class="comment-color-btn"
			style="background: {color};"
			title="Change color"
			onpointerdown={(e) => e.stopPropagation()}
			onclick={() => (showPalette = !showPalette)}
			aria-label="Change comment color"
		></button>

		{#if showPalette}
			<div class="comment-palette" onpointerdown={(e) => e.stopPropagation()} role="presentation">
				{#each commentColors as c (c.hex)}
					<button
						type="button"
						class="comment-swatch"
						class:selected={c.hex === color}
						style="background: {c.hex};"
						title={c.name}
						aria-label={c.name}
						onclick={() => pickColor(c.hex)}
					></button>
				{/each}
			</div>
		{/if}
	</div>
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
		border: 2px solid;
		border-radius: 10px;
	}
	.comment-titlebar {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		gap: 6px;
		height: 30px;
		padding: 0 8px;
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
		font-size: 13px;
		font-weight: 600;
		color: #ffffff;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
	}
	.comment-input {
		flex: 1;
		min-width: 0;
		background: rgba(0, 0, 0, 0.25);
		border: 1px solid rgba(255, 255, 255, 0.5);
		border-radius: 4px;
		padding: 1px 4px;
		font-size: 13px;
		font-weight: 600;
		color: #ffffff;
		outline: none;
	}
	.comment-color-btn {
		flex: none;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: 2px solid rgba(255, 255, 255, 0.7);
		cursor: pointer;
	}
	.comment-palette {
		position: absolute;
		top: 34px;
		right: 4px;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 6px;
		padding: 8px;
		background: #2b2d31;
		border: 1px solid rgba(0, 0, 0, 0.4);
		border-radius: 8px;
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
		z-index: 10;
	}
	.comment-swatch {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		border: 2px solid transparent;
		cursor: pointer;
	}
	.comment-swatch.selected {
		border-color: #ffffff;
	}
</style>

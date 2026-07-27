<script lang="ts">
	import type { Snippet } from 'svelte';
	import { useSvelteFlow } from '@xyflow/svelte';
	import NodeDescription from './NodeDescription.svelte';
	import { nodeColorStyles, selectionShadow } from '../nodeColors';

	let {
		id,
		label,
		description,
		showFullDescription = false,
		color,
		selected = false,
		children
	}: {
		id: string;
		label: string;
		description?: string;
		// Off by default: the canvas shows a clamped description and the rest on hover.
		showFullDescription?: boolean;
		color: string;
		selected?: boolean;
		children?: Snippet;
	} = $props();

	const styles = $derived(nodeColorStyles(color));
	const { updateNodeData } = useSvelteFlow();

	let editing = $state(false);
	let draft = $state('');

	// Autofocus + select-all when the editor mounts, so a double-click drops straight into typing
	// with the whole label selected.
	function editor(node: HTMLTextAreaElement) {
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
		updateNodeData(id, { label: draft.trim() || label });
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			// Enter commits; Shift+Enter inserts a manual line break.
			if (!event.shiftKey) {
				event.preventDefault();
				commitEdit();
			}
		} else if (event.key === 'Escape') {
			event.preventDefault();
			editing = false;
		}
	}
</script>

<!-- Grows to fit the title: wraps past the default width, up to 25% wider, then downward. -->
<div
	class="relative min-w-47.5 max-w-59.5 rounded-[10px] border shadow-lg shadow-black/40"
	style="{styles.border} {selected ? selectionShadow : ''}"
>
	<div class="rounded-t-[9px] px-3 py-1.5" style={styles.header}>
		{#if editing}
			<!-- An invisible sizer mirrors the wrapped text so the box (and the whole node) keeps the
			     same width/height as the static title — the textarea overlays it exactly. The trailing
			     zero-width space keeps a final empty line measurable. -->
			<div class="relative rounded bg-black/25">
				<div
					class="invisible text-[13px] font-semibold leading-tight wrap-break-word whitespace-pre-wrap"
					aria-hidden="true"
				>
					{draft + '​'}
				</div>
				<!-- svelte-ignore a11y_autofocus -->
				<textarea
					use:editor
					bind:value={draft}
					onblur={commitEdit}
					onkeydown={onKey}
					onpointerdown={(e) => e.stopPropagation()}
					class="nodrag absolute inset-0 resize-none overflow-hidden border-none bg-transparent p-0 text-[13px] font-semibold leading-tight wrap-break-word whitespace-pre-wrap text-white outline-none"
				></textarea>
			</div>
		{:else}
			<div
				class="text-[13px] font-semibold leading-tight wrap-break-word whitespace-pre-wrap text-white"
				ondblclick={startEdit}
				role="presentation"
			>
				{label}
			</div>
		{/if}
	</div>
	<div class="rounded-b-[9px] px-3 py-2" style={styles.body}>
		{#if description}
			<NodeDescription
				value={description}
				showFull={showFullDescription}
				class="text-xs text-[#c5c8ce]"
			/>
		{/if}
		{@render children?.()}
	</div>
</div>

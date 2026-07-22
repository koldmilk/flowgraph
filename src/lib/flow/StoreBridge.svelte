<script lang="ts">
	import { useStore } from '@xyflow/svelte';

	// Rendered as a CHILD of <SvelteFlow>, this component initializes after SvelteFlow has replaced
	// the provider's placeholder store with the real one -- so useStore() here returns the live store.
	// (A useStore() call in the parent runs too early and captures the throwaway placeholder.)
	let { onready }: { onready: (store: ReturnType<typeof useStore>) => void } = $props();
	const store = useStore();
	$effect(() => onready(store));
</script>

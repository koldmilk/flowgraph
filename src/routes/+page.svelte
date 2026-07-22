<script lang="ts">
	import { SvelteFlowProvider } from '@xyflow/svelte';
	import FlowEditor from '$lib/flow/FlowEditor.svelte';
</script>

<SvelteFlowProvider>
	<FlowEditor />
</SvelteFlowProvider>

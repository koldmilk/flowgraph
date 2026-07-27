<script lang="ts">
	// A labelled on/off switch, as used down the settings and attributes panels.
	let {
		label,
		hint,
		value,
		onchange
	}: {
		label: string;
		hint?: string;
		value: boolean;
		onchange: (value: boolean) => void;
	} = $props();
</script>

<button
	type="button"
	role="switch"
	aria-checked={value}
	onclick={() => onchange(!value)}
	class="flex w-full items-center gap-3 rounded-md px-1.5 py-1.5 text-left hover:bg-[#35373c]"
>
	<span class="flex-1">
		<span class="block text-sm text-[#dbdee1]">{label}</span>
		{#if hint}
			<span class="block text-xs text-[#949ba4]">{hint}</span>
		{/if}
	</span>
	<span
		class="relative h-5 w-9 shrink-0 rounded-full transition-colors {value
			? 'bg-[#5865f2]'
			: 'bg-[#4e5058]'}"
	>
		<span
			class="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all {value
				? 'left-4.5'
				: 'left-0.5'}"
		></span>
	</span>
</button>

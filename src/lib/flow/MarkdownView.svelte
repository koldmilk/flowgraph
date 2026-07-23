<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import { browser } from '$app/environment';

	let { value, class: className = '' }: { value: string; class?: string } = $props();

	// Markdown's block parser collapses runs of blank lines, so extra Enter presses vanish when
	// rendered. Keep the first blank line (the normal paragraph break) and turn each additional one
	// into a zero-width-space paragraph — real blank-line-separated blocks, so lists/headings around
	// them still parse, but the vertical space the user typed is preserved.
	const ZWSP = '​'; // zero-width space: an "empty" paragraph that still holds vertical space
	function preserveBlankLines(md: string): string {
		return md.replace(/\n{2,}/g, (run) => '\n\n' + `${ZWSP}\n\n`.repeat(run.length - 2));
	}

	// marked runs synchronously with our options; sanitize before {@html}. Guarded to the browser
	// since DOMPurify needs a real DOM (the app is client-rendered, but the page still SSRs).
	const html = $derived(
		browser && value.trim()
			? DOMPurify.sanitize(
					marked.parse(preserveBlankLines(value), { async: false, breaks: true, gfm: true })
				)
			: ''
	);
</script>

{#if html}
	<div class="markdown-body {className}">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized above with DOMPurify -->
		{@html html}
	</div>
{/if}

<style>
	/* Markdown output is injected via {@html}, so it needs :global to be styled. */
	.markdown-body :global(h1),
	.markdown-body :global(h2),
	.markdown-body :global(h3) {
		font-weight: 600;
		margin: 0.4em 0 0.2em;
		line-height: 1.25;
	}
	.markdown-body :global(h1) {
		font-size: 1.25em;
	}
	.markdown-body :global(h2) {
		font-size: 1.1em;
	}
	.markdown-body :global(h3) {
		font-size: 1em;
	}
	.markdown-body :global(p) {
		margin: 0.4em 0;
	}
	.markdown-body :global(:first-child) {
		margin-top: 0;
	}
	.markdown-body :global(:last-child) {
		margin-bottom: 0;
	}
	.markdown-body :global(ul),
	.markdown-body :global(ol) {
		margin: 0.4em 0;
		padding-left: 1.4em;
	}
	.markdown-body :global(ul) {
		list-style: disc;
	}
	.markdown-body :global(ol) {
		list-style: decimal;
	}
	.markdown-body :global(a) {
		color: #5865f2;
		text-decoration: underline;
	}
	.markdown-body :global(code) {
		background: #1e1f22;
		border-radius: 4px;
		padding: 0.1em 0.35em;
		font-size: 0.9em;
	}
	.markdown-body :global(pre) {
		background: #1e1f22;
		border-radius: 6px;
		padding: 0.6em 0.8em;
		overflow-x: auto;
		margin: 0.5em 0;
	}
	.markdown-body :global(pre code) {
		background: none;
		padding: 0;
	}
	.markdown-body :global(blockquote) {
		border-left: 3px solid #4e5058;
		margin: 0.5em 0;
		padding-left: 0.8em;
		color: #b5bac1;
	}
	.markdown-body :global(strong) {
		font-weight: 600;
	}
	.markdown-body :global(hr) {
		border: none;
		border-top: 1px solid #3f4147;
		margin: 0.6em 0;
	}
</style>

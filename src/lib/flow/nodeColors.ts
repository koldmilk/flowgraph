import type { PanelNodeType } from './nodeCatalog';
import { hexToRgba } from './commentColors';

// Node colors are chosen at runtime (from the attributes panel), so nodes style themselves with
// inline colors derived from these hexes rather than build-time Tailwind classes.
export type NodeColor = { name: string; hex: string };

export const nodeColors: NodeColor[] = [
	{ name: 'Amber', hex: '#e0a63b' },
	{ name: 'Orange', hex: '#e8722c' },
	{ name: 'Red', hex: '#f23f42' },
	{ name: 'Pink', hex: '#eb459e' },
	{ name: 'Purple', hex: '#9b59d0' },
	{ name: 'Blurple', hex: '#5865f2' },
	{ name: 'Blue', hex: '#4a86e0' },
	{ name: 'Teal', hex: '#1ab4b0' },
	{ name: 'Green', hex: '#23a55a' },
	{ name: 'Gray', hex: '#80848e' }
];

// The color a node falls back to when its data has none, keyed by type.
export const defaultNodeColor: Record<PanelNodeType, string> = {
	source: '#23a55a',
	destination: '#f23f42',
	sourceDestination: '#5865f2',
	switch: '#9b59d0',
	group: '#80848e'
};

// Blend a color over a base by weight (amount = share of `hex`). Used to build the dark, tinted body
// fill from the header color so any palette entry produces a matching body.
export function mixHex(hex: string, base: string, amount: number): string {
	const parse = (h: string) => {
		const n = parseInt(h.slice(1), 16);
		return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
	};
	const [r1, g1, b1] = parse(hex);
	const [r2, g2, b2] = parse(base);
	const m = (a: number, b: number) => Math.round(a * amount + b * (1 - amount));
	return `rgb(${m(r1, r2)}, ${m(g1, g2)}, ${m(b1, b2)})`;
}

// Inline styles for a node's parts, all derived from one header hex.
export function nodeColorStyles(hex: string) {
	return {
		header: `background-color: ${hex};`,
		body: `background-color: ${mixHex(hex, '#1e1f22', 0.2)};`,
		border: `border-color: ${hexToRgba(hex, 0.4)};`,
		handle: `background-color: ${hex};`,
		ring: hex
	};
}

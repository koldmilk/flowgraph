// Palette for comment boxes. Colors are chosen at runtime, so comments style themselves with inline
// rgba() derived from these hexes rather than Tailwind classes (which are generated at build time).
export type CommentColor = { name: string; hex: string };

export const commentColors: CommentColor[] = [
	{ name: 'Amber', hex: '#e0a63b' },
	{ name: 'Green', hex: '#23a55a' },
	{ name: 'Teal', hex: '#1ab4b0' },
	{ name: 'Blue', hex: '#4a86e0' },
	{ name: 'Blurple', hex: '#5865f2' },
	{ name: 'Purple', hex: '#9b59d0' },
	{ name: 'Red', hex: '#f23f42' },
	{ name: 'Gray', hex: '#80848e' }
];

export const DEFAULT_COMMENT_COLOR = '#e0a63b';

export function hexToRgba(hex: string, alpha: number): string {
	const n = parseInt(hex.slice(1), 16);
	const r = (n >> 16) & 255;
	const g = (n >> 8) & 255;
	const b = n & 255;
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

import { base } from '$app/paths';

// The Material Design icon set, served as static files by scripts/sync-icons.mjs. Nodes store an icon
// by name + style, so a graph carries a couple of short strings rather than any artwork.
export const ICON_STYLES = ['filled', 'outlined', 'round', 'sharp', 'two-tone'] as const;
export type IconStyle = (typeof ICON_STYLES)[number];

export const ICON_STYLE_LABELS: Record<IconStyle, string> = {
	filled: 'Filled',
	outlined: 'Outlined',
	round: 'Round',
	sharp: 'Sharp',
	'two-tone': 'Two-tone'
};

export const DEFAULT_ICON_STYLE: IconStyle = 'filled';
// What a fresh icon node wears until you pick something: deliberately generic, so it reads as "choose
// an icon" rather than as a meaningful symbol someone placed on purpose.
export const DEFAULT_ICON = 'category';

export function iconUrl(name: string, style: IconStyle = DEFAULT_ICON_STYLE): string {
	return `${base}/material-icons/${style}/${name}.svg`;
}

// Names are underscored (`photo_camera`); spaces read better in the UI and in search.
export function iconLabel(name: string): string {
	return name.replace(/_/g, ' ');
}

export function iconSearchKey(query: string): string {
	return query.trim().toLowerCase().replace(/\s+/g, '_');
}

// One fetch per session, shared by every picker that opens. The promise itself is the cache, so
// pickers opened at the same time queue on one request; a failure clears it so the next open retries.
let namesRequest: Promise<string[]> | null = null;

export function loadIconNames(): Promise<string[]> {
	namesRequest ??= fetch(`${base}/material-icons/index.json`)
		.then((response) => {
			if (!response.ok) throw new Error(`Icon list unavailable (${response.status})`);
			return response.json();
		})
		.then((manifest: { names?: string[] }) => manifest.names ?? [])
		.catch((err) => {
			namesRequest = null;
			throw err;
		});
	return namesRequest;
}

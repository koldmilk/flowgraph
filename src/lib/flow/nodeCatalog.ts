import type { Accent } from './nodes/theme';

// Types shown with the full attributes panel (name/description/color). The three signal types can be
// converted among themselves; 'switch' also gets the panel but manages its own variable set of named
// input/output pins instead, so it isn't part of the convert-between family.
export type SignalNodeType = 'source' | 'destination' | 'sourceDestination';
// 'group' is a collapsed subgraph: like the panel nodes it has a name/description/color, but it's
// created only by collapsing a selection (never from the add menu) and opens its own workspace tab.
export type PanelNodeType = SignalNodeType | 'switch' | 'group';

export const nodeCatalog: Record<PanelNodeType, { label: string; accent: Accent }> = {
	source: { label: 'Source', accent: 'green' },
	destination: { label: 'Destination', accent: 'red' },
	sourceDestination: { label: 'Source + Destination', accent: 'blurple' },
	switch: { label: 'Switch', accent: 'purple' },
	group: { label: 'Group', accent: 'gray' }
};

// Only the signal types convert between one another (a switch has a variable pin set, so it stays put).
export const convertibleTypes: SignalNodeType[] = ['source', 'destination', 'sourceDestination'];

export function isConvertibleType(type: string | null | undefined): type is SignalNodeType {
	return type != null && (convertibleTypes as string[]).includes(type);
}

// A single named connection point on a switch node. The id doubles as the Handle id, so edges attach
// to a specific pin via their source/target handle.
export type SwitchPin = { id: string; name: string };

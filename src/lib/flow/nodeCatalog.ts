import type { Accent } from './nodes/theme';

// Types shown with the full attributes panel (name/description/color). The three signal types can be
// converted among themselves; 'switch' also gets the panel but manages its own variable set of named
// input/output pins instead, so it isn't part of the convert-between family.
export type SignalNodeType = 'source' | 'destination' | 'sourceDestination';
// 'group' is a collapsed subgraph: like the panel nodes it has a name/description/color, but it's
// created only by collapsing a selection (never from the add menu) and opens its own workspace tab.
// 'text' is a standalone note: a markdown box with a color, carrying no pins and no wiring.
// 'media' is a resizable image, video or audio clip dropped onto the canvas -- likewise decoration,
// not signal flow.
// 'arrow' is a free-floating pointer: a curved line with an arrowhead and draggable control points.
// 'icon' is a Material icon wired into the flow -- one input, one output, and an optional name.
export type PanelNodeType =
	| SignalNodeType
	| 'switch'
	| 'group'
	| 'text'
	| 'media'
	| 'youtube'
	| 'arrow'
	| 'icon';

export const nodeCatalog: Record<PanelNodeType, { label: string; accent: Accent }> = {
	source: { label: 'Source', accent: 'green' },
	destination: { label: 'Destination', accent: 'red' },
	sourceDestination: { label: 'Source + Destination', accent: 'blurple' },
	switch: { label: 'Switch', accent: 'purple' },
	group: { label: 'Group', accent: 'gray' },
	text: { label: 'Text Box', accent: 'amber' },
	media: { label: 'Media', accent: 'teal' },
	youtube: { label: 'YouTube Video', accent: 'red' },
	arrow: { label: 'Arrow', accent: 'amber' },
	icon: { label: 'Icon', accent: 'gray' }
};

// A point on an arrow, stored relative to the arrow node's own position.
export type ArrowPoint = { x: number; y: number };

// What the menu offers when a spline is dropped on empty canvas: the signal types, plus 'icon'. All of
// them have a fixed input and/or output for the loose end to land on -- a switch's pins are named and
// variable, so there'd be no obvious one to attach to.
export type ConnectableNodeType = SignalNodeType | 'icon';

// Only the signal types convert between one another (a switch has a variable pin set, so it stays put).
export const convertibleTypes: SignalNodeType[] = ['source', 'destination', 'sourceDestination'];

export function isConvertibleType(type: string | null | undefined): type is SignalNodeType {
	return type != null && (convertibleTypes as string[]).includes(type);
}

// A single named connection point on a switch node. The id doubles as the Handle id, so edges attach
// to a specific pin via their source/target handle.
export type SwitchPin = { id: string; name: string };

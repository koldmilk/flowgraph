import type { Accent } from './nodes/theme';

export type SignalNodeType = 'source' | 'destination' | 'sourceDestination';

export const nodeCatalog: Record<SignalNodeType, { label: string; accent: Accent }> = {
	source: { label: 'Source', accent: 'green' },
	destination: { label: 'Destination', accent: 'red' },
	sourceDestination: { label: 'Source + Destination', accent: 'blurple' }
};

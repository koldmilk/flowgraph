// Shared sizing/border for signal-node connection handles. The fill color is applied separately via
// an inline style (handleStyle) since node colors are chosen at runtime.
export const handleClass =
	'!h-3 !w-3 !min-h-0 !min-w-0 !rounded-full !border-2 !border-[#1e1f22] transition-shadow hover:!shadow-[0_0_0_3px_rgba(255,255,255,0.18)]';

export const handleStyle = (hex: string) => `background-color: ${hex} !important;`;

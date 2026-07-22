import { accentTheme, type Accent } from './theme';

export const handleClass = (accent: Accent) =>
	`!h-3 !w-3 !min-h-0 !min-w-0 !rounded-full !border-2 !border-[#1e1f22] transition-shadow hover:!shadow-[0_0_0_3px_rgba(255,255,255,0.18)] ${accentTheme[accent].handle}`;

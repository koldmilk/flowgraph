export type Accent = 'green' | 'red' | 'blurple' | 'purple' | 'gray';

export const accentTheme: Record<
	Accent,
	{ header: string; body: string; border: string; ring: string; handle: string }
> = {
	green: {
		header: 'bg-[#23a55a]',
		body: 'bg-[#2b3a33]',
		border: 'border-[#23a55a]/40',
		ring: 'ring-[#23a55a]',
		handle: '!bg-[#23a55a]'
	},
	red: {
		header: 'bg-[#f23f42]',
		body: 'bg-[#3a2c2e]',
		border: 'border-[#f23f42]/40',
		ring: 'ring-[#f23f42]',
		handle: '!bg-[#f23f42]'
	},
	blurple: {
		header: 'bg-[#5865f2]',
		body: 'bg-[#2e3142]',
		border: 'border-[#5865f2]/40',
		ring: 'ring-[#5865f2]',
		handle: '!bg-[#5865f2]'
	},
	purple: {
		header: 'bg-[#9b59d0]',
		body: 'bg-[#332a3d]',
		border: 'border-[#9b59d0]/40',
		ring: 'ring-[#9b59d0]',
		handle: '!bg-[#9b59d0]'
	},
	gray: {
		header: 'bg-[#80848e]',
		body: 'bg-[#33353b]',
		border: 'border-[#80848e]/40',
		ring: 'ring-[#80848e]',
		handle: '!bg-[#80848e]'
	}
};

// Loading media files for media nodes. Shared by the canvas drop handler and the empty media node's
// own file picker, so a file gets the same treatment however it arrives.

export type MediaKind = 'image' | 'video' | 'audio';

// Longest edge a freshly added image or video is scaled down to, so a big file doesn't swamp the
// canvas.
export const MEDIA_MAX = 360;

// Audio has no intrinsic size -- it's a player bar, so it gets a fixed default box instead.
export const AUDIO_WIDTH = 320;
export const AUDIO_HEIGHT = 96;

// Files become data URLs, which cost ~1.37x their size in memory and again in the graph. Video makes
// that bite: a few hundred megabytes of base64 will stall or crash the tab, so oversized files are
// refused up front with a message rather than silently taking the browser down.
export const MEDIA_MAX_BYTES = 50 * 1024 * 1024;

export type LoadedMedia = { kind: MediaKind; src: string; width: number; height: number };

// What kind of media node a file wants to become, or null if we don't handle it.
export function mediaKind(file: File): MediaKind | null {
	if (file.type.startsWith('image/')) return 'image';
	if (file.type.startsWith('video/')) return 'video';
	if (file.type.startsWith('audio/')) return 'audio';
	return null;
}

// The accept attribute for a file picker on a node of the given kind. An unseeded media node (one
// created by a drop-less "Add Media") takes anything we can render.
export function acceptFor(kind: MediaKind | undefined): string {
	if (kind === 'image') return 'image/*';
	if (kind === 'video') return 'video/*';
	if (kind === 'audio') return 'audio/*';
	return 'image/*,video/*,audio/*';
}

// Files are read as data URLs so the media lives in the graph itself, rather than pointing at a path
// that could move. The returned size preserves the natural aspect ratio -- the media node's box must
// match it, since images and video resize with that ratio locked.
export function readMediaFile(file: File): Promise<LoadedMedia> {
	const kind = mediaKind(file);
	if (!kind) return Promise.reject(new Error('Unsupported file type'));
	if (file.size > MEDIA_MAX_BYTES) {
		return Promise.reject(new Error(`File is too large (max ${MEDIA_MAX_BYTES / 1024 / 1024} MB)`));
	}

	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
		reader.onload = () => {
			const src = reader.result as string;
			if (kind === 'audio') {
				// Nothing to measure; the player bar sets its own proportions.
				resolve({ kind, src, width: AUDIO_WIDTH, height: AUDIO_HEIGHT });
				return;
			}
			measure(kind, src).then(
				([w, h]) => {
					const scale = Math.min(1, MEDIA_MAX / Math.max(w, h));
					resolve({ kind, src, width: Math.round(w * scale), height: Math.round(h * scale) });
				},
				(err) => reject(err)
			);
		};
		reader.readAsDataURL(file);
	});
}

// Natural dimensions, via whichever element can decode the format. A video container that turns out
// to hold no picture (an .mp4 of just audio) reports 0x0, so it falls back to the audio player box.
function measure(kind: 'image' | 'video', src: string): Promise<[number, number]> {
	return new Promise((resolve, reject) => {
		if (kind === 'image') {
			const img = new Image();
			img.onerror = () => reject(new Error('Could not decode image'));
			img.onload = () => resolve([img.naturalWidth, img.naturalHeight]);
			img.src = src;
			return;
		}
		const video = document.createElement('video');
		video.preload = 'metadata';
		video.onerror = () => reject(new Error('Could not decode video'));
		video.onloadedmetadata = () => {
			resolve(
				video.videoWidth && video.videoHeight
					? [video.videoWidth, video.videoHeight]
					: [AUDIO_WIDTH, AUDIO_HEIGHT]
			);
		};
		video.src = src;
	});
}

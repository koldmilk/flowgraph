// Pulling a video id out of whatever YouTube URL gets pasted in, and building the embed URL for it.

// Embeds are parked for now: playback proved unreliable (uploaders can disable embedding outright,
// and the player fought the canvas for pointer events). The node and its plumbing stay wired up --
// flip this back to true to put "YouTube Video" back in the Add Media menu.
export const YOUTUBE_ENABLED = false;

// Default embed box: YouTube is 16:9, and the media frame locks that ratio when resizing.
export const YOUTUBE_WIDTH = 360;
export const YOUTUBE_HEIGHT = 203;

const ID = /^[A-Za-z0-9_-]{11}$/;

// Accepts the usual shapes -- watch?v=, youtu.be/, /embed/, /shorts/, /live/ -- with any extra query
// params, plus a bare 11-character id. Returns null when nothing usable is found.
export function parseYouTubeId(input: string): string | null {
	const text = input.trim();
	if (!text) return null;
	if (ID.test(text)) return text;

	let url: URL;
	try {
		// Tolerate a pasted URL with no scheme (youtube.com/watch?v=...).
		url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
	} catch {
		return null;
	}

	const host = url.hostname.replace(/^www\./, '');
	if (host === 'youtu.be') {
		const id = url.pathname.slice(1).split('/')[0];
		return ID.test(id) ? id : null;
	}
	if (host !== 'youtube.com' && host !== 'm.youtube.com' && host !== 'youtube-nocookie.com') {
		return null;
	}

	const v = url.searchParams.get('v');
	if (v && ID.test(v)) return v;

	const parts = url.pathname.split('/').filter(Boolean);
	if (parts.length >= 2 && ['embed', 'shorts', 'live', 'v'].includes(parts[0])) {
		return ID.test(parts[1]) ? parts[1] : null;
	}
	return null;
}

// Matches the player URL YouTube's own "share > embed" produces. The nocookie host looks like a
// privacy win but refuses playback in more situations, so we stay on the standard host.
export const embedUrl = (id: string) => `https://www.youtube.com/embed/${id}`;
export const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

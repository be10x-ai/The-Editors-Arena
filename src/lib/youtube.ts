/**
 * YouTube link handling for submissions.
 *
 * Kept deliberately strict: the id is the only thing the judge portal embeds, so
 * anything we cannot parse into a plain 11-character id is rejected at the form
 * rather than stored and discovered broken on judging day.
 */

/** YouTube video ids are exactly 11 chars of [A-Za-z0-9_-]. */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

/**
 * Pulls the video id out of any common YouTube URL shape:
 *   youtube.com/watch?v=ID   youtu.be/ID   /shorts/ID   /embed/ID   /live/ID
 * Returns null when the input is not a YouTube video link.
 */
export function parseYoutubeId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  let url: URL;
  try {
    // Tolerate a pasted link with no scheme.
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  if (!HOSTS.has(url.hostname.toLowerCase())) return null;

  // youtu.be/ID — id is the first path segment.
  if (url.hostname.toLowerCase().endsWith("youtu.be")) {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return VIDEO_ID.test(id) ? id : null;
  }

  const v = url.searchParams.get("v");
  if (v && VIDEO_ID.test(v)) return v;

  const segments = url.pathname.split("/").filter(Boolean);
  // /shorts/ID, /embed/ID, /live/ID, /v/ID
  if (segments.length >= 2 && ["shorts", "embed", "live", "v"].includes(segments[0])) {
    return VIDEO_ID.test(segments[1]) ? segments[1] : null;
  }

  return null;
}

/** Canonical watch URL, so two spellings of the same video store identically. */
export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Privacy-preserving embed host: youtube-nocookie sets no tracking cookie until
 * the viewer presses play, which matters because judges are watching dozens.
 */
export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

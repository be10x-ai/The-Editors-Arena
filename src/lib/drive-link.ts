/**
 * Pulls the file id out of a Google Drive share link.
 *
 * Nothing here talks to Google — it is string parsing only, and deliberately
 * kept after the Drive/Sheets integration was removed. Task files are hosted on
 * Drive and an admin pastes the share URL, so the id is still needed to build a
 * canonical link; no service account or API access is involved.
 */
export function parseDriveFileId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  // Already a bare id.
  if (/^[A-Za-z0-9_-]{20,}$/.test(value)) return value;

  const patterns = [
    /\/file\/d\/([A-Za-z0-9_-]{20,})/,
    /[?&]id=([A-Za-z0-9_-]{20,})/,
    /\/d\/([A-Za-z0-9_-]{20,})/,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

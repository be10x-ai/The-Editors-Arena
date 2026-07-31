import { Readable } from "node:stream";

import {
  driveAccessToken,
  driveClient,
  driveCorpusParams,
  sharedDriveParams,
} from "@/lib/google/client";
import { env } from "@/lib/env";
import { safeFileSegment } from "@/lib/utils";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const ROOT_FOLDER_NAME = "Hackathon_Submissions";

export type DriveFileRef = {
  fileId: string;
  name: string;
  webViewLink: string;
  previewUrl: string;
  downloadUrl: string;
  sizeBytes?: number;
  mimeType?: string;
};

/** Drive's own iframe player — lets judges watch without downloading. */
export function drivePreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function driveViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

export function driveDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/** Extracts a file id from any of the Drive URL shapes an admin might paste. */
export function parseDriveFileId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
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

/** Idempotent folder lookup-or-create. */
export async function ensureFolder(name: string, parentId: string): Promise<string> {
  const drive = driveClient();
  const escaped = name.replace(/'/g, "\\'");

  const existing = await drive.files.list({
    q: `name = '${escaped}' and mimeType = '${FOLDER_MIME}' and '${parentId}' in parents and trashed = false`,
    fields: "files(id, name)",
    pageSize: 1,
    ...driveCorpusParams(),
  });

  const found = existing.data.files?.[0]?.id;
  if (found) return found;

  const created = await drive.files.create({
    requestBody: { name, mimeType: FOLDER_MIME, parents: [parentId] },
    fields: "id",
    ...sharedDriveParams,
  });

  if (!created.data.id) throw new Error(`Could not create Drive folder "${name}"`);
  return created.data.id;
}

/**
 * Resolves `Hackathon_Submissions/<CONTESTANT_ID>/`, creating both levels on
 * first use. The root is configurable so multiple editions can share a Drive.
 */
export async function ensureContestantFolder(
  contestantId: string,
  rootFolderId?: string | null,
): Promise<string> {
  const configuredRoot = rootFolderId || env.google.submissionsFolderId;
  if (!configuredRoot) {
    throw new Error(
      "GOOGLE_DRIVE_SUBMISSIONS_FOLDER_ID is not set — cannot create submission folders.",
    );
  }
  const root = await ensureFolder(ROOT_FOLDER_NAME, configuredRoot);
  return ensureFolder(safeFileSegment(contestantId), root);
}

/**
 * Starts a resumable upload and hands the session URI back to the browser.
 *
 * Why: Vercel caps a serverless request body at ~4.5 MB, so a multi-gigabyte
 * video can never be proxied through our own route. The browser PUTs directly
 * to Google with this one-time URI; we only ever see the resulting file id.
 */
export async function createResumableUploadSession(params: {
  folderId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  origin: string;
}): Promise<string> {
  const token = await driveAccessToken();

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": params.mimeType,
        "X-Upload-Content-Length": String(params.sizeBytes),
        // Google echoes CORS headers for the session URI only when it knows the origin.
        Origin: params.origin,
      },
      body: JSON.stringify({
        name: params.fileName,
        mimeType: params.mimeType,
        parents: [params.folderId],
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Drive refused the upload session (${response.status}): ${detail.slice(0, 500)}`,
    );
  }

  const uploadUrl = response.headers.get("location");
  if (!uploadUrl) throw new Error("Drive did not return a resumable session URL.");
  return uploadUrl;
}

/** Server-side upload path, used for small files and admin asset uploads. */
export async function uploadBuffer(params: {
  folderId: string;
  fileName: string;
  mimeType: string;
  body: Buffer;
}): Promise<DriveFileRef> {
  const drive = driveClient();
  const created = await drive.files.create({
    requestBody: {
      name: params.fileName,
      parents: [params.folderId],
      mimeType: params.mimeType,
    },
    media: {
      mimeType: params.mimeType,
      body: Readable.from(params.body),
    },
    fields: "id, name, size, mimeType, webViewLink",
    ...sharedDriveParams,
  });

  const fileId = created.data.id;
  if (!fileId) throw new Error("Drive upload did not return a file id.");

  return {
    fileId,
    name: created.data.name ?? params.fileName,
    webViewLink: created.data.webViewLink ?? driveViewUrl(fileId),
    previewUrl: drivePreviewUrl(fileId),
    downloadUrl: driveDownloadUrl(fileId),
    sizeBytes: created.data.size ? Number(created.data.size) : params.body.byteLength,
    mimeType: created.data.mimeType ?? params.mimeType,
  };
}

export async function getFile(fileId: string): Promise<DriveFileRef> {
  const drive = driveClient();
  const { data } = await drive.files.get({
    fileId,
    fields: "id, name, size, mimeType, webViewLink, trashed",
    ...sharedDriveParams,
  });

  if (!data.id || data.trashed) throw new Error("Drive file not found.");

  return {
    fileId: data.id,
    name: data.name ?? "",
    webViewLink: data.webViewLink ?? driveViewUrl(data.id),
    previewUrl: drivePreviewUrl(data.id),
    downloadUrl: driveDownloadUrl(data.id),
    sizeBytes: data.size ? Number(data.size) : undefined,
    mimeType: data.mimeType ?? undefined,
  };
}

/**
 * Grants link-based read access so the embedded player works for judges.
 *
 * Submissions are not public knowledge, but an unguessable Drive link is the
 * standard trade-off for iframe playback; the *portal* still gates who ever
 * sees that link. Set `restrictToDomain` to keep it inside your Workspace.
 */
export async function makeReadableByLink(
  fileId: string,
  restrictToDomain?: string,
): Promise<void> {
  const drive = driveClient();
  await drive.permissions.create({
    fileId,
    requestBody: restrictToDomain
      ? { role: "reader", type: "domain", domain: restrictToDomain }
      : { role: "reader", type: "anyone", allowFileDiscovery: false },
    ...sharedDriveParams,
  });
}

export async function renameFile(fileId: string, name: string): Promise<void> {
  const drive = driveClient();
  await drive.files.update({ fileId, requestBody: { name }, ...sharedDriveParams });
}

export async function trashFile(fileId: string): Promise<void> {
  const drive = driveClient();
  await drive.files.update({
    fileId,
    requestBody: { trashed: true },
    ...sharedDriveParams,
  });
}

/** Canonical submission filename: `EA20260001_Final_Video.mp4`. */
export function submissionFileName(contestantId: string, originalName: string): string {
  const extension = originalName.toLowerCase().endsWith(".mov") ? "mov" : "mp4";
  return `${safeFileSegment(contestantId)}_Final_Video.${extension}`;
}

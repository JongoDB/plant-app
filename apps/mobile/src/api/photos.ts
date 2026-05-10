import { authClient } from '../auth/client';
import { env } from '../config/env';

/**
 * Photo upload + URL helpers.
 *
 * RN's `fetch` accepts a FormData entry of the shape `{ uri, name, type }`
 * for files. TypeScript's standard FormData typings don't model that, so
 * we cast through a local helper type to keep the call site clean.
 */

export type PhotoMode = 'health' | 'growth' | 'general';

export interface UploadedPhoto {
  id: string;
  plantId?: string;
  width: number;
  height: number;
  takenAt: string;
  mode?: PhotoMode;
}

export interface UploadPhotoOptions {
  uri: string;
  mimeType: string;
  width: number;
  height: number;
  plantId?: string;
  mode?: PhotoMode;
}

interface RnFilePart {
  uri: string;
  name: string;
  type: string;
}

export async function uploadPhoto(opts: UploadPhotoOptions): Promise<UploadedPhoto> {
  const formData = new FormData();
  const filePart: RnFilePart = {
    uri: opts.uri,
    name: `photo.${extForMime(opts.mimeType)}`,
    type: opts.mimeType,
  };
  // RN-specific shape — TS types don't expose it, so cast through Blob.
  formData.append('file', filePart as unknown as Blob);
  formData.append('width', String(opts.width));
  formData.append('height', String(opts.height));
  if (opts.plantId) formData.append('plantId', opts.plantId);
  if (opts.mode) formData.append('mode', opts.mode);

  const cookie = authClient.getCookie();
  const headers: Record<string, string> = {};
  if (cookie) headers['Cookie'] = cookie;
  // Do NOT set Content-Type — fetch needs to set it with the multipart boundary.

  const res = await fetch(`${env.API_URL}/photos`, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'omit',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Photo upload failed (${res.status}): ${text || res.statusText}`);
  }
  return (await res.json()) as UploadedPhoto;
}

export function photoSource(photoId: string): { uri: string; headers?: Record<string, string> } {
  const cookie = authClient.getCookie();
  const headers: Record<string, string> = {};
  if (cookie) headers['Cookie'] = cookie;
  return {
    uri: `${env.API_URL}/photos/${photoId}`,
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
  };
}

function extForMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

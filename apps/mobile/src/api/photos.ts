import { Platform } from 'react-native';

import { authClient } from '../auth/client';
import { env } from '../config/env';

/**
 * Photo upload + URL helpers.
 *
 * Two FormData regimes — easy to get wrong:
 *  - Native: RN-specific shape `{ uri, name, type }`. RN's fetch reads the
 *    file off the filesystem and serializes it. TypeScript's FormData type
 *    doesn't model this, so we cast.
 *  - Web: standard `Blob` / `File`. The picker hands us a `blob:` URI that
 *    we have to resolve to an actual Blob via fetch() before appending —
 *    pass the {uri,...} shape and the browser stringifies it as
 *    "[object Object]" and uploads garbage.
 *
 * Auth: same platform split as src/api/client.ts — manual Cookie + 'omit'
 * on native, browser-managed + 'include' on web.
 */
const FETCH_CREDENTIALS: RequestCredentials = Platform.OS === 'web' ? 'include' : 'omit';

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
  const filename = `photo.${extForMime(opts.mimeType)}`;

  if (Platform.OS === 'web') {
    // Browser FormData wants a real Blob; resolve the picker's blob: URI.
    const response = await fetch(opts.uri);
    if (!response.ok) {
      throw new Error(`Couldn't read picked image (HTTP ${response.status}).`);
    }
    const blob = await response.blob();
    formData.append('file', blob, filename);
  } else {
    // RN: pass the {uri, name, type} shape; the platform fetch reads from
    // the filesystem and serializes the multipart entry.
    const filePart: RnFilePart = {
      uri: opts.uri,
      name: filename,
      type: opts.mimeType,
    };
    formData.append('file', filePart as unknown as Blob);
  }
  formData.append('width', String(opts.width));
  formData.append('height', String(opts.height));
  if (opts.plantId) formData.append('plantId', opts.plantId);
  if (opts.mode) formData.append('mode', opts.mode);

  const headers: Record<string, string> = {};
  if (Platform.OS !== 'web') {
    const cookie = authClient.getCookie();
    if (cookie) headers['Cookie'] = cookie;
  }
  // Do NOT set Content-Type — fetch needs to set it with the multipart boundary.

  const res = await fetch(`${env.API_URL}/photos`, {
    method: 'POST',
    headers,
    body: formData,
    credentials: FETCH_CREDENTIALS,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Photo upload failed (${res.status}): ${text || res.statusText}`);
  }
  return (await res.json()) as UploadedPhoto;
}

export function photoSource(photoId: string): { uri: string; headers?: Record<string, string> } {
  // On web the browser sends the auth cookie via its own jar when the
  // image fetch hits a same-site URL with credentials. On native, attach
  // the cookie via Image source headers.
  if (Platform.OS === 'web') {
    return { uri: `${env.API_URL}/photos/${photoId}` };
  }
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

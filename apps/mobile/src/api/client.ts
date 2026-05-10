import { Platform } from 'react-native';
import type { HomeLocation, Plant } from '@plant-app/shared';

import { authClient } from '../auth/client';
import { env } from '../config/env';

/**
 * On native, @better-auth/expo stores the session cookie in SecureStore
 * (since there's no browser cookie jar) and we attach it as a Cookie header
 * with `credentials: 'omit'`. On web, the session cookie is HttpOnly so JS
 * can't see it; the browser handles cookies automatically when we use
 * `credentials: 'include'`.
 */
const FETCH_CREDENTIALS: RequestCredentials = Platform.OS === 'web' ? 'include' : 'omit';

/**
 * Tiny fetch wrapper. Grows with each slice (SSE for Rooti, etc.) but stays
 * a thin layer over fetch — no client lib.
 *
 * Auth: native uses the manual Cookie header from `authClient.getCookie()`;
 * web uses `credentials: 'include'` and lets the browser handle the
 * HttpOnly session cookie. See FETCH_CREDENTIALS above.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${env.API_URL}${path}`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';

  if (Platform.OS !== 'web') {
    const cookie = authClient.getCookie();
    if (cookie) headers['Cookie'] = cookie;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: FETCH_CREDENTIALS,
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = await res.text();
    } catch {
      // ignore
    }
    throw new ApiError(`${method} ${path} failed (${res.status}): ${detail}`, res.status, path);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

export interface HealthResponse {
  status: string;
  service: string;
  time: string;
}

export const healthApi = {
  ping: () => api.get<HealthResponse>('/health'),
};

export interface MeResponse {
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: string;
    updatedAt: string;
  };
  session: { expiresAt: string };
}

export const meApi = {
  get: () => api.get<MeResponse>('/me'),
};

export interface CreatePlantInput {
  nickname: string;
  scientificName?: string;
  commonName?: string;
  homeLocation?: HomeLocation;
  acquiredOn?: string;
  notes?: string;
}

export interface UpdatePlantInput {
  nickname?: string;
  scientificName?: string | null;
  commonName?: string | null;
  homeLocation?: {
    description?: string;
    lightExposure?: HomeLocation['lightExposure'] | null;
  };
  acquiredOn?: string | null;
  notes?: string | null;
}

export const plantsApi = {
  list: () => api.get<Plant[]>('/plants'),
  get: (id: string) => api.get<Plant>(`/plants/${id}`),
  create: (input: CreatePlantInput) => api.post<Plant>('/plants', input),
  update: (id: string, input: UpdatePlantInput) => api.patch<Plant>(`/plants/${id}`, input),
  remove: (id: string) => api.delete<void>(`/plants/${id}`),
};

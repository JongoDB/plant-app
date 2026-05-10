import { env } from '../config/env';

/**
 * Tiny fetch wrapper. Grows with each slice (auth headers, error mapping,
 * SSE for Rooti, etc.) but stays a thin layer over fetch — no client lib.
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
  const res = await fetch(url, {
    method,
    headers: body
      ? { 'Content-Type': 'application/json', Accept: 'application/json' }
      : { Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
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

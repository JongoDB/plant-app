import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

import { env } from '../config/env';

/**
 * Mobile auth client. Talks to the API at /api/auth/*.
 *
 * The expoClient plugin stores session cookies in SecureStore (encrypted on
 * device) and attaches them on requests it makes through `authClient.$fetch`.
 * For our own non-auth API calls we pull the cookie via `authClient.getCookie()`
 * and attach it manually — see `api/client.ts`.
 *
 * `scheme` matches `app.json` for deep links (used later for OAuth callbacks
 * — not in Slice 1 since OAuth is placeholder-only).
 * `storagePrefix` namespaces our SecureStore keys so multiple apps on the
 * same device don't collide.
 */
export const authClient = createAuthClient({
  baseURL: env.API_URL,
  plugins: [
    expoClient({
      scheme: 'plantapp',
      storagePrefix: 'plantapp',
      storage: SecureStore,
    }),
  ],
});

export type AuthClient = typeof authClient;

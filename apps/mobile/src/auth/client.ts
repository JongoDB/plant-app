import { Platform } from 'react-native';
import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';

import { env } from '../config/env';
import { authStorage } from './storage';

/**
 * Auth client.
 *
 * Two distinct cookie regimes:
 *  - Native: there is no browser cookie jar, so the @better-auth/expo
 *    expoClient plugin parses Set-Cookie itself, stores the session in
 *    SecureStore, and exposes it via `authClient.getCookie()`. Our API
 *    wrapper attaches it as a `Cookie:` header on every authed call.
 *  - Web: the browser handles HttpOnly session cookies natively. JS can't
 *    even see them. expoClient on web is at best redundant and at worst
 *    interferes (it would try to read/write a cookie it can't see). So we
 *    drop the plugin and rely on `credentials: 'include'`.
 */
const plugins =
  Platform.OS === 'web'
    ? []
    : [
        expoClient({
          scheme: 'plantapp',
          storagePrefix: 'plantapp',
          storage: authStorage,
        }),
      ];

export const authClient = createAuthClient({
  baseURL: env.API_URL,
  plugins,
});

export type AuthClient = typeof authClient;

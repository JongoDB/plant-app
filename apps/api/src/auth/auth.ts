import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { expo } from '@better-auth/expo';

import { loadEnv } from '../config/env.js';
import { getDb, schema } from '../db/client.js';

const env = loadEnv();

/**
 * Better Auth instance.
 *
 * Slice 1 ships **email + password only** so the user can sign up, see the
 * authed experience, and decide if it feels right before we wire OAuth or
 * magic links. Trusted origins include the Expo dev URLs and our deep-link
 * scheme.
 *
 * OAuth providers (Google, Apple, Microsoft, Facebook) and magic links are
 * intentionally not configured here yet. The mobile UI renders disabled
 * placeholder buttons for them; flipping each on later is purely additive
 * (add provider config + env vars).
 */
export const auth = betterAuth({
  secret: env.AUTH_SECRET,
  baseURL: env.AUTH_BASE_URL,

  database: drizzleAdapter(getDb(), {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // No email verification gate in Slice 1. We'll flip this on once Resend
    // is wired (next time we revisit auth).
    requireEmailVerification: false,
    autoSignIn: true,
  },

  plugins: [expo()],

  trustedOrigins: [
    'plantapp://',
    // Expo Go / dev client
    'exp://',
    'exp://*',
    'exp://*:*',
    // Local dev (web and api)
    'http://localhost:3000',
    'http://localhost:8081',
    'http://localhost:19000',
    'http://localhost:19006',
  ],
});

export type Auth = typeof auth;

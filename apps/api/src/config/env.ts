import { z } from 'zod';

/**
 * Environment loader. Validated up-front so the server fails fast at boot
 * with a clear message when something is missing or malformed.
 *
 * Each slice that introduces a new external dependency adds its variables
 * here. Variables that aren't needed yet are kept optional (.optional()) so
 * the API can boot without them.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().url(),

  // Auth — config validated, but providers stay optional through Slice 0.
  AUTH_SECRET: z.string().min(16),
  AUTH_BASE_URL: z.string().url(),

  // Storage
  STORAGE_DIR: z.string().default('./data/storage'),
  STORAGE_PUBLIC_BASE_URL: z.string().url(),

  // Optional / future-slice variables
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_CLIENT_ID: z.string().optional(),
  FACEBOOK_CLIENT_SECRET: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // Either of these authenticates the Anthropic SDK. AUTH_TOKEN is the
  // OAuth path used by `claude setup-token` (Pro/Max subscription); API_KEY
  // is the billed key path. Provide at least one before Slice 3 endpoints
  // become functional.
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_AUTH_TOKEN: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-6'),

  PLANTNET_API_KEY: z.string().optional(),

  AI_WORKER_URL: z.string().url().optional(),

  APNS_TEAM_ID: z.string().optional(),
  APNS_KEY_ID: z.string().optional(),
  APNS_BUNDLE_ID: z.string().optional(),
  APNS_PRIVATE_KEY_PATH: z.string().optional(),
  APNS_PRODUCTION: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  FCM_SERVICE_ACCOUNT_JSON_PATH: z.string().optional(),
});

export type AppEnv = z.infer<typeof schema>;

let cached: AppEnv | undefined;

export function loadEnv(): AppEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

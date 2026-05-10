/**
 * Mobile env access. Only EXPO_PUBLIC_* variables are available in the JS
 * bundle. Anything secret must come from the API server.
 */
export const env = {
  API_URL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
} as const;

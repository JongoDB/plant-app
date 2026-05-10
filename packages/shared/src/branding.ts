/**
 * Single source of truth for app branding.
 *
 * App name is TBD — `displayName` is the placeholder shown in the UI.
 * Code-level slug stays `plant-app` (in package names, repo, env vars).
 * Rooti is the AI assistant persona name and stays fixed.
 *
 * To rename the app, edit `displayName` here. That's it.
 */
export const APP_SLUG = 'plant-app';
export const APP_DISPLAY_NAME = 'Plant App'; // placeholder
export const APP_TAGLINE = 'Care for your plants with confidence.';

export const ASSISTANT_NAME = 'Rooti';
export const ASSISTANT_TAGLINE = 'Your local-first plant expert.';

/**
 * Color palette for the placeholder UI. Refine later.
 * Picked to evoke leaves + warm earth + soft cream.
 */
export const COLORS = {
  primary: '#3D8B5A', // leaf green
  primaryDark: '#2E5D3F', // forest
  accent: '#C97B5A', // terracotta
  background: '#FAF7F0', // cream
  surface: '#FFFFFF',
  text: '#2A2A2A',
  textMuted: '#6B6B6B',
  border: '#E5E0D5',
  success: '#3D8B5A',
  warning: '#D4A24C',
  danger: '#B94A4A',
} as const;

export type ColorKey = keyof typeof COLORS;

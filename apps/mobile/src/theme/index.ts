import { branding } from '@plant-app/shared';

/**
 * App theme. The UI palette + typography live here; brand strings (app name,
 * Rooti's name) come straight from @plant-app/shared/branding so renaming
 * the app is one constant change.
 */
export const theme = {
  colors: branding.COLORS,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radii: {
    sm: 6,
    md: 12,
    lg: 20,
    pill: 999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
} as const;

export type Theme = typeof theme;

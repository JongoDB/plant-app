import type { SpeciesInfo } from '@plant-app/shared';

import { api } from './client';

export interface SpeciesEntry extends SpeciesInfo {
  slug: string;
}

export const speciesApi = {
  list: (q?: string) =>
    api.get<SpeciesEntry[]>(`/species${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  get: (slug: string) => api.get<SpeciesEntry>(`/species/${encodeURIComponent(slug)}`),
};

/** Slug derivation matches the server side (apps/api/src/data/species.ts). */
export function speciesSlug(scientificName: string): string {
  return scientificName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

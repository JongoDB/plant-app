import type {
  PlantIdProvider,
  PlantIdRequest,
  PlantIdResult,
  PlantIdSpeciesCandidate,
} from '@plant-app/shared';

/**
 * Pl@ntNet implementation of PlantIdProvider.
 *
 * Free tier: 500 identifications/day per API key. Health/disease info is
 * not provided — Pl@ntNet only does species ID. The `health` field on
 * PlantIdResult stays undefined; if/when we want disease detection we'll
 * swap to Plant.id behind the same interface.
 */

export interface PlantNetOptions {
  apiKey: string;
  /** Pl@ntNet project: 'all' (default, world flora) | 'weurope' | etc. */
  project?: string;
  /** Override base URL — useful for testing. */
  baseUrl?: string;
}

interface PlantNetResponse {
  results: Array<{
    score: number;
    species: {
      scientificNameWithoutAuthor: string;
      commonNames?: string[];
    };
  }>;
  remainingIdentificationRequests?: number;
}

export class PlantNetPlantIdProvider implements PlantIdProvider {
  private readonly apiKey: string;
  private readonly project: string;
  private readonly baseUrl: string;

  constructor(opts: PlantNetOptions) {
    if (!opts.apiKey) {
      throw new Error('PlantNetPlantIdProvider requires PLANTNET_API_KEY.');
    }
    this.apiKey = opts.apiKey;
    this.project = opts.project ?? 'all';
    this.baseUrl = opts.baseUrl ?? 'https://my-api.plantnet.org';
  }

  async identifyByPhoto(req: PlantIdRequest): Promise<PlantIdResult> {
    const form = new FormData();
    // Node's Blob accepts Uint8Array directly; copying through a fresh
    // Uint8Array keeps the typed-array brand TypeScript expects.
    const blob = new Blob([new Uint8Array(req.image)], { type: req.mimeType });
    const filename = filenameFor(req.mimeType);
    form.append('images', blob, filename);

    const url = `${this.baseUrl}/v2/identify/${encodeURIComponent(this.project)}?api-key=${encodeURIComponent(this.apiKey)}`;
    const res = await fetch(url, { method: 'POST', body: form });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Pl@ntNet API ${res.status}: ${body || res.statusText}`);
    }

    const data = (await res.json()) as PlantNetResponse;
    const species: PlantIdSpeciesCandidate[] = (data.results ?? [])
      .slice(0, 5)
      .map((r) => ({
        scientificName: r.species.scientificNameWithoutAuthor,
        commonNames: r.species.commonNames ?? [],
        confidence: r.score,
      }));

    return { species };
  }
}

function filenameFor(mime: string): string {
  if (mime === 'image/png') return 'photo.png';
  if (mime === 'image/webp') return 'photo.webp';
  return 'photo.jpg';
}

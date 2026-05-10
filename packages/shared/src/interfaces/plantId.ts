/**
 * Plant identification API. MVP impl uses Pl@ntNet (free tier).
 * Plant.id is the obvious upgrade path because it returns disease info too.
 */

export interface PlantIdRequest {
  /** JPEG/PNG image bytes. */
  image: Uint8Array;
  mimeType: string;
  /** Whether to ask for health/disease analysis if the provider supports it. */
  includeHealth?: boolean;
}

export interface PlantIdSpeciesCandidate {
  scientificName: string;
  commonNames: string[];
  /** 0..1 */
  confidence: number;
  /** Raw provider-specific extra info, kept for debug + future use. */
  raw?: Record<string, unknown>;
}

export interface PlantIdHealthIssue {
  name: string;
  description: string;
  /** 0..1 */
  confidence: number;
}

export interface PlantIdResult {
  species: PlantIdSpeciesCandidate[];
  health?: {
    isHealthy: boolean;
    issues: PlantIdHealthIssue[];
  };
}

export interface PlantIdProvider {
  identifyByPhoto(req: PlantIdRequest): Promise<PlantIdResult>;
}

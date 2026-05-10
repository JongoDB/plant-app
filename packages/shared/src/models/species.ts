import type { LightExposure } from './location.js';

/**
 * Care reference data for a plant species. Sourced from open datasets
 * (mixed quality acceptable for MVP) and refined over time.
 */
export interface SpeciesInfo {
  scientificName: string;
  commonNames: string[];
  light?: LightExposure;
  /** Days between waterings (range). */
  waterFrequencyDays?: { min: number; max: number };
  humidityRange?: { minPct: number; maxPct: number };
  temperatureRangeC?: { min: number; max: number };
  toxicToPets: boolean;
  toxicToHumans: boolean;
  fertilizerNotes?: string;
  soilNotes?: string;
  commonIssues?: string[];
  /** Where this row came from, e.g. "openfarm", "plantnet", "curated". */
  source?: string;
}

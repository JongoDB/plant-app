/** Geographic coordinates (decimal degrees). */
export interface GeoLocation {
  lat: number;
  lng: number;
}

/** Light exposure category for an indoor location. */
export type LightExposure = 'direct' | 'bright_indirect' | 'medium' | 'low';

/**
 * Where in the user's home a plant lives, e.g. "south window, living room".
 * Free-form description plus optional structured hints used by recommendations.
 */
export interface HomeLocation {
  description: string;
  lightExposure?: LightExposure;
  /** Optional indoor temperature/humidity averages, if user provides. */
  averageTempC?: number;
  averageHumidityPct?: number;
}

import type { GeoLocation } from '../models/location.js';

/**
 * Weather data for watering recommendations. MVP impl is Open-Meteo (free).
 */

export interface WeatherCurrent {
  temperatureC: number;
  /** 0..100 */
  humidityPct: number;
  /** mm/hour, if reported. */
  precipitationMmh?: number;
  /** Free-text description from the provider. */
  conditions?: string;
}

export interface WeatherDailyForecast {
  date: string; // YYYY-MM-DD
  tempMinC: number;
  tempMaxC: number;
  precipitationMm: number;
  humidityPct?: number;
}

export interface WeatherProvider {
  current(loc: GeoLocation): Promise<WeatherCurrent>;
  forecast(loc: GeoLocation, days: number): Promise<WeatherDailyForecast[]>;
}

import type {
  GeoLocation,
  WeatherCurrent,
  WeatherDailyForecast,
  WeatherProvider,
} from '@plant-app/shared';

/**
 * Open-Meteo implementation of WeatherProvider.
 *
 * No API key — free for non-commercial / hobby use, generous limits.
 * If we ever cross into commercial territory we either pay Open-Meteo's
 * fair-use commercial tier or swap providers behind this same interface.
 */

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';

interface OpenMeteoResponse {
  current?: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
  };
  daily?: {
    time: string[];
    temperature_2m_min: number[];
    temperature_2m_max: number[];
    precipitation_sum: number[];
    relative_humidity_2m_mean?: number[];
  };
}

export class OpenMeteoWeatherProvider implements WeatherProvider {
  async current(loc: GeoLocation): Promise<WeatherCurrent> {
    const url = new URL(BASE_URL);
    url.searchParams.set('latitude', String(loc.lat));
    url.searchParams.set('longitude', String(loc.lng));
    url.searchParams.set(
      'current',
      'temperature_2m,relative_humidity_2m,precipitation,weather_code',
    );
    url.searchParams.set('timezone', 'auto');

    const data = await fetchJson<OpenMeteoResponse>(url);
    const c = data.current;
    if (!c) throw new Error('Open-Meteo returned no current weather.');
    return {
      temperatureC: c.temperature_2m,
      humidityPct: c.relative_humidity_2m,
      precipitationMmh: c.precipitation,
      conditions: weatherCodeLabel(c.weather_code),
    };
  }

  async forecast(loc: GeoLocation, days: number): Promise<WeatherDailyForecast[]> {
    const url = new URL(BASE_URL);
    url.searchParams.set('latitude', String(loc.lat));
    url.searchParams.set('longitude', String(loc.lng));
    url.searchParams.set(
      'daily',
      'temperature_2m_min,temperature_2m_max,precipitation_sum,relative_humidity_2m_mean',
    );
    url.searchParams.set('forecast_days', String(Math.min(Math.max(days, 1), 16)));
    url.searchParams.set('timezone', 'auto');

    const data = await fetchJson<OpenMeteoResponse>(url);
    const d = data.daily;
    if (!d) return [];
    const out: WeatherDailyForecast[] = [];
    for (let i = 0; i < d.time.length; i++) {
      out.push({
        date: d.time[i]!,
        tempMinC: d.temperature_2m_min[i] ?? 0,
        tempMaxC: d.temperature_2m_max[i] ?? 0,
        precipitationMm: d.precipitation_sum[i] ?? 0,
        ...(d.relative_humidity_2m_mean?.[i] != null
          ? { humidityPct: d.relative_humidity_2m_mean[i]! }
          : {}),
      });
    }
    return out;
  }
}

async function fetchJson<T>(url: URL): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Open-Meteo ${res.status}: ${body || res.statusText}`);
  }
  return (await res.json()) as T;
}

// Truncated WMO weather code map — covers the categories the model is
// likely to surface in conversation. Anything else falls through to a
// generic descriptor.
function weatherCodeLabel(code: number): string {
  if (code === 0) return 'clear';
  if (code <= 2) return 'mostly clear';
  if (code === 3) return 'overcast';
  if (code <= 49) return 'fog';
  if (code <= 57) return 'drizzle';
  if (code <= 67) return 'rain';
  if (code <= 77) return 'snow';
  if (code <= 82) return 'showers';
  if (code <= 86) return 'snow showers';
  if (code <= 99) return 'thunderstorm';
  return 'unknown';
}

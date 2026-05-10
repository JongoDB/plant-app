// Slice 7 (location/water recs) replaces this with OpenMeteoWeatherProvider.
import type {
  GeoLocation,
  WeatherCurrent,
  WeatherDailyForecast,
  WeatherProvider,
} from '@plant-app/shared';

export class StubWeatherProvider implements WeatherProvider {
  async current(_loc: GeoLocation): Promise<WeatherCurrent> {
    throw new Error('WeatherProvider not wired yet — see weather/recs slice.');
  }
  async forecast(_loc: GeoLocation, _days: number): Promise<WeatherDailyForecast[]> {
    throw new Error('WeatherProvider not wired yet — see weather/recs slice.');
  }
}

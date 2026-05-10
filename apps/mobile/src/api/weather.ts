import type { WeatherCurrent, WeatherDailyForecast } from '@plant-app/shared';

import { api } from './client';

export interface WeatherResponse {
  current: WeatherCurrent;
  forecast: WeatherDailyForecast[];
}

export const weatherApi = {
  get: (lat: number, lng: number, days = 3) =>
    api.get<WeatherResponse>(`/weather?lat=${lat}&lng=${lng}&days=${days}`),
};

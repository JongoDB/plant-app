import type { PlantIdResult } from '@plant-app/shared';

import { api } from './client';

export const identifyApi = {
  byPhoto: (photoId: string) => api.post<PlantIdResult>('/identify', { photoId }),
};

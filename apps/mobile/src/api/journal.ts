import type { CareEventKind, PhotoCheckMode } from '@plant-app/shared';

import { api } from './client';

export type JournalEntry =
  | {
      kind: 'photo';
      id: string;
      plantId: string | null;
      plantNickname: string | null;
      takenAt: string;
      mode: PhotoCheckMode | null;
    }
  | {
      kind: 'care';
      id: string;
      plantId: string;
      plantNickname: string | null;
      occurredAt: string;
      careKind: CareEventKind;
      notes: string | null;
    };

export const journalApi = {
  list: () => api.get<JournalEntry[]>('/journal'),
};

import type { Reminder, ReminderKind } from '@plant-app/shared';

import { api } from './client';

export interface CreateReminderInput {
  plantId: string;
  kind: ReminderKind;
  /** ISO-8601 datetime string. */
  nextDueAt: string;
  /** Days between repeats; omit for one-shot. */
  intervalDays?: number;
}

export interface UpdateReminderInput {
  active?: boolean;
  nextDueAt?: string;
  /** null clears the interval (one-shot); omit to leave unchanged. */
  intervalDays?: number | null;
}

export interface CompleteReminderResult {
  ok: true;
  reminder: Reminder;
  eventId: string;
  occurredAt: string;
}

export const remindersApi = {
  list: () => api.get<Reminder[]>('/reminders'),
  forPlant: (plantId: string) => api.get<Reminder[]>(`/plants/${plantId}/reminders`),
  create: (input: CreateReminderInput) => api.post<Reminder>('/reminders', input),
  update: (id: string, body: UpdateReminderInput) =>
    api.patch<Reminder>(`/reminders/${id}`, body),
  remove: (id: string) => api.delete<void>(`/reminders/${id}`),
  complete: (id: string, notes?: string) =>
    api.post<CompleteReminderResult>(`/reminders/${id}/complete`, notes ? { notes } : {}),
};

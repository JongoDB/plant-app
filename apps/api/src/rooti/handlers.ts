/**
 * Rooti tool handlers.
 *
 * Each entry in the registry implements one of the typed contracts defined
 * in @plant-app/shared. Real implementations land alongside their feature
 * slices (Slice 2 for plants, Slice 3 for the chat itself wiring, etc.).
 *
 * Stubs here throw with a clear pointer so the missing handler is obvious if
 * the LLM tries to call one before its slice ships.
 */

import type { RootiToolHandlerMap } from '@plant-app/shared';

export const rootiToolHandlers: RootiToolHandlerMap = {
  log_care_event: async () => {
    throw new Error('log_care_event handler not implemented — see Slice 2 (plants/care).');
  },
  add_plant: async () => {
    throw new Error('add_plant handler not implemented — see Slice 2 (plants).');
  },
  schedule_reminder: async () => {
    throw new Error('schedule_reminder handler not implemented — see reminders slice.');
  },
  save_plant_note: async () => {
    throw new Error('save_plant_note handler not implemented — see Slice 2.');
  },
  identify_plant: async () => {
    throw new Error('identify_plant handler not implemented — see Slice 5 (Plant ID).');
  },
};

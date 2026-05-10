/**
 * Rooti's tool-use schema as a typed contract.
 *
 * Goals:
 *  1. Each tool has typed input + output, so handlers are call-able from code
 *     and testable without an LLM in the loop.
 *  2. JSON schemas are co-located so we send a single source of truth to
 *     Claude.
 *  3. The list is closed (literal union of names) so adding a tool is a
 *     compile error if not registered everywhere.
 */

import type { Id, IsoDate, IsoDateTime } from '../models/common.js';
import type { CareEventKind, ReminderKind } from '../models/care.js';
import type { LlmToolDefinition } from '../interfaces/llm.js';

// ---------------------------------------------------------------------------
// Inputs / outputs (snake_case keys to match the LLM-facing schema 1:1)
// ---------------------------------------------------------------------------

export interface LogCareEventInput {
  plant_id: Id;
  kind: CareEventKind;
  occurred_at?: IsoDateTime; // defaults to now
  notes?: string;
  /** Optional structured detail, e.g. { amount_ml: 250 }. */
  metadata?: Record<string, unknown>;
}
export interface LogCareEventOutput {
  ok: true;
  event_id: Id;
  occurred_at: IsoDateTime;
}

export interface AddPlantInput {
  nickname: string;
  scientific_name?: string;
  common_name?: string;
  location_in_home?: string;
  acquired_on?: IsoDate;
  notes?: string;
}
export interface AddPlantOutput {
  ok: true;
  plant_id: Id;
}

export interface ScheduleReminderInput {
  plant_id: Id;
  kind: ReminderKind;
  next_due_at: IsoDateTime;
  interval_days?: number;
}
export interface ScheduleReminderOutput {
  ok: true;
  reminder_id: Id;
}

export interface SavePlantNoteInput {
  plant_id: Id;
  text: string;
}
export interface SavePlantNoteOutput {
  ok: true;
  note_event_id: Id;
}

export interface IdentifyPlantInput {
  /** ID of an already-uploaded photo. */
  photo_id: Id;
  /** Whether to attach the result to a plant in the user's collection. */
  attach_to_plant_id?: Id;
}
export interface IdentifyPlantOutput {
  ok: true;
  candidates: Array<{
    scientific_name: string;
    common_names: string[];
    confidence: number;
  }>;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export interface RootiToolRegistry {
  log_care_event: { input: LogCareEventInput; output: LogCareEventOutput };
  add_plant: { input: AddPlantInput; output: AddPlantOutput };
  schedule_reminder: { input: ScheduleReminderInput; output: ScheduleReminderOutput };
  save_plant_note: { input: SavePlantNoteInput; output: SavePlantNoteOutput };
  identify_plant: { input: IdentifyPlantInput; output: IdentifyPlantOutput };
}

export type RootiToolName = keyof RootiToolRegistry;
export type RootiToolInput<K extends RootiToolName> = RootiToolRegistry[K]['input'];
export type RootiToolOutput<K extends RootiToolName> = RootiToolRegistry[K]['output'];

/** Per-call context passed to every tool handler. */
export interface RootiToolContext {
  userId: Id;
  /** Optional anchor plant — set when the chat is opened from a plant detail. */
  anchorPlantId?: Id;
  /** Conversation in which this tool call is happening. */
  conversationId: Id;
}

export type RootiToolHandler<K extends RootiToolName> = (
  input: RootiToolInput<K>,
  ctx: RootiToolContext,
) => Promise<RootiToolOutput<K>>;

export type RootiToolHandlerMap = {
  [K in RootiToolName]: RootiToolHandler<K>;
};

// ---------------------------------------------------------------------------
// Tool definitions sent to Claude. Hand-written JSON Schema for clarity.
// ---------------------------------------------------------------------------

export const ROOTI_TOOL_DEFINITIONS: LlmToolDefinition[] = [
  {
    name: 'log_care_event',
    description:
      'Record a care action (water, fertilize, prune, repot, rotate, other) for a plant in the user\'s collection. Use when the user says they did something to a plant.',
    inputSchema: {
      type: 'object',
      properties: {
        plant_id: { type: 'string', description: 'UUID of the plant.' },
        kind: {
          type: 'string',
          enum: ['water', 'fertilize', 'prune', 'repot', 'rotate', 'other'],
          description: 'Type of care action.',
        },
        occurred_at: {
          type: 'string',
          description: 'ISO-8601 datetime. Defaults to now if omitted.',
        },
        notes: { type: 'string' },
        metadata: {
          type: 'object',
          description: 'Optional structured detail, e.g. { amount_ml: 250 } for waterings.',
          additionalProperties: true,
        },
      },
      required: ['plant_id', 'kind'],
    },
  },
  {
    name: 'add_plant',
    description: 'Add a new plant to the user\'s collection.',
    inputSchema: {
      type: 'object',
      properties: {
        nickname: { type: 'string' },
        scientific_name: { type: 'string' },
        common_name: { type: 'string' },
        location_in_home: {
          type: 'string',
          description: 'Free-form, e.g. "south window, living room".',
        },
        acquired_on: { type: 'string', description: 'ISO date.' },
        notes: { type: 'string' },
      },
      required: ['nickname'],
    },
  },
  {
    name: 'schedule_reminder',
    description: 'Schedule a recurring care reminder for a plant.',
    inputSchema: {
      type: 'object',
      properties: {
        plant_id: { type: 'string' },
        kind: {
          type: 'string',
          enum: ['water', 'fertilize', 'prune', 'repot', 'rotate'],
        },
        next_due_at: { type: 'string', description: 'ISO-8601 datetime.' },
        interval_days: {
          type: 'number',
          description: 'If set, reminder repeats every N days after firing.',
        },
      },
      required: ['plant_id', 'kind', 'next_due_at'],
    },
  },
  {
    name: 'save_plant_note',
    description: 'Save a free-text note attached to a plant\'s journal.',
    inputSchema: {
      type: 'object',
      properties: {
        plant_id: { type: 'string' },
        text: { type: 'string' },
      },
      required: ['plant_id', 'text'],
    },
  },
  {
    name: 'identify_plant',
    description:
      'Run plant identification on an already-uploaded photo. Optionally attach the top result to a plant in the collection.',
    inputSchema: {
      type: 'object',
      properties: {
        photo_id: { type: 'string' },
        attach_to_plant_id: { type: 'string' },
      },
      required: ['photo_id'],
    },
  },
];

/** All tool names that exist. Useful for runtime checks. */
export const ROOTI_TOOL_NAMES: RootiToolName[] = ROOTI_TOOL_DEFINITIONS.map(
  (t) => t.name as RootiToolName,
);

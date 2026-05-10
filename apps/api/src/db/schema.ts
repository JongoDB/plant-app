import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  jsonb,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core';

/**
 * Database schema. App-domain only for Slice 0.
 *
 * Better Auth's tables (user, session, account, verification) will be added
 * in Slice 1 — preferably generated via `npx @better-auth/cli generate`
 * against the Drizzle adapter so they stay in sync with the auth library's
 * shape.
 */

// ---- Plants ----------------------------------------------------------------

export const lightExposureEnum = pgEnum('light_exposure', [
  'direct',
  'bright_indirect',
  'medium',
  'low',
]);

export const plants = pgTable('plants', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Will be FK'd to Better Auth's user table in Slice 1.
  userId: text('user_id').notNull(),
  nickname: text('nickname').notNull(),
  scientificName: text('scientific_name'),
  commonName: text('common_name'),
  homeLocationDescription: text('home_location_description'),
  homeLocationLight: lightExposureEnum('home_location_light'),
  acquiredOn: timestamp('acquired_on', { mode: 'string', withTimezone: false }),
  notes: text('notes'),
  primaryPhotoId: uuid('primary_photo_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ---- Care events -----------------------------------------------------------

export const careEventKindEnum = pgEnum('care_event_kind', [
  'water',
  'fertilize',
  'prune',
  'repot',
  'rotate',
  'other',
]);

export const careEvents = pgTable('care_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  plantId: uuid('plant_id').notNull(),
  userId: text('user_id').notNull(),
  kind: careEventKindEnum('kind').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  notes: text('notes'),
  metadata: jsonb('metadata'),
});

// ---- Reminders -------------------------------------------------------------

export const reminderKindEnum = pgEnum('reminder_kind', [
  'water',
  'fertilize',
  'prune',
  'repot',
  'rotate',
]);

export const reminders = pgTable('reminders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  plantId: uuid('plant_id').notNull(),
  kind: reminderKindEnum('kind').notNull(),
  nextDueAt: timestamp('next_due_at', { withTimezone: true }).notNull(),
  intervalDays: integer('interval_days'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---- Photos ----------------------------------------------------------------

export const photoModeEnum = pgEnum('photo_mode', ['health', 'growth', 'general']);

export const photos = pgTable('photos', {
  id: uuid('id').primaryKey().defaultRandom(),
  plantId: uuid('plant_id'),
  userId: text('user_id').notNull(),
  storageKey: text('storage_key').notNull(),
  thumbnailKey: text('thumbnail_key'),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  takenAt: timestamp('taken_at', { withTimezone: true }).notNull().defaultNow(),
  mode: photoModeEnum('mode'),
  notes: text('notes'),
});

// ---- Videos ----------------------------------------------------------------

export const videos = pgTable('videos', {
  id: uuid('id').primaryKey().defaultRandom(),
  plantId: uuid('plant_id'),
  userId: text('user_id').notNull(),
  storageKey: text('storage_key').notNull(),
  thumbnailKey: text('thumbnail_key'),
  durationMs: integer('duration_ms').notNull(),
  takenAt: timestamp('taken_at', { withTimezone: true }).notNull().defaultNow(),
  notes: text('notes'),
});

// ---- Rooti conversations ---------------------------------------------------

export const rootiConversations = pgTable('rooti_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  title: text('title'),
  anchorPlantId: uuid('anchor_plant_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const rootiRoleEnum = pgEnum('rooti_role', ['user', 'assistant', 'tool']);

export const rootiMessages = pgTable('rooti_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull(),
  role: rootiRoleEnum('role').notNull(),
  /** Array of content blocks (see shared/RootiContentBlock). */
  content: jsonb('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Suppress an unused-import warning when sql isn't used yet.
void sql;

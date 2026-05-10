import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  jsonb,
  boolean,
  date,
  pgEnum,
} from 'drizzle-orm/pg-core';

/**
 * Database schema.
 *
 * The auth tables (user, session, account, verification) match Better Auth's
 * standard shape so the library can read/write them without a custom mapping.
 * Don't rename columns here without coordinating with the auth config.
 */

// =============================================================================
// Better Auth tables
// =============================================================================

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// =============================================================================
// App-domain tables
// =============================================================================

export const lightExposureEnum = pgEnum('light_exposure', [
  'direct',
  'bright_indirect',
  'medium',
  'low',
]);

export const plants = pgTable('plants', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  nickname: text('nickname').notNull(),
  scientificName: text('scientific_name'),
  commonName: text('common_name'),
  homeLocationDescription: text('home_location_description'),
  homeLocationLight: lightExposureEnum('home_location_light'),
  acquiredOn: date('acquired_on'),
  notes: text('notes'),
  primaryPhotoId: uuid('primary_photo_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

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
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  kind: careEventKindEnum('kind').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  notes: text('notes'),
  metadata: jsonb('metadata'),
});

export const reminderKindEnum = pgEnum('reminder_kind', [
  'water',
  'fertilize',
  'prune',
  'repot',
  'rotate',
]);

export const reminders = pgTable('reminders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  plantId: uuid('plant_id').notNull(),
  kind: reminderKindEnum('kind').notNull(),
  nextDueAt: timestamp('next_due_at', { withTimezone: true }).notNull(),
  intervalDays: integer('interval_days'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const photoModeEnum = pgEnum('photo_mode', ['health', 'growth', 'general']);

export const photos = pgTable('photos', {
  id: uuid('id').primaryKey().defaultRandom(),
  plantId: uuid('plant_id'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  storageKey: text('storage_key').notNull(),
  thumbnailKey: text('thumbnail_key'),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  takenAt: timestamp('taken_at', { withTimezone: true }).notNull().defaultNow(),
  mode: photoModeEnum('mode'),
  notes: text('notes'),
});

export const videos = pgTable('videos', {
  id: uuid('id').primaryKey().defaultRandom(),
  plantId: uuid('plant_id'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  storageKey: text('storage_key').notNull(),
  thumbnailKey: text('thumbnail_key'),
  durationMs: integer('duration_ms').notNull(),
  takenAt: timestamp('taken_at', { withTimezone: true }).notNull().defaultNow(),
  notes: text('notes'),
});

export const rootiConversations = pgTable('rooti_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
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
  content: jsonb('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

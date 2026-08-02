import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ─── users ───────────────────────────────────────────────────────────────────

export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // ULID
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── imports ─────────────────────────────────────────────────────────────────

export const imports = sqliteTable('imports', {
  id: text('id').primaryKey(), // ULID
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  fileHash: text('file_hash').notNull(),
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] })
    .notNull()
    .default('pending'),
  totalRecords: integer('total_records').notNull().default(0),
  importedRecords: integer('imported_records').notNull().default(0),
  duplicateRecords: integer('duplicate_records').notNull().default(0),
  invalidRecords: integer('invalid_records').notNull().default(0),
  startedAt: text('started_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  completedAt: text('completed_at'),
  errorMessage: text('error_message'),
});

// ─── user_settings ───────────────────────────────────────────────────────────

export const userSettings = sqliteTable('user_settings', {
  id: text('id').primaryKey(), // ULID
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  interfacePreferences: text('interface_preferences', { mode: 'json' })
    .notNull()
    .$defaultFn(() => '{}'),
  quotePreferences: text('quote_preferences', { mode: 'json' })
    .notNull()
    .$defaultFn(() => '{}'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── file_index ──────────────────────────────────────────────────────────────

export const fileIndex = sqliteTable('file_index', {
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  bookId: text('book_id').notNull().primaryKey(), // ULID
  relativePath: text('relative_path').notNull(),
  title: text('title').notNull(),
  author: text('author').notNull(),
  clippingCount: integer('clipping_count').notNull().default(0),
  fileHash: text('file_hash'),
  fileModifiedAt: text('file_modified_at'),
  indexedAt: text('indexed_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

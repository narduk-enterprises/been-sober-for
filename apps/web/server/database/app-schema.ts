import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { users } from '@narduk-enterprises/narduk-nuxt-template-layer/server/database/schema'

export * from '#server/database/auth-bridge-schema'

export const soberProfiles = sqliteTable('sober_profiles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  publicSlug: text('public_slug').notNull().unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  sobrietyStartedAt: text('sobriety_started_at'),
  shortMessage: text('short_message'),
  pageVisibility: text('page_visibility').notNull().default('unlisted'),
  allowSearchIndexing: integer('allow_search_indexing', { mode: 'boolean' })
    .notNull()
    .default(false),
  showStartDate: integer('show_start_date', { mode: 'boolean' }).notNull().default(true),
  showAvatar: integer('show_avatar', { mode: 'boolean' }).notNull().default(true),
  showQr: integer('show_qr', { mode: 'boolean' }).notNull().default(true),
  shareLayout: text('share_layout').notNull().default('standard'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export type SoberProfile = typeof soberProfiles.$inferSelect
export type NewSoberProfile = typeof soberProfiles.$inferInsert

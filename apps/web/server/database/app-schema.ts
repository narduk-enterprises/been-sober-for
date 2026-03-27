/**
 * App-owned database schema.
 *
 * drizzle-kit generates apps/web/drizzle/*.sql from this file only, so shared
 * layer tables are not duplicated into the app's migration directory.
 *
 * Example:
 *
 * import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
 * import { users } from '#layer/server/database/schema'
 *
 * export const posts = sqliteTable('posts', {
 *   id: integer('id').primaryKey({ autoIncrement: true }),
 *   authorId: text('author_id')
 *     .notNull()
 *     .references(() => users.id, { onDelete: 'cascade' }),
 *   title: text('title').notNull(),
 * })
 */
export {}

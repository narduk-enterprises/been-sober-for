/**
 * Combined runtime database schema.
 *
 * Re-export the layer schema plus any app-owned tables so runtime helpers such
 * as createAppDatabase() see the full schema. App-owned Drizzle migrations are
 * generated from app-schema.ts, not from this file.
 */
export * from '#layer/server/database/schema'
export * from '#server/database/app-schema'

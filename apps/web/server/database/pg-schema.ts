/**
 * Combined PostgreSQL runtime database schema.
 *
 * Mirrors schema.ts for Postgres-backed apps so createAppDatabase() can select
 * the correct schema set at runtime.
 */
export * from '#layer/server/database/pg-schema'
export * from '#server/database/pg-app-schema'

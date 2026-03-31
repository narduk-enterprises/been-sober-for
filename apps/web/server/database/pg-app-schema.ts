/**
 * PostgreSQL app-owned schema mirror.
 *
 * Keep this in sync with app-schema.ts when the app runs on Hyperdrive /
 * Postgres so generated SQL and runtime queries share the same dialect.
 */
export * from '#server/database/auth-bridge-pg-schema'

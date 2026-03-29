/// <reference types="@cloudflare/workers-types" />
/**
 * Health check endpoint for uptime monitoring and deployment verification.
 *
 * Returns app version, build timestamp, and D1 database readiness status.
 * Used by monitoring services (e.g. UptimeRobot, Cloudflare Health Checks).
 *
 * GET /api/health
 */
const REQUIRED_AUTH_TABLES = ['api_keys', 'sessions', 'users'] as const
const REQUIRED_AUTH_TABLE_SQL = REQUIRED_AUTH_TABLES.map((tableName) => `'${tableName}'`).join(', ')

export default defineEventHandler(async (event) => {
  const log = useLogger(event).child('Health')
  let dbStatus: 'ok' | 'not_available' | 'error' | 'schema_error' = 'not_available'
  let missingAuthTables: string[] = []

  try {
    const d1 = (event.context.cloudflare?.env as { DB?: D1Database })?.DB
    if (d1) {
      const result = await d1
        .prepare(
          `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${REQUIRED_AUTH_TABLE_SQL})`,
        )
        .all<{ name: string }>()
      const existingTables = new Set((result.results ?? []).map((row) => row.name))
      missingAuthTables = REQUIRED_AUTH_TABLES.filter((tableName) => !existingTables.has(tableName))
      dbStatus = missingAuthTables.length === 0 ? 'ok' : 'schema_error'

      if (missingAuthTables.length > 0) {
        log.error('Health check DB schema probe failed', { missingAuthTables })
      }
    }
  } catch {
    log.error('Health check DB probe failed')
    dbStatus = 'error'
  }

  const status =
    dbStatus === 'ok' ? 'ok' : dbStatus === 'error' ? ('error' as const) : ('degraded' as const)

  return {
    success: true as const,
    data: {
      status,
      timestamp: new Date().toISOString(),
      database: dbStatus,
      missingAuthTables,
    },
  }
})

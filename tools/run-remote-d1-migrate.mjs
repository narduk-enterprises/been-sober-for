import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const webDir = path.join(rootDir, 'apps', 'web')
const drizzleConfigPath = path.join(webDir, 'drizzle.config.ts')
const wranglerPath = path.join(webDir, 'wrangler.json')

function fail(message) {
  console.error(`❌ ${message}`)
  process.exit(1)
}

if (fs.existsSync(drizzleConfigPath)) {
  const drizzleConfig = fs.readFileSync(drizzleConfigPath, 'utf8')
  if (/\bdialect:\s*['"]postgres(?:ql)?['"]/.test(drizzleConfig)) {
    console.log('ℹ️ Skipping remote D1 migration because this app is configured for Postgres.')
    process.exit(0)
  }
}

if (!fs.existsSync(wranglerPath)) {
  fail(`Missing ${wranglerPath}.`)
}

const wrangler = JSON.parse(fs.readFileSync(wranglerPath, 'utf8'))
const databaseName =
  wrangler?.d1_databases?.find?.((database) => database?.binding === 'DB')?.database_name ||
  wrangler?.d1_databases?.[0]?.database_name

if (typeof databaseName !== 'string' || !databaseName.trim()) {
  fail('Could not resolve a D1 database name from apps/web/wrangler.json.')
}

const result = spawnSync(
  'bash',
  [
    '../../tools/db-migrate.sh',
    databaseName.trim(),
    '--remote',
    '--dir',
    'node_modules/@narduk-enterprises/narduk-nuxt-template-layer/drizzle',
    '--dir',
    'drizzle',
  ],
  {
    cwd: webDir,
    env: process.env,
    stdio: 'inherit',
  },
)

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

export interface MintAgentAdminKeyCliOptions {
  appDir: string
  remote: boolean
  environment: string | null
  adminEmail: string | null
  userId: string | null
  scopes: string[]
  expiresInDays: number | null
  name: string
  siteUrl: string | null
  verifyPath: string
  dopplerProject: string | null
  dopplerConfig: string | null
  secretName: string
  showRawKey: boolean
}

export interface AgentAdminKeyRecord {
  id: string
  rawKey: string
  keyHash: string
  keyPrefix: string
  scopes: string[]
  scopesJson: string
  createdAt: string
  expiresAt: number | null
}

interface WranglerD1DatabaseConfig {
  database_name?: string
}

interface WranglerEnvironmentConfig {
  d1_databases?: WranglerD1DatabaseConfig[]
}

interface WranglerDatabaseConfig extends WranglerEnvironmentConfig {
  env?: Record<string, WranglerEnvironmentConfig>
}

interface D1ExecuteResponse<Row = Record<string, unknown>> {
  results?: Row[]
  success?: boolean
  meta?: Record<string, unknown>
}

interface AdminUserRow {
  id: string
  email: string
}

const DEFAULT_VERIFY_PATH = '/api/auth/me'
const DEFAULT_SECRET_NAME = 'AGENT_ADMIN_API_KEY'
const DEFAULT_EXPIRES_IN_DAYS = 30
const DEFAULT_APP_DIR = 'apps/web'
const BOOLEAN_FLAGS = new Set(['--remote', '--show-raw-key'])
const VALUE_FLAGS = new Set([
  '--app-dir',
  '--admin-email',
  '--user-id',
  '--scope',
  '--scopes',
  '--expires-in-days',
  '--name',
  '--site-url',
  '--verify-path',
  '--doppler-project',
  '--doppler-config',
  '--secret-name',
  '--environment',
  '--wrangler-env',
])
const VALUE_FLAG_ALIASES = new Map<string, string>([['--wrangler-env', '--environment']])

interface ParsedCliArgs {
  booleans: Set<string>
  values: Map<string, string[]>
}

export function normalizeScopes(rawScopes: readonly string[]): string[] {
  const deduped = new Set<string>()

  for (const entry of rawScopes) {
    for (const fragment of entry.split(',')) {
      const scope = fragment.trim()
      if (scope) {
        deduped.add(scope)
      }
    }
  }

  return [...deduped]
}

export function resolveExpiryTimestamp(
  expiresInDays: number | null,
  now: Date = new Date(),
): number | null {
  if (expiresInDays === null) {
    return null
  }

  return Math.floor(now.getTime() / 1000) + expiresInDays * 86400
}

export function escapeSqlLiteral(value: string): string {
  return value.replaceAll("'", "''")
}

export function createAgentAdminKeyRecord(options: {
  scopes: readonly string[]
  expiresInDays: number | null
  name: string
  now?: Date
  id?: string
  rawKey?: string
}): AgentAdminKeyRecord {
  const now = options.now ?? new Date()
  const rawKey = options.rawKey ?? `nk_${randomBytes(32).toString('hex')}`
  const scopes = normalizeScopes(options.scopes)

  return {
    id: options.id ?? randomUUID(),
    rawKey,
    keyHash: createHash('sha256').update(rawKey).digest('hex'),
    keyPrefix: rawKey.slice(0, 11),
    scopes,
    scopesJson: JSON.stringify(scopes),
    createdAt: now.toISOString(),
    expiresAt: resolveExpiryTimestamp(options.expiresInDays, now),
  }
}

export function buildInsertApiKeyStatement(options: {
  record: AgentAdminKeyRecord
  userId: string
  name: string
}): string {
  const { record, userId, name } = options
  const expiresAt = record.expiresAt === null ? 'NULL' : String(record.expiresAt)

  return `
INSERT INTO api_keys (
  id,
  user_id,
  name,
  key_hash,
  key_prefix,
  scopes_json,
  expires_at,
  created_at
)
VALUES (
  '${escapeSqlLiteral(record.id)}',
  '${escapeSqlLiteral(userId)}',
  '${escapeSqlLiteral(name)}',
  '${escapeSqlLiteral(record.keyHash)}',
  '${escapeSqlLiteral(record.keyPrefix)}',
  '${escapeSqlLiteral(record.scopesJson)}',
  ${expiresAt},
  '${escapeSqlLiteral(record.createdAt)}'
);
`.trim()
}

export function buildDeleteApiKeyStatement(recordId: string): string {
  return `DELETE FROM api_keys WHERE id = '${escapeSqlLiteral(recordId)}';`
}

export function readWranglerDatabaseName(
  appDir: string,
  environment: string | null = null,
): string {
  const wranglerPath = resolve(appDir, 'wrangler.json')
  if (!existsSync(wranglerPath)) {
    throw new Error(`Could not find wrangler.json at ${wranglerPath}`)
  }

  const parsed = JSON.parse(readFileSync(wranglerPath, 'utf8')) as WranglerDatabaseConfig
  const config = environment ? parsed.env?.[environment] : parsed
  const databaseName = config?.d1_databases?.[0]?.database_name?.trim()
  if (!databaseName) {
    const configPath = environment
      ? `env.${environment}.d1_databases[0].database_name`
      : 'd1_databases[0].database_name'
    throw new Error(`Could not resolve ${configPath} from ${wranglerPath}`)
  }

  return databaseName
}

function execWranglerJson<Row>(
  appDir: string,
  databaseName: string,
  sql: string,
  remote: boolean,
  environment: string | null,
): D1ExecuteResponse<Row>[] {
  const args = ['exec', 'wrangler', 'd1', 'execute', databaseName]
  if (environment) {
    args.push('--env', environment)
  }
  args.push(remote ? '--remote' : '--local')
  args.push('--json', '--command', sql)

  const stdout = execFileSync('pnpm', args, {
    cwd: appDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  return JSON.parse(stdout) as D1ExecuteResponse<Row>[]
}

function resolveAdminUser(
  appDir: string,
  databaseName: string,
  options: MintAgentAdminKeyCliOptions,
) {
  if (options.userId) {
    const query = `
SELECT id, email
FROM users
WHERE id = '${escapeSqlLiteral(options.userId)}'
  AND is_admin = 1
LIMIT 1;
`.trim()
    const response = execWranglerJson<AdminUserRow>(
      appDir,
      databaseName,
      query,
      options.remote,
      options.environment,
    )[0]
    const user = response?.results?.[0]
    if (!user) {
      throw new Error(`No admin user found for --user-id ${options.userId}`)
    }
    return user
  }

  if (options.adminEmail) {
    const normalizedEmail = options.adminEmail.toLowerCase()
    const query = `
SELECT id, email
FROM users
WHERE is_admin = 1
  AND lower(email) = '${escapeSqlLiteral(normalizedEmail)}'
LIMIT 1;
`.trim()
    const response = execWranglerJson<AdminUserRow>(
      appDir,
      databaseName,
      query,
      options.remote,
      options.environment,
    )[0]
    const user = response?.results?.[0]
    if (!user) {
      throw new Error(`No admin user found for --admin-email ${options.adminEmail}`)
    }
    return user
  }

  const query = `
SELECT id, email
FROM users
WHERE is_admin = 1
ORDER BY created_at ASC;
`.trim()
  const response = execWranglerJson<AdminUserRow>(
    appDir,
    databaseName,
    query,
    options.remote,
    options.environment,
  )[0]
  const users = response?.results ?? []
  if (users.length === 0) {
    throw new Error('No admin users found. Pass --admin-email/--user-id or seed an admin first.')
  }
  if (users.length > 1) {
    throw new Error(
      `Multiple admin users found. Re-run with --admin-email or --user-id. Candidates: ${users
        .map((user) => `${user.email} (${user.id})`)
        .join(', ')}`,
    )
  }

  return users[0]
}

async function verifyMintedKey(
  siteUrl: string,
  verifyPath: string,
  rawKey: string,
): Promise<{ status: number; body: string }> {
  const url = new URL(verifyPath, siteUrl)
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${rawKey}`,
      accept: 'application/json',
    },
  })
  const body = await response.text()
  if (!response.ok) {
    throw new Error(`Verification failed (${response.status}) for ${url}: ${body}`)
  }
  return { status: response.status, body }
}

function storeKeyInDoppler(options: {
  rawKey: string
  secretName: string
  dopplerProject: string
  dopplerConfig: string
}): void {
  execFileSync(
    'doppler',
    [
      'secrets',
      'set',
      `${options.secretName}=${options.rawKey}`,
      '--project',
      options.dopplerProject,
      '--config',
      options.dopplerConfig,
    ],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
}

function parseCliArgs(argv: readonly string[]): ParsedCliArgs {
  const booleans = new Set<string>()
  const values = new Map<string, string[]>()

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!arg.startsWith('-')) {
      throw new Error(`Unexpected argument: ${arg}`)
    }

    const equalsIndex = arg.indexOf('=')
    const rawFlag = equalsIndex === -1 ? arg : arg.slice(0, equalsIndex)
    const flag = VALUE_FLAG_ALIASES.get(rawFlag) ?? rawFlag
    const inlineValue = equalsIndex === -1 ? null : arg.slice(equalsIndex + 1)

    if (BOOLEAN_FLAGS.has(flag)) {
      if (inlineValue !== null) {
        throw new Error(`${rawFlag} does not accept a value`)
      }
      booleans.add(flag)
      continue
    }

    if (!VALUE_FLAGS.has(rawFlag)) {
      throw new Error(`Unknown flag: ${rawFlag}`)
    }

    const value =
      inlineValue !== null
        ? inlineValue
        : argv[index + 1] && !argv[index + 1].startsWith('--')
          ? argv[++index]
          : null

    if (!value) {
      throw new Error(`Missing value for ${rawFlag}`)
    }

    const bucket = values.get(flag)
    if (bucket) {
      bucket.push(value)
    } else {
      values.set(flag, [value])
    }
  }

  return { booleans, values }
}

function getCliArgValue(parsed: ParsedCliArgs, flag: string): string | null {
  const values = parsed.values.get(flag)
  return values?.[values.length - 1] ?? null
}

function getCliArgValues(parsed: ParsedCliArgs, flag: string): string[] {
  return parsed.values.get(flag) ?? []
}

export function parseMintAgentAdminKeyArgs(argv: readonly string[]): MintAgentAdminKeyCliOptions {
  const parsed = parseCliArgs(argv)
  const rawExpiresInDays = getCliArgValue(parsed, '--expires-in-days')
  const rawScopes = normalizeScopes([
    ...getCliArgValues(parsed, '--scope'),
    ...getCliArgValues(parsed, '--scopes'),
  ])

  const expiresInDays =
    rawExpiresInDays === null
      ? DEFAULT_EXPIRES_IN_DAYS
      : rawExpiresInDays === 'none'
        ? null
        : Number.parseInt(rawExpiresInDays, 10)

  if (rawExpiresInDays !== null && rawExpiresInDays !== 'none' && !Number.isFinite(expiresInDays)) {
    throw new Error(`Invalid --expires-in-days value: ${rawExpiresInDays}`)
  }

  if (typeof expiresInDays === 'number' && expiresInDays <= 0) {
    throw new Error('--expires-in-days must be a positive integer or "none"')
  }

  const dopplerProject = getCliArgValue(parsed, '--doppler-project')
  const dopplerConfig = getCliArgValue(parsed, '--doppler-config')
  if ((dopplerProject && !dopplerConfig) || (!dopplerProject && dopplerConfig)) {
    throw new Error('--doppler-project and --doppler-config must be provided together')
  }

  return {
    appDir: resolve(process.cwd(), getCliArgValue(parsed, '--app-dir') ?? DEFAULT_APP_DIR),
    remote: parsed.booleans.has('--remote'),
    environment: getCliArgValue(parsed, '--environment'),
    adminEmail: getCliArgValue(parsed, '--admin-email'),
    userId: getCliArgValue(parsed, '--user-id'),
    scopes: rawScopes,
    expiresInDays,
    name: getCliArgValue(parsed, '--name') ?? 'agents-admin',
    siteUrl: getCliArgValue(parsed, '--site-url'),
    verifyPath: getCliArgValue(parsed, '--verify-path') ?? DEFAULT_VERIFY_PATH,
    dopplerProject,
    dopplerConfig,
    secretName: getCliArgValue(parsed, '--secret-name') ?? DEFAULT_SECRET_NAME,
    showRawKey: parsed.booleans.has('--show-raw-key'),
  }
}

export async function mintAgentAdminKey(options: MintAgentAdminKeyCliOptions): Promise<{
  appDir: string
  databaseName: string
  adminUser: AdminUserRow
  record: AgentAdminKeyRecord
  storedInDoppler: boolean
  verification: { status: number; body: string } | null
}> {
  const databaseName = readWranglerDatabaseName(options.appDir, options.environment)
  const adminUser = resolveAdminUser(options.appDir, databaseName, options)
  const record = createAgentAdminKeyRecord({
    scopes: options.scopes,
    expiresInDays: options.expiresInDays,
    name: options.name,
  })

  const insertSql = buildInsertApiKeyStatement({
    record,
    userId: adminUser.id,
    name: options.name,
  })
  execWranglerJson(options.appDir, databaseName, insertSql, options.remote, options.environment)

  let verification: { status: number; body: string } | null = null
  const storedInDoppler = Boolean(options.dopplerProject && options.dopplerConfig)
  try {
    if (options.siteUrl) {
      verification = await verifyMintedKey(options.siteUrl, options.verifyPath, record.rawKey)
    }

    if (storedInDoppler) {
      storeKeyInDoppler({
        rawKey: record.rawKey,
        secretName: options.secretName,
        dopplerProject: options.dopplerProject!,
        dopplerConfig: options.dopplerConfig!,
      })
    }
  } catch (error) {
    try {
      execWranglerJson(
        options.appDir,
        databaseName,
        buildDeleteApiKeyStatement(record.id),
        options.remote,
        options.environment,
      )
    } catch (rollbackError) {
      const message = error instanceof Error ? error.message : String(error)
      const rollbackMessage =
        rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
      throw new Error(`${message}. Rollback failed: ${rollbackMessage}`)
    }

    throw error
  }

  return {
    appDir: options.appDir,
    databaseName,
    adminUser,
    record,
    storedInDoppler,
    verification,
  }
}

function printUsage(): void {
  console.error(`Usage: pnpm exec tsx tools/mint-agent-admin-key.ts [options]

Options:
  --remote                       Write to the remote D1 database instead of local.
  --app-dir <path>               App directory containing wrangler.json (default: apps/web).
  --admin-email <email>          Admin user email to own the minted key.
  --user-id <id>                 Admin user id to own the minted key.
  --name <label>                 API key display name (default: agents-admin).
  --scope <scope>                Scope to grant. Repeat as needed.
  --scopes <csv>                 Comma-delimited scope list.
  --expires-in-days <days|none>  Expiry in days (default: 30).
  --environment <name>           Wrangler environment to target (for example: staging).
  --site-url <url>               Verify the minted key against the live app.
  --verify-path <path>           Verification path (default: /api/auth/me).
  --doppler-project <name>       Write the raw key into Doppler after minting.
  --doppler-config <name>        Doppler config for secret storage.
  --secret-name <name>           Doppler secret name (default: AGENT_ADMIN_API_KEY).
  --show-raw-key                 Print the raw key even when it is stored in Doppler.
`)
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    printUsage()
    return
  }

  const options = parseMintAgentAdminKeyArgs(args)
  const result = await mintAgentAdminKey(options)

  console.log(
    JSON.stringify(
      {
        adminUser: result.adminUser,
        appDir: result.appDir,
        databaseName: result.databaseName,
        rawKey: !result.storedInDoppler || options.showRawKey ? result.record.rawKey : null,
        keyPrefix: result.record.keyPrefix,
        scopes: result.record.scopes,
        expiresAt: result.record.expiresAt,
        storedInDoppler: result.storedInDoppler,
        verificationStatus: result.verification?.status ?? null,
      },
      null,
      2,
    ),
  )
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}

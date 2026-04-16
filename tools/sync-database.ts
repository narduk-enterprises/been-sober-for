import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ensureDir } from './sync-files'

function patchWebDatabaseSchema(
  appDir: string,
  dryRun: boolean,
  mode: 'full' | 'layer',
  log: (message: string) => void,
): boolean {
  if (mode !== 'full') return false

  const schemaPath = join(appDir, 'apps/web/server/database/schema.ts')
  if (!existsSync(schemaPath)) return false

  const content = readFileSync(schemaPath, 'utf-8')
  if (content.includes("export * from '#server/database/auth-bridge-schema'")) {
    return false
  }

  const bridgeExport = "export * from '#server/database/auth-bridge-schema'"
  let updated = content

  if (content.includes("export * from '#server/database/app-schema'")) {
    updated = content.replace(
      "export * from '#server/database/app-schema'",
      [bridgeExport, "export * from '#server/database/app-schema'"].join('\n'),
    )
  } else if (content.includes("export * from '#layer/server/database/schema'")) {
    updated = content.replace(
      "export * from '#layer/server/database/schema'",
      ["export * from '#layer/server/database/schema'", bridgeExport].join('\n'),
    )
  } else if (content.includes('export const ')) {
    updated = `${content.trimEnd()}\n\n${bridgeExport}\n`
  }

  if (updated === content) return false

  log('  UPDATE: apps/web/server/database/schema.ts')
  if (!dryRun) {
    writeFileSync(schemaPath, updated, 'utf-8')
  }
  return true
}

function patchWebAppOrmSchemaFiles(
  appDir: string,
  dryRun: boolean,
  mode: 'full' | 'layer',
  log: (message: string) => void,
): boolean {
  if (mode !== 'full') return false

  const schemaTargets = [
    {
      label: 'apps/web/server/database/app-schema.ts',
      path: join(appDir, 'apps/web/server/database/app-schema.ts'),
      bridgeExport: "export * from '#server/database/auth-bridge-schema'",
      defaultContent: [
        '/**',
        ' * D1/default app-owned schema bridge.',
        ' *',
        ' * Legacy downstream apps may still define product tables directly in',
        ' * schema.ts. Keep this bridge file present so #server/app-orm-tables',
        ' * resolves consistently for auth helpers and runtime queries.',
        ' */',
        "export * from '#server/database/auth-bridge-schema'",
        "export * from './schema'",
        '',
      ].join('\n'),
    },
    {
      label: 'apps/web/server/database/pg-app-schema.ts',
      path: join(appDir, 'apps/web/server/database/pg-app-schema.ts'),
      bridgeExport: "export * from '#server/database/auth-bridge-pg-schema'",
      defaultContent: [
        '/**',
        ' * PostgreSQL app-owned schema mirror.',
        ' */',
        "export * from '#server/database/auth-bridge-pg-schema'",
        '',
      ].join('\n'),
    },
  ]

  let changed = false

  for (const target of schemaTargets) {
    if (!existsSync(target.path)) {
      log(`  ADD: ${target.label}`)
      if (!dryRun) {
        ensureDir(target.path)
        writeFileSync(target.path, target.defaultContent, 'utf-8')
      }
      changed = true
      continue
    }

    const content = readFileSync(target.path, 'utf-8')
    if (content.includes(target.bridgeExport)) continue

    const lines = content.split('\n')
    let insertionIndex = 0
    let sawImport = false

    for (let index = 0; index < lines.length; index += 1) {
      const trimmed = lines[index].trim()
      if (trimmed.startsWith('import ')) {
        insertionIndex = index + 1
        sawImport = true
      } else if (sawImport && trimmed) {
        break
      }
    }

    const insertAt = sawImport ? insertionIndex : 0
    const updatedLines = [...lines]
    updatedLines.splice(
      insertAt,
      0,
      ...(sawImport ? ['', target.bridgeExport] : [target.bridgeExport, '']),
    )
    const updated = `${updatedLines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd()}\n`

    if (updated === content) continue

    log(`  UPDATE: ${target.label}`)
    if (!dryRun) {
      writeFileSync(target.path, updated, 'utf-8')
    }
    changed = true
  }

  return changed
}

/**
 * The starter auth bridge helper imports `useAppDatabase` from
 * `#server/utils/database`. Sync must not leave downstream apps without this
 * helper (see template issue #12).
 */
function ensureWebDatabaseUtils(
  appDir: string,
  dryRun: boolean,
  mode: 'full' | 'layer',
  log: (message: string) => void,
): boolean {
  if (mode !== 'full') return false

  const utilPath = join(appDir, 'apps/web/server/utils/database.ts')
  const authPaths = [
    join(appDir, 'apps/web/server/utils/starter-app-auth.ts'),
    join(appDir, 'apps/web/server/utils/app-auth.ts'),
  ]
  const authPath = authPaths.find((candidate) => existsSync(candidate))
  if (!authPath) return false

  const authContent = readFileSync(authPath, 'utf-8')
  if (!authContent.includes("from '#server/utils/database'")) return false

  const canonical = [
    "import * as d1Schema from '#server/database/schema'",
    "import * as pgSchema from '#server/database/pg-schema'",
    "import { createAppDatabase } from '#layer/server/utils/database'",
    '',
    '/** Cloudflare D1 maximum bound parameters per query. */',
    'export const D1_MAX_BOUND_PARAMETERS_PER_QUERY = 100',
    '',
    'export const useAppDatabase = createAppDatabase({',
    '  d1: d1Schema,',
    '  pg: pgSchema,',
    '})',
    '',
  ].join('\n')

  if (existsSync(utilPath)) {
    const existing = readFileSync(utilPath, 'utf-8')
    if (existing === canonical) {
      return false
    }

    if (
      existing.includes('useAppDatabase') &&
      existing.includes('createAppDatabase') &&
      (existing.includes("import * as schema from '#server/database/schema'") ||
        existing.includes("import * as d1Schema from '#server/database/schema'"))
    ) {
      log('  UPDATE: apps/web/server/utils/database.ts (backend-aware auth bridge helper)')
      if (!dryRun) {
        writeFileSync(utilPath, canonical, 'utf-8')
      }
      return true
    }

    log(
      '  WARN: apps/web/server/utils/database.ts exists but is not the managed auth bridge helper; fix manually so useAppDatabase wraps createAppDatabase({ d1, pg }).',
    )
    return false
  }

  log('  ADD: apps/web/server/utils/database.ts (auth bridge companion)')
  if (!dryRun) {
    ensureDir(utilPath)
    writeFileSync(utilPath, canonical, 'utf-8')
  }
  return true
}

export interface AuthBridgeCompanionPatchResult {
  schemaPatched: boolean
  databaseHelperCreated: boolean
}

export function applyAuthBridgeCompanionPatches(
  appDir: string,
  options: {
    dryRun?: boolean
    log?: (message: string) => void
  } = {},
): AuthBridgeCompanionPatchResult {
  const dryRun = options.dryRun ?? false
  const log = options.log ?? console.log
  const databaseSchemaPatched = patchWebDatabaseSchema(appDir, dryRun, 'full', log)
  const appOrmSchemaFilesPatched = patchWebAppOrmSchemaFiles(appDir, dryRun, 'full', log)

  return {
    schemaPatched: databaseSchemaPatched || appOrmSchemaFilesPatched,
    databaseHelperCreated: ensureWebDatabaseUtils(appDir, dryRun, 'full', log),
  }
}

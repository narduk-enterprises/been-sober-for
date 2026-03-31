import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { runCommand } from './command'
import {
  buildPackageRegistryLine,
  getPackageRegistryConfig,
  patchPackageRegistryNpmrcContent,
} from './package-registry'
import {
  AUTH_BRIDGE_SYNC_FILES,
  BOOTSTRAP_SYNC_FILES,
  FLEET_ROOT_SCRIPT_PATCHES,
  FLEET_WEB_SCRIPT_PATCHES,
  GENERATED_SYNC_FILES,
  REFERENCE_BASELINE_FILES,
  RECURSIVE_SYNC_DIRECTORIES,
  STALE_SYNC_PATHS,
  VERBATIM_SYNC_FILES,
  getCanonicalCiContent,
  isIgnoredManagedPath,
} from './sync-manifest'

export interface RunAppSyncOptions {
  appDir: string
  templateDir: string
  mode?: 'full' | 'layer'
  dryRun?: boolean
  strict?: boolean
  skipQuality?: boolean
  allowDirtyApp?: boolean
  allowDirtyTemplate?: boolean
  skipRewriteRepo?: boolean
  log?: (message: string) => void
}

interface SyncCounters {
  copied: number
  skipped: number
  removed: number
}

function createCounters(): SyncCounters {
  return { copied: 0, skipped: 0, removed: 0 }
}

function run(command: string, args: string[], cwd: string) {
  runCommand(command, args, {
    cwd,
    stdio: 'inherit',
  })
}

function getOutput(command: string, args: string[], cwd: string): string {
  try {
    return runCommand(command, args, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
  } catch {
    return ''
  }
}

/** NPM `repository.url` must be a remote, not a local path (file:, absolute paths, etc.). */
function isSafeRepositoryRemoteUrl(url: string): boolean {
  const t = url.trim()
  if (!t) return false
  const lower = t.toLowerCase()
  if (lower.startsWith('file:')) return false
  if (t.startsWith('/')) return false
  if (/^[a-z]:[/\\]/i.test(t)) return false
  if (t.startsWith('git@')) return true
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(t)
}

function getTrackedTemplatePaths(templateDir: string): Set<string> | null {
  try {
    const output = runCommand('git', ['ls-files', '-z'], {
      cwd: templateDir,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })

    return new Set(
      output
        .split('\0')
        .map((entry) => entry.trim())
        .filter(Boolean),
    )
  } catch {
    return null
  }
}

function ensureDir(filePath: string) {
  mkdirSync(dirname(filePath), { recursive: true })
}

function pathOccupied(filePath: string): boolean {
  try {
    lstatSync(filePath)
    return true
  } catch {
    return false
  }
}

function filesIdentical(left: string, right: string): boolean {
  try {
    return readFileSync(left).equals(readFileSync(right))
  } catch {
    return false
  }
}

function symlinkTargetsMatch(left: string, right: string): boolean {
  try {
    return lstatSync(left).isSymbolicLink() && lstatSync(right).isSymbolicLink()
      ? readlinkSync(left, 'utf8') === readlinkSync(right, 'utf8')
      : false
  } catch {
    return false
  }
}

function fileModesMatch(sourcePath: string, targetPath: string): boolean {
  try {
    return statSync(sourcePath).mode === statSync(targetPath).mode
  } catch {
    return false
  }
}

function syncFile(
  sourcePath: string,
  targetPath: string,
  templateDir: string,
  counters: SyncCounters,
  dryRun: boolean,
  log: (message: string) => void,
  label = relative(templateDir, sourcePath),
) {
  if (!existsSync(sourcePath)) return

  const srcLstat = lstatSync(sourcePath)
  if (srcLstat.isSymbolicLink()) {
    const wantTarget = readlinkSync(sourcePath, 'utf8')
    const occupied = pathOccupied(targetPath)

    if (occupied && symlinkTargetsMatch(sourcePath, targetPath)) {
      counters.skipped += 1
      return
    }

    const action = occupied ? 'UPDATE' : 'ADD'
    log(`  ${action}: ${label}`)

    if (!dryRun) {
      ensureDir(targetPath)
      if (occupied) {
        rmSync(targetPath, { recursive: true, force: true })
      }
      symlinkSync(wantTarget, targetPath)
    }

    counters.copied += 1
    return
  }

  if (
    existsSync(targetPath) &&
    filesIdentical(sourcePath, targetPath) &&
    fileModesMatch(sourcePath, targetPath)
  ) {
    counters.skipped += 1
    return
  }

  const action = existsSync(targetPath) ? 'UPDATE' : 'ADD'
  log(`  ${action}: ${label}`)

  if (!dryRun) {
    ensureDir(targetPath)
    copyFileSync(sourcePath, targetPath)
    chmodSync(targetPath, srcLstat.mode)
  }

  counters.copied += 1
}

function collectTrackedPathsForDirectory(relativeDir: string, trackedPaths: Set<string>): string[] {
  const prefix = `${relativeDir}/`

  return [...trackedPaths].filter((path) => path.startsWith(prefix)).sort()
}

function hasTrackedDescendant(relativePath: string, trackedPaths: Set<string>): boolean {
  const prefix = `${relativePath}/`
  for (const trackedPath of trackedPaths) {
    if (trackedPath.startsWith(prefix)) {
      return true
    }
  }
  return false
}

function syncTrackedDirectory(
  relativeDir: string,
  templateDir: string,
  appDir: string,
  trackedPaths: Set<string>,
  counters: SyncCounters,
  dryRun: boolean,
  log: (message: string) => void,
) {
  for (const relativePath of collectTrackedPathsForDirectory(relativeDir, trackedPaths)) {
    syncFile(
      join(templateDir, relativePath),
      join(appDir, relativePath),
      templateDir,
      counters,
      dryRun,
      log,
      relativePath,
    )
  }
}

function removeUntrackedDirectoryEntries(
  relativeDir: string,
  appDir: string,
  trackedPaths: Set<string>,
  counters: SyncCounters,
  dryRun: boolean,
  log: (message: string) => void,
) {
  const absoluteDir = join(appDir, relativeDir)
  if (!existsSync(absoluteDir)) return

  const visit = (fullPath: string, relativePath: string) => {
    if (isIgnoredManagedPath(fullPath)) return

    const entry = lstatSync(fullPath)
    if (entry.isDirectory()) {
      if (!hasTrackedDescendant(relativePath, trackedPaths)) {
        log(`  DELETE: ${relativePath}`)
        if (!dryRun) {
          rmSync(fullPath, { recursive: true, force: true })
        }
        counters.removed += 1
        return
      }

      for (const child of readdirSync(fullPath)) {
        visit(join(fullPath, child), join(relativePath, child))
      }
      return
    }

    if (trackedPaths.has(relativePath)) return

    log(`  DELETE: ${relativePath}`)
    if (!dryRun) {
      rmSync(fullPath, { recursive: true, force: true })
    }
    counters.removed += 1
  }

  for (const entry of readdirSync(absoluteDir)) {
    visit(join(absoluteDir, entry), join(relativeDir, entry))
  }
}

function syncDirectoryRecursive(
  sourceRoot: string,
  targetRoot: string,
  templateDir: string,
  counters: SyncCounters,
  dryRun: boolean,
  log: (message: string) => void,
) {
  if (!existsSync(sourceRoot) || isIgnoredManagedPath(sourceRoot)) return

  const stat = lstatSync(sourceRoot)

  if (stat.isSymbolicLink()) {
    const wantTarget = readlinkSync(sourceRoot, 'utf8')
    const occupied = pathOccupied(targetRoot)

    if (occupied && symlinkTargetsMatch(sourceRoot, targetRoot)) {
      counters.skipped += 1
      return
    }

    const action = occupied ? 'UPDATE' : 'ADD'
    log(`  ${action}: ${relative(templateDir, sourceRoot)}`)

    if (!dryRun) {
      ensureDir(targetRoot)
      if (occupied) {
        rmSync(targetRoot, { recursive: true, force: true })
      }
      symlinkSync(wantTarget, targetRoot)
    }

    counters.copied += 1
    return
  }

  if (stat.isDirectory()) {
    if (!existsSync(targetRoot) && !dryRun) {
      mkdirSync(targetRoot, { recursive: true })
    }

    for (const entry of readdirSync(sourceRoot)) {
      syncDirectoryRecursive(
        join(sourceRoot, entry),
        join(targetRoot, entry),
        templateDir,
        counters,
        dryRun,
        log,
      )
    }
    return
  }

  syncFile(sourceRoot, targetRoot, templateDir, counters, dryRun, log)
}

function writeTextFile(
  targetPath: string,
  content: string,
  counters: SyncCounters,
  dryRun: boolean,
  label: string,
  log: (message: string) => void,
) {
  const existing = existsSync(targetPath) ? readFileSync(targetPath, 'utf-8') : null
  if (existing === content) {
    counters.skipped += 1
    return
  }

  log(`  ${existing === null ? 'ADD' : 'UPDATE'}: ${label}`)
  if (!dryRun) {
    ensureDir(targetPath)
    writeFileSync(targetPath, content, 'utf-8')
  }
  counters.copied += 1
}

function patchJsonFile<T extends object>(
  filePath: string,
  mutate: (value: T) => boolean,
  dryRun: boolean,
): boolean {
  if (!existsSync(filePath)) return false

  const current = JSON.parse(readFileSync(filePath, 'utf-8')) as T
  const changed = mutate(current)
  if (!changed || dryRun) return changed

  writeFileSync(filePath, JSON.stringify(current, null, 2) + '\n', 'utf-8')
  return changed
}

function ensureTemplateState(
  templateDir: string,
  allowDirtyTemplate: boolean,
  dryRun: boolean,
  log: (message: string) => void,
) {
  if (dryRun || allowDirtyTemplate) return

  const status = getOutput('git', ['status', '--porcelain'], templateDir)
  if (status) {
    log('❌ Template repository has uncommitted changes.')
    log('   Commit or stash changes before syncing the fleet.')
    throw new Error('template repository is dirty')
  }
}

function ensureAppState(
  appDir: string,
  allowDirtyApp: boolean,
  dryRun: boolean,
  log: (message: string) => void,
) {
  if (dryRun || allowDirtyApp) return

  const status = getOutput('git', ['status', '--porcelain'], appDir)
  if (status) {
    log('❌ App repository has uncommitted changes.')
    log('   Commit or stash changes before syncing, or re-run with --allow-dirty-app.')
    throw new Error('app repository is dirty')
  }
}

function syncManagedFiles(
  templateDir: string,
  appDir: string,
  counters: SyncCounters,
  dryRun: boolean,
  mode: 'full' | 'layer',
  log: (message: string) => void,
) {
  const trackedPaths = getTrackedTemplatePaths(templateDir)

  if (mode === 'full') {
    log('Phase 1: Syncing managed template files...')
    for (const file of VERBATIM_SYNC_FILES) {
      if (trackedPaths && !trackedPaths.has(file) && !existsSync(join(templateDir, file))) continue
      syncFile(join(templateDir, file), join(appDir, file), templateDir, counters, dryRun, log)
    }
    for (const file of AUTH_BRIDGE_SYNC_FILES) {
      if (trackedPaths && !trackedPaths.has(file) && !existsSync(join(templateDir, file))) continue
      syncFile(join(templateDir, file), join(appDir, file), templateDir, counters, dryRun, log)
    }
    for (const file of REFERENCE_BASELINE_FILES) {
      if (trackedPaths && !trackedPaths.has(file) && !existsSync(join(templateDir, file))) continue
      syncFile(join(templateDir, file), join(appDir, file), templateDir, counters, dryRun, log)
    }
    for (const file of BOOTSTRAP_SYNC_FILES) {
      if (trackedPaths && !trackedPaths.has(file) && !existsSync(join(templateDir, file))) continue
      const targetPath = join(appDir, file)
      if (existsSync(targetPath)) continue
      syncFile(join(templateDir, file), targetPath, templateDir, counters, dryRun, log)
    }
  } else {
    log('Phase 1: Syncing vendored layer...')
  }

  const directories =
    mode === 'full' ? RECURSIVE_SYNC_DIRECTORIES : (['layers/narduk-nuxt-layer'] as const)
  for (const directory of directories) {
    if (trackedPaths) {
      syncTrackedDirectory(directory, templateDir, appDir, trackedPaths, counters, dryRun, log)
      removeUntrackedDirectoryEntries(directory, appDir, trackedPaths, counters, dryRun, log)
      continue
    }

    syncDirectoryRecursive(
      join(templateDir, directory),
      join(appDir, directory),
      templateDir,
      counters,
      dryRun,
      log,
    )
  }

  log(`  ${counters.copied} file(s) updated, ${counters.skipped} already current.`)
}

function syncGeneratedFiles(
  appDir: string,
  counters: SyncCounters,
  dryRun: boolean,
  mode: 'full' | 'layer',
  log: (message: string) => void,
) {
  if (mode !== 'full') return

  log('')
  log('Phase 2: Writing generated sync files...')

  for (const file of GENERATED_SYNC_FILES) {
    if (file === '.github/workflows/ci.yml') {
      writeTextFile(join(appDir, file), getCanonicalCiContent(), counters, dryRun, file, log)
    }
  }
}

function removeStalePaths(
  appDir: string,
  counters: SyncCounters,
  dryRun: boolean,
  mode: 'full' | 'layer',
  log: (message: string) => void,
) {
  if (mode !== 'full') return

  log('')
  log('Phase 3: Removing explicit stale paths...')

  let removedHere = 0
  for (const stalePath of STALE_SYNC_PATHS) {
    const absolutePath = join(appDir, stalePath)
    if (!existsSync(absolutePath)) continue

    log(`  DELETE: ${stalePath}`)
    if (!dryRun) {
      rmSync(absolutePath, { recursive: true, force: true })
    }
    removedHere += 1
  }

  counters.removed += removedHere
  if (removedHere === 0) {
    log('  No stale paths found.')
  }
}

function patchRootPackage(
  appDir: string,
  templateDir: string,
  dryRun: boolean,
  mode: 'full' | 'layer',
  log: (message: string) => void,
): boolean {
  const appPackagePath = join(appDir, 'package.json')
  if (!existsSync(appPackagePath)) return false

  const templatePackage = JSON.parse(readFileSync(join(templateDir, 'package.json'), 'utf-8')) as {
    packageManager?: string
    devDependencies?: Record<string, string>
    pnpm?: {
      overrides?: Record<string, string>
      peerDependencyRules?: Record<string, unknown>
      onlyBuiltDependencies?: string[]
    }
  }
  const expectedPackageName = basename(appDir)

  let touched = false
  patchJsonFile<Record<string, any>>(
    appPackagePath,
    (pkg) => {
      let changed = false

      if (mode === 'full') {
        if (pkg.name !== expectedPackageName) {
          pkg.name = expectedPackageName
          changed = true
        }

        pkg.scripts = pkg.scripts || {}
        for (const scriptName of [
          'dev:workspace',
          'dev:showcase',
          'dev:showcase:no-doppler',
          'dev:e2e',
          'db:ready:all',
          'build:showcase',
          'deploy:showcase',
          'test:e2e:showcase',
          'test:e2e:mapkit',
          'quality:fleet',
          'sync:fleet',
          'sync:fleet:fast',
          'sync:fleet:dry',
          'status:fleet',
          'ship:fleet',
          'migrate-to-org',
          'check:reach',
          'check:fleet-doppler',
          'validate:fleet',
          'backfill:packages-read',
          'tail:fleet',
          'fetch:fleet',
          'audit:fleet-themes',
          'audit:fleet-guardrails',
          'backfill:secrets',
          'predeploy',
          'tail',
        ]) {
          if (scriptName in pkg.scripts) {
            delete pkg.scripts[scriptName]
            changed = true
          }
        }

        for (const [name, command] of Object.entries(FLEET_ROOT_SCRIPT_PATCHES)) {
          if (pkg.scripts[name] !== command) {
            pkg.scripts[name] = command
            changed = true
          }
        }

        pkg.packageManager = templatePackage.packageManager || pkg.packageManager

        const requiredDevDependencies = ['tsx', 'turbo', 'prettier']
        pkg.devDependencies = pkg.devDependencies || {}
        for (const dependency of requiredDevDependencies) {
          const version = templatePackage.devDependencies?.[dependency]
          if (version && pkg.devDependencies[dependency] !== version) {
            pkg.devDependencies[dependency] = version
            changed = true
          }
        }
      }

      pkg.pnpm = pkg.pnpm || {}
      const templateOverrides = templatePackage.pnpm?.overrides || {}
      const templatePeerDependencyRules = templatePackage.pnpm?.peerDependencyRules || {}
      const templateOnlyBuiltDependencies = templatePackage.pnpm?.onlyBuiltDependencies || []

      if (JSON.stringify(pkg.pnpm.overrides) !== JSON.stringify(templateOverrides)) {
        pkg.pnpm.overrides = templateOverrides
        changed = true
      }

      if (
        JSON.stringify(pkg.pnpm.peerDependencyRules) !== JSON.stringify(templatePeerDependencyRules)
      ) {
        pkg.pnpm.peerDependencyRules = templatePeerDependencyRules
        changed = true
      }

      if (
        JSON.stringify(pkg.pnpm.onlyBuiltDependencies) !==
        JSON.stringify(templateOnlyBuiltDependencies)
      ) {
        pkg.pnpm.onlyBuiltDependencies = templateOnlyBuiltDependencies
        changed = true
      }

      touched ||= changed
      return changed
    },
    dryRun,
  )

  if (touched) {
    log(`  UPDATE: package.json${mode === 'layer' ? ' pnpm config' : ''}`)
  }

  return touched
}

function patchDopplerTemplate(
  appDir: string,
  dryRun: boolean,
  mode: 'full' | 'layer',
  log: (message: string) => void,
): boolean {
  if (mode !== 'full') return false

  const appPackagePath = join(appDir, 'package.json')
  const dopplerTemplatePath = join(appDir, 'doppler.template.yaml')
  if (!existsSync(appPackagePath) || !existsSync(dopplerTemplatePath)) return false

  const appPackage = JSON.parse(readFileSync(appPackagePath, 'utf-8')) as { name?: string }
  const appName = appPackage.name?.trim()
  if (!appName) return false

  const content = readFileSync(dopplerTemplatePath, 'utf-8')
  const updated = content.replace(/^(\s*project:\s*).+$/m, `$1${appName}`)
  if (updated === content) return false

  log('  UPDATE: doppler.template.yaml project')
  if (!dryRun) {
    writeFileSync(dopplerTemplatePath, updated, 'utf-8')
  }

  return true
}

/**
 * `apps/web/wrangler.json` is not copied verbatim (would wipe D1 ids, routes,
 * domains). When the layer expects Workers KV, merge a missing `KV` binding
 * from the template so `nitro-cloudflare-dev` matches new layer routes.
 */
function mergeWebWranglerKvBinding(
  appDir: string,
  templateDir: string,
  dryRun: boolean,
  mode: 'full' | 'layer',
  log: (message: string) => void,
): void {
  if (mode !== 'full') return

  const templatePath = join(templateDir, 'apps/web/wrangler.json')
  const appPath = join(appDir, 'apps/web/wrangler.json')
  if (!existsSync(templatePath) || !existsSync(appPath)) return

  const templateWrangler = JSON.parse(readFileSync(templatePath, 'utf-8')) as {
    kv_namespaces?: Array<{ binding?: string; id?: string; preview_id?: string }>
  }
  const templateKv = templateWrangler.kv_namespaces?.find((n) => n?.binding === 'KV')
  if (!templateKv) return

  const changed = patchJsonFile<Record<string, unknown>>(
    appPath,
    (w) => {
      const list = (w.kv_namespaces as Array<{ binding?: string }> | undefined) ?? []
      if (list.some((n) => n?.binding === 'KV')) {
        return false
      }
      w.kv_namespaces = [...list, JSON.parse(JSON.stringify(templateKv)) as Record<string, unknown>]
      return true
    },
    dryRun,
  )

  if (changed) {
    log('  UPDATE: apps/web/wrangler.json (merged KV binding from template)')
  }
}

function patchWebNuxtConfig(
  appDir: string,
  dryRun: boolean,
  mode: 'full' | 'layer',
  log: (message: string) => void,
): boolean {
  if (mode !== 'full') return false

  const nuxtConfigPath = join(appDir, 'apps/web/nuxt.config.ts')
  if (!existsSync(nuxtConfigPath)) return false

  let content = readFileSync(nuxtConfigPath, 'utf-8')
  const original = content

  if (!content.includes('function parseAuthProviders(value: string | undefined)')) {
    const anchor = '// https://nuxt.com/docs/api/configuration/nuxt-config'
    const exportDefaultAnchor = 'export default defineNuxtConfig({'
    const authSetupBlock = [
      'const appBackendPreset =',
      "  process.env.APP_BACKEND_PRESET === 'managed-supabase' ? 'managed-supabase' : 'default'",
      'const configuredAuthBackend = process.env.AUTH_BACKEND',
      "const supabaseUrl = process.env.AUTH_AUTHORITY_URL || process.env.SUPABASE_URL || ''",
      'const supabasePublishableKey =',
      '  process.env.SUPABASE_PUBLISHABLE_KEY ||',
      '  process.env.SUPABASE_ANON_KEY ||',
      '  process.env.SUPABASE_AUTH_ANON_KEY ||',
      "  ''",
      'const supabaseServiceRoleKey =',
      "  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_AUTH_SERVICE_ROLE_KEY || ''",
      'const authBackend =',
      "  configuredAuthBackend === 'supabase' || configuredAuthBackend === 'local'",
      '    ? configuredAuthBackend',
      '    : supabaseUrl && supabasePublishableKey',
      "      ? 'supabase'",
      "      : 'local'",
      'const authAuthorityUrl = supabaseUrl',
      'const appOrmTablesEntry =',
      "  process.env.NUXT_DATABASE_BACKEND === 'postgres'",
      "    ? './server/database/pg-app-schema.ts'",
      "    : './server/database/app-schema.ts'",
      '',
      'function parseAuthProviders(value: string | undefined) {',
      "  return (value || 'apple,email')",
      "    .split(',')",
      '    .map((provider) => provider.trim().toLowerCase())',
      '    .filter((provider, index, providers) => provider && providers.indexOf(provider) === index)',
      '}',
      '',
      'const authProviders =',
      "  authBackend === 'supabase' ? parseAuthProviders(process.env.AUTH_PROVIDERS) : ['email']",
      '',
    ].join('\n')

    if (content.includes(anchor)) {
      content = content.replace(anchor, `${authSetupBlock}${anchor}`)
    } else if (content.includes(exportDefaultAnchor)) {
      content = content.replace(exportDefaultAnchor, `${authSetupBlock}${exportDefaultAnchor}`)
    }
  }

  if (!content.includes("'#server/app-orm-tables'")) {
    content = content.replace(
      "  extends: ['@narduk-enterprises/narduk-nuxt-template-layer'],\n",
      [
        "  extends: ['@narduk-enterprises/narduk-nuxt-template-layer'],",
        '',
        '  alias: {',
        "    '#server/app-orm-tables': fileURLToPath(new URL(appOrmTablesEntry, import.meta.url)),",
        '  },',
      ].join('\n') + '\n',
    )
  }

  if (!content.includes('supabaseUrl,')) {
    content = content.replace(
      '  runtimeConfig: {\n',
      [
        '  runtimeConfig: {',
        '    appBackendPreset,',
        '    authBackend,',
        '    authAuthorityUrl,',
        '    authAnonKey: supabasePublishableKey,',
        '    authServiceRoleKey: supabaseServiceRoleKey,',
        "    authStorageKey: process.env.AUTH_STORAGE_KEY || 'web-auth',",
        "    turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY || '',",
        '    supabaseUrl,',
        '    supabasePublishableKey,',
        '    supabaseServiceRoleKey,',
      ].join('\n') + '\n',
    )
  }

  if (!content.includes('supabasePublishableKey,')) {
    content = content.replace(
      '    public: {\n',
      [
        '    public: {',
        '      appBackendPreset,',
        '      authBackend,',
        '      authAuthorityUrl,',
        "      authLoginPath: '/login',",
        "      authRegisterPath: '/register',",
        "      authCallbackPath: '/auth/callback',",
        "      authConfirmPath: '/auth/confirm',",
        "      authResetPath: '/reset-password',",
        "      authLogoutPath: '/logout',",
        "      authRedirectPath: '/dashboard/',",
        '      authProviders,',
        "      authPublicSignup: process.env.AUTH_PUBLIC_SIGNUP !== 'false',",
        "      authRequireMfa: process.env.AUTH_REQUIRE_MFA === 'true',",
        "      authTurnstileSiteKey: process.env.TURNSTILE_SITE_KEY || '',",
        '      supabaseUrl,',
        '      supabasePublishableKey,',
      ].join('\n') + '\n',
    )
  }

  if (content === original) return false

  log('  UPDATE: apps/web/nuxt.config.ts')
  if (!dryRun) {
    writeFileSync(nuxtConfigPath, content, 'utf-8')
  }
  return true
}

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

/**
 * `app-auth.ts` imports `useAppDatabase` from `#server/utils/database`. Sync
 * must not leave downstream apps without this helper (see template issue #12).
 */
function ensureWebDatabaseUtils(
  appDir: string,
  counters: SyncCounters,
  dryRun: boolean,
  mode: 'full' | 'layer',
  log: (message: string) => void,
): void {
  if (mode !== 'full') return

  const utilPath = join(appDir, 'apps/web/server/utils/database.ts')
  const authPath = join(appDir, 'apps/web/server/utils/app-auth.ts')
  if (!existsSync(authPath)) return

  const authContent = readFileSync(authPath, 'utf-8')
  if (!authContent.includes("from '#server/utils/database'")) return

  const canonical = [
    "import * as d1Schema from '#server/database/schema'",
    "import * as pgSchema from '#server/database/pg-schema'",
    "import { createAppDatabase } from '#layer/server/utils/database'",
    '',
    'export const useAppDatabase = createAppDatabase({',
    '  d1: d1Schema,',
    '  pg: pgSchema,',
    '})',
    '',
  ].join('\n')

  if (existsSync(utilPath)) {
    const existing = readFileSync(utilPath, 'utf-8')
    if (
      existing.includes('useAppDatabase') &&
      existing.includes('createAppDatabase') &&
      existing.includes("import * as pgSchema from '#server/database/pg-schema'")
    ) {
      return
    }

    if (
      existing.includes('useAppDatabase') &&
      existing.includes('createAppDatabase') &&
      existing.includes("import * as schema from '#server/database/schema'")
    ) {
      log('  UPDATE: apps/web/server/utils/database.ts (backend-aware auth bridge helper)')
      if (!dryRun) {
        writeFileSync(utilPath, canonical, 'utf-8')
      }
      return
    }

    log(
      '  WARN: apps/web/server/utils/database.ts exists but is not the managed auth bridge helper; fix manually so useAppDatabase wraps createAppDatabase({ d1, pg }).',
    )
    return
  }

  log('  ADD: apps/web/server/utils/database.ts (auth bridge companion)')
  if (!dryRun) {
    ensureDir(utilPath)
    writeFileSync(utilPath, canonical, 'utf-8')
  }
  counters.copied += 1
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
  const counters = createCounters()
  const dryRun = options.dryRun ?? false
  const log = options.log ?? console.log
  const schemaPatched = patchWebDatabaseSchema(appDir, dryRun, 'full', log)
  const copiedBefore = counters.copied
  ensureWebDatabaseUtils(appDir, counters, dryRun, 'full', log)

  return {
    schemaPatched,
    databaseHelperCreated: counters.copied > copiedBefore,
  }
}

function patchWebPackage(
  appDir: string,
  templateDir: string,
  dryRun: boolean,
  mode: 'full' | 'layer',
  log: (message: string) => void,
): boolean {
  const webPackagePath = join(appDir, 'apps/web/package.json')
  if (!existsSync(webPackagePath)) return false

  const templateWebPackage = JSON.parse(
    readFileSync(join(templateDir, 'apps/web/package.json'), 'utf-8'),
  ) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
  const drizzleConfigPath = join(appDir, 'apps/web/drizzle.config.ts')
  const drizzleConfig = existsSync(drizzleConfigPath)
    ? readFileSync(drizzleConfigPath, 'utf-8')
    : ''
  const usesPostgresDrizzle = /\bdialect:\s*['"]postgres(?:ql)?['"]/.test(drizzleConfig)

  let touched = false
  patchJsonFile<Record<string, any>>(
    webPackagePath,
    (pkg) => {
      let changed = false
      const usesPostgres =
        usesPostgresDrizzle || Boolean(pkg.dependencies?.postgres || pkg.devDependencies?.postgres)

      pkg.scripts = pkg.scripts || {}
      if (mode === 'full') {
        if (pkg.name !== 'web') {
          pkg.name = 'web'
          changed = true
        }
        for (const [name, command] of Object.entries(FLEET_WEB_SCRIPT_PATCHES)) {
          if (usesPostgres && name === 'dev') {
            continue
          }
          if (pkg.scripts[name] !== command) {
            pkg.scripts[name] = command
            changed = true
          }
        }
      }

      const wranglerPath = join(appDir, 'apps/web/wrangler.json')
      if (!usesPostgres && existsSync(wranglerPath)) {
        const wrangler = JSON.parse(readFileSync(wranglerPath, 'utf-8')) as {
          d1_databases?: Array<{ database_name?: string }>
        }
        const databaseName = wrangler.d1_databases?.[0]?.database_name
        if (databaseName) {
          const layerDrizzleDir =
            'node_modules/@narduk-enterprises/narduk-nuxt-template-layer/drizzle'
          const expectedMigrate = `bash ../../tools/db-migrate.sh ${databaseName} --local --dir ${layerDrizzleDir} --dir drizzle`
          const expectedSeed = `wrangler d1 execute ${databaseName} --local --file=node_modules/@narduk-enterprises/narduk-nuxt-template-layer/drizzle/seed.sql`
          const expectedReset = `bash ../../tools/db-migrate.sh ${databaseName} --local --dir ${layerDrizzleDir} --dir drizzle --reset && pnpm run db:seed`
          const expectedReady = 'pnpm run db:migrate && pnpm run db:seed'
          const expectedVerify =
            'node node_modules/@narduk-enterprises/narduk-nuxt-template-layer/testing/verify-local-db.mjs .'
          const expectedPredev = 'pnpm run db:ready'
          const expectedDev = '(doppler run -- nuxt dev || nuxt dev)'

          if (pkg.scripts['db:migrate'] !== expectedMigrate) {
            pkg.scripts['db:migrate'] = expectedMigrate
            changed = true
          }

          if (pkg.scripts['db:seed'] !== expectedSeed) {
            pkg.scripts['db:seed'] = expectedSeed
            changed = true
          }

          if (pkg.scripts['db:reset'] !== expectedReset) {
            pkg.scripts['db:reset'] = expectedReset
            changed = true
          }

          if (pkg.scripts['db:ready'] !== expectedReady) {
            pkg.scripts['db:ready'] = expectedReady
            changed = true
          }

          if (pkg.scripts['db:verify'] !== expectedVerify) {
            pkg.scripts['db:verify'] = expectedVerify
            changed = true
          }

          if (pkg.scripts['predev'] !== expectedPredev) {
            pkg.scripts['predev'] = expectedPredev
            changed = true
          }

          if (pkg.scripts['dev'] !== expectedDev) {
            pkg.scripts['dev'] = expectedDev
            changed = true
          }
        }
      }

      if (mode === 'full') {
        pkg.dependencies = pkg.dependencies || {}
        pkg.devDependencies = pkg.devDependencies || {}
        const eslintPkgPath = join(templateDir, 'packages/eslint-config/package.json')
        const templateEslintVersion =
          templateWebPackage.dependencies?.['@narduk-enterprises/eslint-config'] ??
          (existsSync(eslintPkgPath)
            ? (
                JSON.parse(readFileSync(eslintPkgPath, 'utf-8')) as {
                  dependencies?: Record<string, string>
                }
              ).dependencies?.['@narduk-enterprises/eslint-config']
            : undefined)
        const templateDevEslintVersion = templateWebPackage.devDependencies?.eslint
        if (pkg.dependencies['@narduk/eslint-config']) {
          delete pkg.dependencies['@narduk/eslint-config']
          changed = true
        }
        if (
          templateEslintVersion &&
          pkg.dependencies['@narduk-enterprises/eslint-config'] !== templateEslintVersion
        ) {
          pkg.dependencies['@narduk-enterprises/eslint-config'] = templateEslintVersion
          changed = true
        }
        if (templateDevEslintVersion && pkg.devDependencies.eslint !== templateDevEslintVersion) {
          pkg.devDependencies.eslint = templateDevEslintVersion
          changed = true
        }

        for (const dependency of ['@supabase/auth-js', '@supabase/supabase-js']) {
          const version = templateWebPackage.dependencies?.[dependency]
          if (version && pkg.dependencies[dependency] !== version) {
            pkg.dependencies[dependency] = version
            changed = true
          }
        }
      }

      touched ||= changed
      return changed
    },
    dryRun,
  )

  if (touched) {
    log('  UPDATE: apps/web/package.json')
  }

  return touched
}

function patchGitignore(appDir: string, dryRun: boolean, log: (message: string) => void): boolean {
  const gitignorePath = join(appDir, '.gitignore')
  if (!existsSync(gitignorePath)) return false

  let content = readFileSync(gitignorePath, 'utf-8')
  const original = content
  const requiredEntries = ['.env', '.env.*', '.dev.vars', 'doppler.yaml', 'doppler.json']

  if (!content.includes('.turbo')) {
    content = content.replace(/\.cache\n/, '.cache\n.turbo\n')
  }

  if (content.includes('tools/eslint-plugin-vue-official-best-practices')) {
    content = content.replace(/.*tools\/eslint-plugin-vue-official-best-practices.*\n?/g, '')
  }

  for (const entry of requiredEntries) {
    if (!content.includes(entry)) {
      if (!content.endsWith('\n')) {
        content += '\n'
      }
      content += `${entry}\n`
    }
  }

  if (content === original) return false

  log('  UPDATE: .gitignore')
  if (!dryRun) {
    writeFileSync(gitignorePath, content, 'utf-8')
  }
  return true
}

function ensureGitHooksPath(
  appDir: string,
  dryRun: boolean,
  log: (message: string) => void,
): boolean {
  if (!existsSync(join(appDir, '.githooks'))) return false

  const current = getOutput('git', ['config', '--get', 'core.hooksPath'], appDir)
  const normalized = current.replace(/\/+$/, '').replace(/^\.\//, '')
  if (normalized === '.githooks') return false

  log('  UPDATE: git core.hooksPath -> .githooks')
  if (!dryRun) {
    runCommand('git', ['config', 'core.hooksPath', '.githooks'], {
      cwd: appDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  }
  return true
}

function patchNpmrc(appDir: string, dryRun: boolean, log: (message: string) => void): boolean {
  const npmrcPath = join(appDir, '.npmrc')
  const registryConfig = getPackageRegistryConfig()
  const defaultContent = [buildPackageRegistryLine(registryConfig), ''].join('\n')

  if (!existsSync(npmrcPath)) {
    log('  ADD: .npmrc')
    if (!dryRun) {
      writeFileSync(npmrcPath, defaultContent, 'utf-8')
    }
    return true
  }

  const original = readFileSync(npmrcPath, 'utf-8')
  const content = patchPackageRegistryNpmrcContent(original)

  if (content === original) return false

  log('  UPDATE: .npmrc')
  if (!dryRun) {
    writeFileSync(npmrcPath, content, 'utf-8')
  }
  return true
}

function warnIfBootstrapArtifactsMissing(appDir: string, log: (message: string) => void): void {
  const missing: string[] = []
  if (!existsSync(join(appDir, '.setup-complete'))) {
    missing.push('.setup-complete')
  }
  if (!existsSync(join(appDir, 'doppler.yaml'))) {
    missing.push('doppler.yaml')
  }
  if (missing.length === 0) return

  log(`  WARN: bootstrap-managed files missing (${missing.join(', ')})`)
  log(
    '        Sync will not recreate provisioning artifacts; repair them via provisioning or an explicit ops flow.',
  )
}

function rewriteLayerRepository(
  appDir: string,
  dryRun: boolean,
  log: (message: string) => void,
): boolean {
  const layerPackagePath = join(appDir, 'layers/narduk-nuxt-layer/package.json')
  if (!existsSync(layerPackagePath)) return false

  const originUrl = getOutput('git', ['remote', 'get-url', 'origin'], appDir)
  if (!originUrl || !isSafeRepositoryRemoteUrl(originUrl)) {
    if (originUrl && !isSafeRepositoryRemoteUrl(originUrl)) {
      log(
        '  WARN: git origin is not a remote URL; skipping layers/narduk-nuxt-layer package.json repository rewrite',
      )
    }
    return false
  }

  let touched = false
  patchJsonFile<Record<string, any>>(
    layerPackagePath,
    (pkg) => {
      const nextRepository = {
        ...(pkg.repository || {}),
        type: 'git',
        url: originUrl,
        directory: 'layers/narduk-nuxt-layer',
      }

      if (JSON.stringify(pkg.repository) === JSON.stringify(nextRepository)) {
        return false
      }

      pkg.repository = nextRepository
      touched = true
      return true
    },
    dryRun,
  )

  if (touched) {
    log('  UPDATE: layers/narduk-nuxt-layer/package.json repository')
  }

  return touched
}

function writeTemplateVersion(
  appDir: string,
  templateSha: string,
  dryRun: boolean,
  log: (message: string) => void,
): boolean {
  const versionPath = join(appDir, '.template-version')
  const existing = existsSync(versionPath) ? readFileSync(versionPath, 'utf-8') : null
  const existingSha = existing?.match(/^sha=(.+)$/m)?.[1] || ''
  const existingTemplate = existing?.match(/^template=(.+)$/m)?.[1] || ''
  if (existingSha === templateSha && existingTemplate === 'narduk-nuxt-template') {
    return false
  }

  const content = [
    `sha=${templateSha}`,
    'template=narduk-nuxt-template',
    `synced=${new Date().toISOString()}`,
    '',
  ].join('\n')

  log(`  ${existing === null ? 'ADD' : 'UPDATE'}: .template-version (${templateSha.slice(0, 12)})`)
  if (!dryRun) {
    writeFileSync(versionPath, content, 'utf-8')
  }
  return true
}

function runInstallAndQuality(
  appDir: string,
  dryRun: boolean,
  skipQuality: boolean,
  log: (message: string) => void,
) {
  if (dryRun) {
    log('')
    log('Dry run complete. Skipping install and quality.')
    return
  }

  log('')
  log('Phase 5: Installing dependencies...')
  run('pnpm', ['install', '--no-frozen-lockfile'], appDir)

  if (skipQuality) {
    log('')
    log('Skipping quality gate (--skip-quality).')
    return
  }

  log('')
  log('Phase 6: Running quality gate...')
  run('pnpm', ['run', 'quality:check'], appDir)
}

export async function runAppSync(options: RunAppSyncOptions) {
  const mode = options.mode ?? 'full'
  const dryRun = options.dryRun ?? false
  const skipQuality = options.skipQuality ?? false
  const strict = options.strict ?? false
  const allowDirtyApp = options.allowDirtyApp ?? false
  const allowDirtyTemplate = options.allowDirtyTemplate ?? false
  const skipRewriteRepo = options.skipRewriteRepo ?? false
  const log = options.log ?? console.log
  const counters = createCounters()

  ensureTemplateState(options.templateDir, allowDirtyTemplate, dryRun, log)

  ensureAppState(options.appDir, allowDirtyApp, dryRun, log)
  const templateSha = getOutput('git', ['rev-parse', 'HEAD'], options.templateDir)

  log('')
  log(
    `${mode === 'full' ? 'Template Sync' : 'Layer Sync'}: ${options.appDir}${dryRun ? ' [DRY RUN]' : ''}`,
  )
  log('═══════════════════════════════════════════════════════════════')
  log(`  App:      ${options.appDir}`)
  log(`  Template: ${options.templateDir}`)
  if (templateSha) {
    log(`  SHA:      ${templateSha.slice(0, 12)}`)
  }
  log('')

  syncManagedFiles(options.templateDir, options.appDir, counters, dryRun, mode, log)
  syncGeneratedFiles(options.appDir, counters, dryRun, mode, log)
  removeStalePaths(options.appDir, counters, dryRun, mode, log)

  log('')
  log(
    `Phase 4: Applying ${mode === 'full' ? 'package and repo' : 'layer compatibility'} patches...`,
  )

  const packageTouched = patchRootPackage(options.appDir, options.templateDir, dryRun, mode, log)
  patchWebPackage(options.appDir, options.templateDir, dryRun, mode, log)
  patchWebNuxtConfig(options.appDir, dryRun, mode, log)
  if (mode === 'full') {
    const authBridgePatches = applyAuthBridgeCompanionPatches(options.appDir, { dryRun, log })
    if (authBridgePatches.databaseHelperCreated) {
      counters.copied += 1
    }
  }
  patchDopplerTemplate(options.appDir, dryRun, mode, log)
  mergeWebWranglerKvBinding(options.appDir, options.templateDir, dryRun, mode, log)
  if (mode === 'full') {
    patchGitignore(options.appDir, dryRun, log)
    patchNpmrc(options.appDir, dryRun, log)
    warnIfBootstrapArtifactsMissing(options.appDir, log)
    ensureGitHooksPath(options.appDir, dryRun, log)
  }

  // Record template HEAD for drift checks and fleet audit — must run for layer-only
  // sync too, otherwise check-drift-ci keeps comparing against a stale SHA.
  if (templateSha) {
    writeTemplateVersion(options.appDir, templateSha, dryRun, log)
  }

  if (!skipRewriteRepo) {
    rewriteLayerRepository(options.appDir, dryRun, log)
  }

  if (!packageTouched && mode === 'layer') {
    log('  Root pnpm config already current.')
  }

  runInstallAndQuality(options.appDir, dryRun, skipQuality, log)

  if (!dryRun && strict && mode === 'full') {
    log('')
    log('Phase 7: Verifying drift state...')
    run('pnpm', ['exec', 'tsx', 'tools/check-drift-ci.ts', '--strict'], options.appDir)
  }

  log('')
  log('═══════════════════════════════════════════════════════════════')
  if (dryRun) {
    log(' DRY RUN — no files were modified.')
    log(' Re-run without --dry-run to apply changes.')
  } else {
    log(' Sync complete.')
    log('')
    log(' Next steps:')
    log(`   cd ${options.appDir}`)
    log('   git status')
    log('   git diff')
    log('   git add -A && git commit -m "chore: sync with template"')
  }
}

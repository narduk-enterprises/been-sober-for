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
import { dirname, join, relative } from 'node:path'
import { runCommand, type CommandOptions } from './command'
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
  getGeneratedSyncFileContent,
  isIgnoredManagedPath,
  resolveGeneratedSyncContext,
} from './sync-manifest'
import {
  LAYER_BUNDLE_MANIFEST,
  listLayerBundleDefinitions,
  normalizeTemplateLayerSelection,
  resolveRequiredAppDependencies,
  resolveSelectedLayerDrizzlePackageNames,
  resolveSelectedLayerPackageNames,
  type TemplateLayerSelection,
} from './layer-bundle-manifest'
import {
  listBaseThemeDefinitions,
  normalizeBaseThemeSelection,
  type BaseThemeSelection,
} from './theme-manifest'
import {
  listAppTemplateDefinitions,
  normalizeAppTemplateSelection,
  type AppTemplateSelection,
} from './app-template-manifest'
import {
  resolveSelectedStarterPackageNames,
  resolveSelectedStarterRequiredAppDependencies,
  type StarterCompositionSelection,
} from './starter-composition'
import {
  resolveRepoAppTemplateSelection,
  resolveRepoBaseThemeSelection,
  resolveRepoTemplateLayerSelection,
} from './template-layer-selection'

export interface RunAppSyncOptions {
  appDir: string
  templateDir: string
  mode?: 'full' | 'layer'
  dryRun?: boolean
  strict?: boolean
  skipQuality?: boolean
  skipInstall?: boolean
  allowDirtyApp?: boolean
  allowDirtyTemplate?: boolean
  skipRewriteRepo?: boolean
  templateLayerSelection?: TemplateLayerSelection | null
  baseThemeSelection?: BaseThemeSelection | null
  appTemplateSelection?: AppTemplateSelection | null
  templateSha?: string | null
  quietChildCommands?: boolean
  log?: (message: string) => void
}

interface SyncCounters {
  copied: number
  patched: number
  skipped: number
  removed: number
}

function createCounters(): SyncCounters {
  return { copied: 0, patched: 0, skipped: 0, removed: 0 }
}

export interface RunAppSyncResult {
  changed: boolean
  copied: number
  patched: number
  removed: number
  skipped: number
}

const LEGACY_COMPAT_LAYER_DIRECTORY = 'layers/narduk-nuxt-layer'
const RECURSIVE_SOURCE_SKIP_DIRECTORIES = new Set([
  '.data',
  '.nitro',
  '.nuxt',
  '.output',
  '.turbo',
  '.wrangler',
  'node_modules',
])
const SILENT_CHILD_COMMAND_STDIO: CommandOptions['stdio'] = 'ignore'
let childCommandStdio: CommandOptions['stdio'] = 'inherit'

function resolveSyncTemplateLayerSelection(
  appDir: string,
  selection: TemplateLayerSelection | null | undefined,
): TemplateLayerSelection {
  if (selection) {
    return normalizeTemplateLayerSelection(selection)
  }

  return resolveRepoTemplateLayerSelection(appDir)
}

function resolveSyncBaseThemeSelection(
  appDir: string,
  selection: BaseThemeSelection | null | undefined,
): BaseThemeSelection {
  if (selection) {
    return normalizeBaseThemeSelection(selection)
  }

  return resolveRepoBaseThemeSelection(appDir)
}

function resolveSyncAppTemplateSelection(
  appDir: string,
  selection: AppTemplateSelection | null | undefined,
): AppTemplateSelection | null {
  if (selection !== undefined) {
    return normalizeAppTemplateSelection(selection)
  }

  return resolveRepoAppTemplateSelection(appDir)
}

function usesBundledLayers(selection: TemplateLayerSelection): boolean {
  return normalizeTemplateLayerSelection(selection).mode === 'bundled'
}

function resolveLayerDrizzleDirsForSelection(selection: TemplateLayerSelection): string[] {
  return resolveSelectedLayerDrizzlePackageNames(selection).map(
    (packageName) => `node_modules/${packageName}/drizzle`,
  )
}

function getSeedLayerPackageName(selection: TemplateLayerSelection): string {
  return resolveSelectedLayerPackageNames(normalizeTemplateLayerSelection(selection))[0] || ''
}

function buildExpectedExtendsLiteral(selection: StarterCompositionSelection): string {
  const packageNames = resolveSelectedStarterPackageNames(selection)
  if (packageNames.length === 0) {
    throw new Error(
      'resolveSelectedStarterPackageNames() must return at least one package for starter composition sync.',
    )
  }

  return [
    '  extends: [',
    ...packageNames.map((packageName) => `    '${packageName}',`),
    '  ],',
  ].join('\n')
}

function run(command: string, args: string[], cwd: string) {
  runCommand(command, args, {
    cwd,
    stdio: childCommandStdio,
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function walkFiles(rootDir: string, visitor: (filePath: string) => void) {
  if (!existsSync(rootDir)) return

  for (const entry of readdirSync(rootDir)) {
    if (RECURSIVE_SOURCE_SKIP_DIRECTORIES.has(entry)) {
      continue
    }

    const absolutePath = join(rootDir, entry)
    const stat = lstatSync(absolutePath)
    if (stat.isDirectory()) {
      walkFiles(absolutePath, visitor)
      continue
    }

    if (stat.isFile()) {
      visitor(absolutePath)
    }
  }
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
  const before = JSON.stringify(current, null, 2) + '\n'
  mutate(current)
  const after = JSON.stringify(current, null, 2) + '\n'
  const changed = before !== after
  if (!changed || dryRun) return changed

  writeFileSync(filePath, after, 'utf-8')
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
  templateLayerSelection: TemplateLayerSelection,
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
    log('Phase 1: Syncing managed layer files...')
  }

  const directories = mode === 'full' ? RECURSIVE_SYNC_DIRECTORIES : []
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
  const generatedContext = resolveGeneratedSyncContext(appDir)

  for (const file of GENERATED_SYNC_FILES) {
    const content = getGeneratedSyncFileContent(file, generatedContext)
    if (content !== null) {
      writeTextFile(join(appDir, file), content, counters, dryRun, file, log)
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
  const staleRootScripts = [
    'dev:workspace',
    'dev:showcase',
    'dev:e2e',
    'db:ready:all',
    'build:showcase',
    'deploy:showcase',
    'test:e2e:showcase',
    'test:e2e:ui',
    'test:e2e:mapkit',
    'ship',
    'quality:fleet',
    'sync:fleet',
    'sync:fleet:fast',
    'sync:fleet:dry',
    'status:fleet',
    'ship:fleet',
    'migrate-to-org',
    'check:reach',
    'validate:fleet',
    'backfill:packages-read',
    'tail:fleet',
    'fetch:fleet',
    'audit:fleet-themes',
    'audit:fleet-guardrails',
    'backfill:secrets',
    'predeploy',
    'tail',
    'sync:github-skills',
    'validate',
  ] as const
  const staleRootPackages = [
    '@narduk-enterprises/narduk-skills',
    'concurrently',
    'googleapis',
  ] as const

  const templatePackage = JSON.parse(readFileSync(join(templateDir, 'package.json'), 'utf-8')) as {
    packageManager?: string
    devDependencies?: Record<string, string>
    pnpm?: {
      overrides?: Record<string, string>
      peerDependencyRules?: Record<string, unknown>
      onlyBuiltDependencies?: string[]
      patchedDependencies?: Record<string, string>
    }
  }

  const touched = patchJsonFile<Record<string, any>>(
    appPackagePath,
    (pkg) => {
      let changed = false

      if (mode === 'full') {
        pkg.scripts = pkg.scripts || {}
        for (const scriptName of staleRootScripts) {
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

        pkg.devDependencies = pkg.devDependencies || {}
        for (const [dependency, version] of Object.entries(templatePackage.devDependencies || {})) {
          if (pkg.devDependencies[dependency] !== version) {
            pkg.devDependencies[dependency] = version
            changed = true
          }
        }

        for (const dependency of staleRootPackages) {
          if (pkg.dependencies && dependency in pkg.dependencies) {
            delete pkg.dependencies[dependency]
            changed = true
          }

          if (dependency in pkg.devDependencies) {
            delete pkg.devDependencies[dependency]
            changed = true
          }
        }
      }

      pkg.pnpm = pkg.pnpm || {}
      const templateOverrides = templatePackage.pnpm?.overrides || {}
      const templatePeerDependencyRules = templatePackage.pnpm?.peerDependencyRules || {}
      const templateOnlyBuiltDependencies = templatePackage.pnpm?.onlyBuiltDependencies || []
      const templatePatchedDependencies = templatePackage.pnpm?.patchedDependencies || {}

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

      if (
        JSON.stringify(pkg.pnpm.patchedDependencies) !== JSON.stringify(templatePatchedDependencies)
      ) {
        pkg.pnpm.patchedDependencies = templatePatchedDependencies
        changed = true
      }

      return changed
    },
    dryRun,
  )

  if (touched) {
    log(`  UPDATE: package.json${mode === 'layer' ? ' pnpm config' : ''}`)
  }

  return touched
}

/**
 * `apps/web/wrangler.json` is not copied verbatim (would wipe D1 ids, routes,
 * domains). When the template expects extra runtime bindings, merge them
 * without clobbering app-specific IDs and routes.
 */
function mergeWebWranglerKvBinding(
  appDir: string,
  templateDir: string,
  dryRun: boolean,
  mode: 'full' | 'layer',
  log: (message: string) => void,
): boolean {
  if (mode !== 'full') return false

  const templatePath = join(templateDir, 'apps/web/wrangler.json')
  const appPath = join(appDir, 'apps/web/wrangler.json')
  if (!existsSync(templatePath) || !existsSync(appPath)) return false

  const templateWrangler = JSON.parse(readFileSync(templatePath, 'utf-8')) as {
    kv_namespaces?: Array<{ binding?: string; id?: string; preview_id?: string }>
    r2_buckets?: Array<{ binding?: string; bucket_name?: string; preview_bucket_name?: string }>
    tail_consumers?: Array<{ service?: string; environment?: string }>
  }
  const templateKv = templateWrangler.kv_namespaces?.find((n) => n?.binding === 'KV')
  const templateBucket = templateWrangler.r2_buckets?.find((bucket) => bucket?.binding === 'BUCKET')
  const templateRuntimeLogsConsumer = templateWrangler.tail_consumers?.find(
    (consumer) => consumer?.service === 'platform-runtime-logs',
  )
  if (!templateKv && !templateBucket && !templateRuntimeLogsConsumer) return false

  const changed = patchJsonFile<Record<string, unknown>>(
    appPath,
    (w) => {
      let didChange = false

      if (templateKv) {
        const list = (w.kv_namespaces as Array<{ binding?: string }> | undefined) ?? []
        if (!list.some((n) => n?.binding === 'KV')) {
          w.kv_namespaces = [
            ...list,
            JSON.parse(JSON.stringify(templateKv)) as Record<string, unknown>,
          ]
          didChange = true
        }
      }

      if (templateBucket) {
        const buckets = (w.r2_buckets as Array<{ binding?: string }> | undefined) ?? []
        if (!buckets.some((bucket) => bucket?.binding === 'BUCKET')) {
          w.r2_buckets = [
            ...buckets,
            JSON.parse(JSON.stringify(templateBucket)) as Record<string, unknown>,
          ]
          didChange = true
        }
      }

      if (templateRuntimeLogsConsumer) {
        const consumers =
          (w.tail_consumers as Array<{ service?: string; environment?: string }> | undefined) ?? []
        if (!consumers.some((consumer) => consumer?.service === 'platform-runtime-logs')) {
          w.tail_consumers = [
            ...consumers,
            JSON.parse(JSON.stringify(templateRuntimeLogsConsumer)) as Record<string, unknown>,
          ]
          didChange = true
        }
      }

      return didChange
    },
    dryRun,
  )

  if (changed) {
    log('  UPDATE: apps/web/wrangler.json (merged runtime bindings from template)')
  }

  return changed
}

function patchWebNuxtConfig(
  appDir: string,
  dryRun: boolean,
  mode: 'full' | 'layer',
  templateLayerSelection: TemplateLayerSelection,
  baseThemeSelection: BaseThemeSelection,
  appTemplateSelection: AppTemplateSelection | null,
  log: (message: string) => void,
): boolean {
  if (mode !== 'full') return false

  const nuxtConfigPath = join(appDir, 'apps/web/nuxt.config.ts')
  if (!existsSync(nuxtConfigPath)) return false

  let content = readFileSync(nuxtConfigPath, 'utf-8')
  const original = content

  if (content.includes('fileURLToPath(') && !content.includes("from 'node:url'")) {
    const lines = content.split('\n')
    const firstImportIndex = lines.findIndex((line) => line.startsWith('import '))
    const importLine = "import { fileURLToPath } from 'node:url'"

    if (firstImportIndex >= 0) {
      lines.splice(firstImportIndex, 0, importLine)
    } else {
      let insertAt = 0
      while (insertAt < lines.length && lines[insertAt].startsWith('//')) {
        insertAt += 1
      }
      lines.splice(insertAt, 0, importLine, '')
    }

    content = lines.join('\n')
  }

  if (!content.includes("from './auth-environment'")) {
    const provisionImportLine =
      "import { getProvisionDisplayName, readProvisionMetadata } from '../../tools/provision-metadata'"
    const authEnvironmentImportLine = "import { resolveAuthEnvironment } from './auth-environment'"

    if (content.includes(provisionImportLine)) {
      content = content.replace(
        provisionImportLine,
        `${provisionImportLine}\n${authEnvironmentImportLine}`,
      )
    } else if (content.includes('const __dirname =')) {
      content = content.replace(
        'const __dirname =',
        `${authEnvironmentImportLine}\n\nconst __dirname =`,
      )
    }
  }

  const authEnvironmentBlock = [
    'const {',
    '  appBackendPreset,',
    '  authAuthorityUrl,',
    '  authBackend,',
    '  authProviders,',
    '  supabasePublishableKey,',
    '  supabaseServiceRoleKey,',
    '  supabaseUrl,',
    '} = resolveAuthEnvironment(process.env)',
    '',
  ].join('\n')
  const authPreludeStart = content.indexOf('const appBackendPreset =')
  const authPreludeEnd = content.indexOf('const appOrmTablesEntry =')

  if (authPreludeStart !== -1 && authPreludeEnd !== -1 && authPreludeStart < authPreludeEnd) {
    content = `${content.slice(0, authPreludeStart)}${authEnvironmentBlock}${content.slice(authPreludeEnd)}`
  } else if (!content.includes('resolveAuthEnvironment(process.env)')) {
    const authAnchor = 'const appOrmTablesEntry ='
    if (content.includes(authAnchor)) {
      content = content.replace(authAnchor, `${authEnvironmentBlock}${authAnchor}`)
    }
  }

  if (content.includes('resolveAuthEnvironment(process.env)')) {
    content = content.replace(
      /\nfunction parseAuthProviders\(value: string \| undefined\) \{[\s\S]*?\nconst authProviders =\n  authBackend === 'supabase' \? parseAuthProviders\(process\.env\.AUTH_PROVIDERS\) : \['email'\]\n/m,
      '\n',
    )
  }

  const needsLegacyAuthProviders =
    content.includes('authProviders') &&
    !content.includes('const authProviders =') &&
    !content.includes('resolveAuthEnvironment(process.env)')

  if (needsLegacyAuthProviders) {
    const legacyAuthProvidersBlock = [
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

    const authProvidersAnchor = 'const appOrmTablesEntry ='
    if (content.includes(authProvidersAnchor)) {
      content = content.replace(
        authProvidersAnchor,
        `${legacyAuthProvidersBlock}${authProvidersAnchor}`,
      )
    } else if (content.includes('export default defineNuxtConfig({')) {
      content = content.replace(
        'export default defineNuxtConfig({',
        `${legacyAuthProvidersBlock}export default defineNuxtConfig({`,
      )
    }
  }

  if (!content.includes('const appOrmTablesEntry =')) {
    const appOrmTablesBlock = [
      'const appOrmTablesEntry =',
      "  process.env.NUXT_DATABASE_BACKEND === 'postgres'",
      "    ? './server/database/pg-app-schema.ts'",
      "    : './server/database/app-schema.ts'",
      '',
    ].join('\n')

    const anchor = '// https://nuxt.com/docs/api/configuration/nuxt-config'
    const exportDefaultAnchor = 'export default defineNuxtConfig({'
    if (content.includes(anchor)) {
      content = content.replace(anchor, `${appOrmTablesBlock}${anchor}`)
    } else if (content.includes(exportDefaultAnchor)) {
      content = content.replace(exportDefaultAnchor, `${appOrmTablesBlock}${exportDefaultAnchor}`)
    }
  }

  content = content.replace(
    ': process.env.AUTH_AUTHORITY_URL && process.env.SUPABASE_AUTH_ANON_KEY',
    ': supabaseUrl && supabasePublishableKey',
  )
  content = content.replace(
    "const authAuthorityUrl = process.env.AUTH_AUTHORITY_URL || ''",
    'const authAuthorityUrl = supabaseUrl',
  )

  const expectedExtendsLiteral = buildExpectedExtendsLiteral({
    templateLayerSelection,
    baseThemeSelection,
    appTemplateSelection,
  })
  if (/^\s*extends:\s*\[[^\]]*\],/m.test(content)) {
    content = content.replace(/^\s*extends:\s*\[[^\]]*\],/m, expectedExtendsLiteral)
  } else {
    content = content.replace(
      'export default defineNuxtConfig({',
      `export default defineNuxtConfig({\n${expectedExtendsLiteral}`,
    )
  }

  if (!content.includes("'#server/app-orm-tables'")) {
    const aliasLine =
      "    '#server/app-orm-tables': fileURLToPath(new URL(appOrmTablesEntry, import.meta.url)),"
    if (/^  alias: \{\n/m.test(content)) {
      content = content.replace(/^  alias: \{\n/m, `  alias: {\n${aliasLine}\n`)
    } else {
      const aliasBlock = ['  alias: {', aliasLine, '  },', ''].join('\n')
      if (/^\s*extends:\s*\[[^\]]*\],\n/m.test(content)) {
        content = content.replace(
          /^\s*extends:\s*\[[^\]]*\],\n/m,
          (match) => `${match}\n${aliasBlock}`,
        )
      } else {
        content = content.replace(
          'export default defineNuxtConfig({',
          `export default defineNuxtConfig({\n${aliasBlock}`,
        )
      }
    }
  }

  const findPropertyLine = (body: string, prefixes: string[]): string | null => {
    const line = body.split('\n').find((candidate) => {
      const trimmed = candidate.trimStart()
      return prefixes.some((prefix) => trimmed.startsWith(prefix))
    })

    return line ? line.trim() : null
  }

  const buildPropertyLine = (
    body: string,
    prefixes: string[],
    fallback: string,
    indent: string,
  ): string => `${indent}${findPropertyLine(body, prefixes) ?? fallback}`

  const runtimeStart = content.indexOf('  runtimeConfig: {\n')
  const publicStart = content.indexOf('    public: {\n', runtimeStart)
  if (runtimeStart !== -1 && publicStart !== -1) {
    const runtimeBodyStart = runtimeStart + '  runtimeConfig: {\n'.length
    const runtimeBody = content.slice(runtimeBodyStart, publicStart)
    const runtimePrefixes = [
      'appBackendPreset,',
      'authBackend,',
      'authBackend:',
      'authAuthorityUrl,',
      'authAuthorityUrl:',
      'authAnonKey,',
      'authAnonKey:',
      'authServiceRoleKey,',
      'authServiceRoleKey:',
      'authStorageKey:',
      'turnstileSecretKey:',
      'supabaseUrl,',
      'supabaseUrl:',
      'supabasePublishableKey,',
      'supabasePublishableKey:',
      'supabaseServiceRoleKey,',
      'supabaseServiceRoleKey:',
    ]
    const normalizedRuntimeBody = runtimeBody
      .split('\n')
      .filter((line) => {
        const trimmed = line.trimStart()
        return !runtimePrefixes.some((prefix) => trimmed.startsWith(prefix))
      })
      .join('\n')
      .replace(/^\n+/, '')

    const runtimeAuthBlock = [
      buildPropertyLine(runtimeBody, ['appBackendPreset,'], 'appBackendPreset,', '    '),
      buildPropertyLine(runtimeBody, ['authBackend,', 'authBackend:'], 'authBackend,', '    '),
      buildPropertyLine(
        runtimeBody,
        ['authAuthorityUrl,', 'authAuthorityUrl:'],
        'authAuthorityUrl,',
        '    ',
      ),
      buildPropertyLine(
        runtimeBody,
        ['authAnonKey,', 'authAnonKey:'],
        'authAnonKey: supabasePublishableKey,',
        '    ',
      ),
      buildPropertyLine(
        runtimeBody,
        ['authServiceRoleKey,', 'authServiceRoleKey:'],
        'authServiceRoleKey: supabaseServiceRoleKey,',
        '    ',
      ),
      buildPropertyLine(
        runtimeBody,
        ['authStorageKey:'],
        "authStorageKey: process.env.AUTH_STORAGE_KEY || 'web-auth',",
        '    ',
      ),
      buildPropertyLine(
        runtimeBody,
        ['turnstileSecretKey:'],
        "turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY || '',",
        '    ',
      ),
      buildPropertyLine(runtimeBody, ['supabaseUrl,', 'supabaseUrl:'], 'supabaseUrl,', '    '),
      buildPropertyLine(
        runtimeBody,
        ['supabasePublishableKey,', 'supabasePublishableKey:'],
        'supabasePublishableKey,',
        '    ',
      ),
      buildPropertyLine(
        runtimeBody,
        ['supabaseServiceRoleKey,', 'supabaseServiceRoleKey:'],
        'supabaseServiceRoleKey,',
        '    ',
      ),
    ].join('\n')

    content =
      content.slice(0, runtimeBodyStart) +
      `${runtimeAuthBlock}\n${normalizedRuntimeBody}` +
      content.slice(publicStart)
  }

  const publicBlockStart = content.indexOf('    public: {\n')
  const publicBlockBodyStart = publicBlockStart + '    public: {\n'.length
  const publicBlockEnd =
    publicBlockStart === -1 ? -1 : content.indexOf('\n    },', publicBlockBodyStart)
  if (publicBlockStart !== -1 && publicBlockEnd !== -1) {
    const publicBody = content.slice(publicBlockBodyStart, publicBlockEnd)
    const publicPrefixes = [
      'appBackendPreset,',
      'authBackend,',
      'authBackend:',
      'authAuthorityUrl,',
      'authAuthorityUrl:',
      'authLoginPath:',
      'authRegisterPath:',
      'authCallbackPath:',
      'authConfirmPath:',
      'authResetPath:',
      'authLogoutPath:',
      'authRedirectPath:',
      'authProviders,',
      'authProviders:',
      'authEnforceCanonicalHost:',
      'authPublicSignup:',
      'authRequireMfa:',
      'authTurnstileSiteKey:',
      'supabaseUrl,',
      'supabaseUrl:',
      'supabasePublishableKey,',
      'supabasePublishableKey:',
    ]
    const normalizedPublicBody = publicBody
      .split('\n')
      .filter((line) => {
        const trimmed = line.trimStart()
        return !publicPrefixes.some((prefix) => trimmed.startsWith(prefix))
      })
      .join('\n')
      .replace(/^\n+/, '')

    const publicAuthBlock = [
      buildPropertyLine(publicBody, ['appBackendPreset,'], 'appBackendPreset,', '      '),
      buildPropertyLine(publicBody, ['authBackend,', 'authBackend:'], 'authBackend,', '      '),
      buildPropertyLine(
        publicBody,
        ['authAuthorityUrl,', 'authAuthorityUrl:'],
        'authAuthorityUrl,',
        '      ',
      ),
      buildPropertyLine(publicBody, ['authLoginPath:'], "authLoginPath: '/login',", '      '),
      buildPropertyLine(
        publicBody,
        ['authRegisterPath:'],
        "authRegisterPath: '/register',",
        '      ',
      ),
      buildPropertyLine(
        publicBody,
        ['authCallbackPath:'],
        "authCallbackPath: '/auth/callback',",
        '      ',
      ),
      buildPropertyLine(
        publicBody,
        ['authConfirmPath:'],
        "authConfirmPath: '/auth/confirm',",
        '      ',
      ),
      buildPropertyLine(
        publicBody,
        ['authResetPath:'],
        "authResetPath: '/reset-password',",
        '      ',
      ),
      buildPropertyLine(publicBody, ['authLogoutPath:'], "authLogoutPath: '/logout',", '      '),
      buildPropertyLine(
        publicBody,
        ['authRedirectPath:'],
        "authRedirectPath: '/dashboard/',",
        '      ',
      ),
      buildPropertyLine(
        publicBody,
        ['authProviders,', 'authProviders:'],
        'authProviders,',
        '      ',
      ),
      buildPropertyLine(
        publicBody,
        ['authEnforceCanonicalHost:'],
        "authEnforceCanonicalHost: process.env.AUTH_ENFORCE_CANONICAL_HOST === 'true',",
        '      ',
      ),
      buildPropertyLine(
        publicBody,
        ['authPublicSignup:'],
        "authPublicSignup: process.env.AUTH_PUBLIC_SIGNUP !== 'false',",
        '      ',
      ),
      buildPropertyLine(
        publicBody,
        ['authRequireMfa:'],
        "authRequireMfa: process.env.AUTH_REQUIRE_MFA === 'true',",
        '      ',
      ),
      buildPropertyLine(
        publicBody,
        ['authTurnstileSiteKey:'],
        "authTurnstileSiteKey: process.env.TURNSTILE_SITE_KEY || '',",
        '      ',
      ),
      buildPropertyLine(publicBody, ['supabaseUrl,', 'supabaseUrl:'], 'supabaseUrl,', '      '),
      buildPropertyLine(
        publicBody,
        ['supabasePublishableKey,', 'supabasePublishableKey:'],
        'supabasePublishableKey,',
        '      ',
      ),
    ].join('\n')

    content =
      content.slice(0, publicBlockBodyStart) +
      `${publicAuthBlock}\n${normalizedPublicBody}` +
      content.slice(publicBlockEnd)
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
      return
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
  const schemaPatched =
    patchWebDatabaseSchema(appDir, dryRun, 'full', log) ||
    patchWebAppOrmSchemaFiles(appDir, dryRun, 'full', log)
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
  templateLayerSelection: TemplateLayerSelection,
  baseThemeSelection: BaseThemeSelection,
  appTemplateSelection: AppTemplateSelection | null,
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
  const normalizedSelection = normalizeTemplateLayerSelection(templateLayerSelection)
  const selectedStarterPackages = resolveSelectedStarterPackageNames({
    templateLayerSelection: normalizedSelection,
    baseThemeSelection,
    appTemplateSelection,
  })
  const requiredAppDependencies = resolveSelectedStarterRequiredAppDependencies({
    templateLayerSelection: normalizedSelection,
    baseThemeSelection,
    appTemplateSelection,
  })
  const removableLayerPackages = [
    ...listLayerBundleDefinitions().map((bundle) => bundle.packageName),
    ...listBaseThemeDefinitions().map((theme) => theme.packageName),
    ...listAppTemplateDefinitions().map((appTemplate) => appTemplate.packageName),
  ]
  const removableAppDependencies = new Set([
    ...listLayerBundleDefinitions().flatMap((bundle) => bundle.requiredAppDependencies),
    ...listAppTemplateDefinitions().flatMap((appTemplate) => appTemplate.requiredAppDependencies),
  ])

  const touched = patchJsonFile<Record<string, any>>(
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
          const layerDrizzleDirs = resolveLayerDrizzleDirsForSelection(normalizedSelection)
          const seedPackageName = getSeedLayerPackageName(normalizedSelection)
          const expectedMigrate = [
            'bash ../../tools/db-migrate.sh',
            databaseName,
            '--local',
            ...layerDrizzleDirs.flatMap((dir) => ['--dir', dir]),
            '--dir drizzle',
          ].join(' ')
          const expectedSeed = `wrangler d1 execute ${databaseName} --local --file=node_modules/${seedPackageName}/drizzle/seed.sql`
          const expectedReset = `${expectedMigrate} --reset && pnpm run db:seed`
          const expectedReady = 'pnpm run db:migrate && pnpm run db:seed'
          const expectedVerify = `node node_modules/${seedPackageName}/testing/verify-local-db.mjs .`
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

        for (const dependency of removableLayerPackages) {
          if (dependency in pkg.dependencies) {
            delete pkg.dependencies[dependency]
            changed = true
          }
          if (dependency in pkg.devDependencies) {
            delete pkg.devDependencies[dependency]
            changed = true
          }
        }

        for (const packageName of selectedStarterPackages) {
          const expectedVersion =
            templateWebPackage.dependencies?.[packageName] ||
            templateWebPackage.devDependencies?.[packageName]
          if (!expectedVersion) {
            continue
          }
          if (pkg.dependencies[packageName] !== expectedVersion) {
            pkg.dependencies[packageName] = expectedVersion
            changed = true
          }
        }

        const templateEslintVersion =
          templateWebPackage.dependencies?.['@narduk-enterprises/eslint-config']
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

        for (const dependency of removableAppDependencies) {
          if (!requiredAppDependencies.includes(dependency) && dependency in pkg.dependencies) {
            delete pkg.dependencies[dependency]
            changed = true
          }
          if (!requiredAppDependencies.includes(dependency) && dependency in pkg.devDependencies) {
            delete pkg.devDependencies[dependency]
            changed = true
          }
        }

        for (const dependency of requiredAppDependencies) {
          const version = templateWebPackage.dependencies?.[dependency]
          if (version && pkg.dependencies[dependency] !== version) {
            pkg.dependencies[dependency] = version
            changed = true
          }
        }
      }

      return changed
    },
    dryRun,
  )

  if (touched) {
    log('  UPDATE: apps/web/package.json')
  }

  return touched
}

function patchProvisionSelections(
  appDir: string,
  dryRun: boolean,
  templateLayerSelection: TemplateLayerSelection,
  baseThemeSelection: BaseThemeSelection,
  appTemplateSelection: AppTemplateSelection | null,
  log: (message: string) => void,
): boolean {
  const provisionPath = join(appDir, 'provision.json')
  if (!existsSync(provisionPath)) return false

  const normalizedSelection = normalizeTemplateLayerSelection(templateLayerSelection)
  const normalizedBaseTheme = normalizeBaseThemeSelection(baseThemeSelection)
  const normalizedAppTemplate = normalizeAppTemplateSelection(appTemplateSelection)
  let touched = false
  patchJsonFile<Record<string, any>>(
    provisionPath,
    (provision) => {
      if (
        JSON.stringify(provision.templateLayer ?? null) === JSON.stringify(normalizedSelection) &&
        JSON.stringify(provision.baseTheme ?? null) === JSON.stringify(normalizedBaseTheme) &&
        JSON.stringify(provision.appTemplate ?? null) === JSON.stringify(normalizedAppTemplate)
      ) {
        return false
      }

      provision.templateLayer = normalizedSelection
      provision.baseTheme = normalizedBaseTheme
      provision.appTemplate = normalizedAppTemplate
      touched = true
      return true
    },
    dryRun,
  )

  if (touched) {
    log('  UPDATE: provision.json template selections')
  }

  return touched
}

function patchGitignore(appDir: string, dryRun: boolean, log: (message: string) => void): boolean {
  const gitignorePath = join(appDir, '.gitignore')
  if (!existsSync(gitignorePath)) return false

  let content = readFileSync(gitignorePath, 'utf-8')
  const original = content
  const requiredEntries = ['.env', '.env.*', '.dev.vars']

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
  const defaultContent = `${buildPackageRegistryLine(registryConfig)}\n`

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

function patchBundledLayerInternalImports(
  appDir: string,
  dryRun: boolean,
  templateLayerSelection: TemplateLayerSelection,
  log: (message: string) => void,
): boolean {
  if (!usesBundledLayers(templateLayerSelection)) {
    return false
  }

  const normalizedSelection = normalizeTemplateLayerSelection(templateLayerSelection)
  if (normalizedSelection.mode !== 'bundled') {
    return false
  }

  const replacements = new Map<string, string>()
  for (const bundleId of normalizedSelection.bundles) {
    switch (bundleId) {
      case 'analytics':
        replacements.set(
          '#layer/server/utils/google',
          `${LAYER_BUNDLE_MANIFEST.analytics.packageName}/server/utils/google`,
        )
        replacements.set(
          '#layer/server/utils/indexNow',
          `${LAYER_BUNDLE_MANIFEST.analytics.packageName}/server/utils/indexNow`,
        )
        break
      case 'ai':
        replacements.set(
          '#layer/server/utils/systemPrompts',
          `${LAYER_BUNDLE_MANIFEST.ai.packageName}/server/utils/systemPrompts`,
        )
        replacements.set(
          '#layer/server/utils/xai',
          `${LAYER_BUNDLE_MANIFEST.ai.packageName}/server/utils/xai`,
        )
        replacements.set(
          '#layer/app/utils/xaiModels',
          `${LAYER_BUNDLE_MANIFEST.ai.packageName}/app/utils/xaiModels`,
        )
        break
      case 'maps':
        replacements.set(
          '#layer/server/utils/apple-maps',
          `${LAYER_BUNDLE_MANIFEST.maps.packageName}/server/utils/apple-maps`,
        )
        replacements.set(
          '#layer/server/utils/appleMapToken',
          `${LAYER_BUNDLE_MANIFEST.maps.packageName}/server/utils/appleMapToken`,
        )
        break
      case 'uploads':
        replacements.set(
          '#layer/server/utils/r2',
          `${LAYER_BUNDLE_MANIFEST.uploads.packageName}/server/utils/r2`,
        )
        replacements.set(
          '#layer/server/utils/upload',
          `${LAYER_BUNDLE_MANIFEST.uploads.packageName}/server/utils/upload`,
        )
        break
      default:
        break
    }
  }

  if (replacements.size === 0) {
    return false
  }

  let touched = false
  walkFiles(join(appDir, 'apps/web'), (filePath) => {
    if (!/\.(?:ts|mts|js|mjs|vue)$/u.test(filePath)) {
      return
    }

    const original = readFileSync(filePath, 'utf-8')
    let updated = original

    for (const [legacySpecifier, packageSpecifier] of replacements) {
      const pattern = new RegExp(`(['"])${escapeRegExp(legacySpecifier)}\\1`, 'g')
      updated = updated.replace(pattern, (_match, quote: string) => {
        return `${quote}${packageSpecifier}${quote}`
      })
    }

    if (updated === original) {
      return
    }

    touched = true
    log(`  UPDATE: ${relative(appDir, filePath)}`)
    if (!dryRun) {
      writeFileSync(filePath, updated, 'utf-8')
    }
  })

  return touched
}

function warnIfBootstrapArtifactsMissing(appDir: string, log: (message: string) => void): void {
  const missing: string[] = []
  if (!existsSync(join(appDir, '.setup-complete'))) {
    missing.push('.setup-complete')
  }

  if (missing.length === 0) return

  log(`  WARN: bootstrap-managed files missing (${missing.join(', ')})`)
  log(
    '        Sync will not recreate provisioning artifacts; repair them via provisioning or an explicit ops flow.',
  )
}

function removeVendoredCompatLayer(
  appDir: string,
  counters: SyncCounters,
  dryRun: boolean,
  log: (message: string) => void,
): boolean {
  const compatLayerPath = join(appDir, LEGACY_COMPAT_LAYER_DIRECTORY)
  if (!existsSync(compatLayerPath)) {
    return false
  }

  log(`  DELETE: ${LEGACY_COMPAT_LAYER_DIRECTORY}`)
  if (!dryRun) {
    rmSync(compatLayerPath, { recursive: true, force: true })
  }
  counters.removed += 1
  return true
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
  if (
    existingSha === templateSha &&
    (existingTemplate === 'narduk-template' || existingTemplate === 'narduk-nuxt-template')
  ) {
    return false
  }

  const content = [
    `sha=${templateSha}`,
    'template=narduk-template',
    `synced=${new Date().toISOString()}`,
    '',
  ].join('\n')

  log(`  ${existing === null ? 'ADD' : 'UPDATE'}: .template-version (${templateSha.slice(0, 12)})`)
  if (!dryRun) {
    writeFileSync(versionPath, content, 'utf-8')
  }
  return true
}

function removeLegacyAuthApiComposableCasing(
  appDir: string,
  dryRun: boolean,
  counters: SyncCounters,
  log: (message: string) => void,
): boolean {
  const composablesDir = join(appDir, 'apps', 'web', 'app', 'composables')
  if (!existsSync(composablesDir)) {
    return false
  }

  const entries = readdirSync(composablesDir)
  if (!entries.includes('useAuthAPI.ts')) {
    return false
  }

  const legacyPath = join(composablesDir, 'useAuthAPI.ts')
  log('  DELETE: apps/web/app/composables/useAuthAPI.ts (legacy casing)')
  if (!dryRun) {
    rmSync(legacyPath, { force: true })
  }
  counters.removed += 1
  return true
}

function runInstallAndQuality(
  appDir: string,
  dryRun: boolean,
  skipInstall: boolean,
  skipQuality: boolean,
  log: (message: string) => void,
) {
  if (dryRun) {
    log('')
    log('Dry run complete. Skipping install and quality.')
    return
  }

  if (skipInstall) {
    log('')
    log('Skipping dependency install (--skip-install).')
  } else {
    log('')
    log('Phase 5: Installing dependencies...')
    run('pnpm', ['install', '--no-frozen-lockfile'], appDir)
  }

  log('')
  if (skipQuality) {
    log('Skipping quality gate (--skip-quality).')
    return
  }

  log('Phase 6: Running quality gate...')
  run('pnpm', ['run', 'quality:check'], appDir)
}

export async function runAppSync(options: RunAppSyncOptions): Promise<RunAppSyncResult> {
  const mode = options.mode ?? 'full'
  const dryRun = options.dryRun ?? false
  const skipInstall = options.skipInstall ?? false
  const skipQuality = options.skipQuality ?? false
  const strict = options.strict ?? false
  const allowDirtyApp = options.allowDirtyApp ?? false
  const allowDirtyTemplate = options.allowDirtyTemplate ?? false
  const quietChildCommands = options.quietChildCommands ?? false
  const log = options.log ?? console.log
  const counters = createCounters()
  const templateLayerSelection = resolveSyncTemplateLayerSelection(
    options.appDir,
    options.templateLayerSelection,
  )
  const baseThemeSelection = resolveSyncBaseThemeSelection(
    options.appDir,
    options.baseThemeSelection,
  )
  const appTemplateSelection = resolveSyncAppTemplateSelection(
    options.appDir,
    options.appTemplateSelection,
  )

  ensureTemplateState(options.templateDir, allowDirtyTemplate, dryRun, log)

  ensureAppState(options.appDir, allowDirtyApp, dryRun, log)
  const templateSha =
    options.templateSha ?? getOutput('git', ['rev-parse', 'HEAD'], options.templateDir)
  const previousChildCommandStdio = childCommandStdio
  childCommandStdio = quietChildCommands ? SILENT_CHILD_COMMAND_STDIO : 'inherit'

  try {
    log('')
    log(
      `${mode === 'full' ? 'Template Sync' : 'Layer Sync'}: ${options.appDir}${dryRun ? ' [DRY RUN]' : ''}`,
    )
    log('═══════════════════════════════════════════════════════════════')
    log(`  App:      ${options.appDir}`)
    log(`  Template: ${options.templateDir}`)
    log(`  Layers:   ${JSON.stringify(templateLayerSelection)}`)
    log(`  Theme:    ${JSON.stringify(baseThemeSelection)}`)
    log(`  App tpl:  ${JSON.stringify(appTemplateSelection)}`)
    if (templateSha) {
      log(`  SHA:      ${templateSha.slice(0, 12)}`)
    }
    log('')

    removeLegacyAuthApiComposableCasing(options.appDir, dryRun, counters, log)

    syncManagedFiles(
      options.templateDir,
      options.appDir,
      counters,
      dryRun,
      mode,
      templateLayerSelection,
      log,
    )
    syncGeneratedFiles(options.appDir, counters, dryRun, mode, log)
    removeStalePaths(options.appDir, counters, dryRun, mode, log)

    log('')
    log(
      `Phase 4: Applying ${mode === 'full' ? 'package and repo' : 'layer compatibility'} patches...`,
    )

    const packageTouched = patchRootPackage(options.appDir, options.templateDir, dryRun, mode, log)
    counters.patched += packageTouched ? 1 : 0
    const webPackagePatched = patchWebPackage(
      options.appDir,
      options.templateDir,
      dryRun,
      mode,
      templateLayerSelection,
      baseThemeSelection,
      appTemplateSelection,
      log,
    )
    counters.patched += webPackagePatched ? 1 : 0
    const nuxtConfigPatched = patchWebNuxtConfig(
      options.appDir,
      dryRun,
      mode,
      templateLayerSelection,
      baseThemeSelection,
      appTemplateSelection,
      log,
    )
    counters.patched += nuxtConfigPatched ? 1 : 0
    const internalImportsPatched = patchBundledLayerInternalImports(
      options.appDir,
      dryRun,
      templateLayerSelection,
      log,
    )
    counters.patched += internalImportsPatched ? 1 : 0
    const provisionPatched = patchProvisionSelections(
      options.appDir,
      dryRun,
      templateLayerSelection,
      baseThemeSelection,
      appTemplateSelection,
      log,
    )
    counters.patched += provisionPatched ? 1 : 0
    if (mode === 'full') {
      const authBridgePatches = applyAuthBridgeCompanionPatches(options.appDir, { dryRun, log })
      if (authBridgePatches.databaseHelperCreated) {
        counters.copied += 1
      }
      counters.patched += authBridgePatches.schemaPatched ? 1 : 0
    }

    const wranglerPatched = mergeWebWranglerKvBinding(
      options.appDir,
      options.templateDir,
      dryRun,
      mode,
      log,
    )
    counters.patched += wranglerPatched ? 1 : 0
    if (mode === 'full') {
      const gitignorePatched = patchGitignore(options.appDir, dryRun, log)
      counters.patched += gitignorePatched ? 1 : 0
      const npmrcPatched = patchNpmrc(options.appDir, dryRun, log)
      counters.patched += npmrcPatched ? 1 : 0
      warnIfBootstrapArtifactsMissing(options.appDir, log)
      const gitHooksPatched = ensureGitHooksPath(options.appDir, dryRun, log)
      counters.patched += gitHooksPatched ? 1 : 0
    }

    // Record template HEAD for drift checks and fleet audit — must run for layer-only
    // sync too, otherwise check-drift-ci keeps comparing against a stale SHA.
    if (templateSha) {
      const templateVersionWritten = writeTemplateVersion(options.appDir, templateSha, dryRun, log)
      counters.patched += templateVersionWritten ? 1 : 0
    }

    removeVendoredCompatLayer(options.appDir, counters, dryRun, log)

    if (!packageTouched && mode === 'layer') {
      log('  Root pnpm config already current.')
    }

    runInstallAndQuality(options.appDir, dryRun, skipInstall, skipQuality, log)

    if (!dryRun && strict && mode === 'full') {
      log('')
      log('Phase 7: Verifying drift state...')
      run('pnpm', ['exec', 'tsx', 'tools/check-drift-ci.ts', '--strict'], options.appDir)
    }

    log('')
    log('═══════════════════════════════════════════════════════════════')
    log(
      ` Summary: ${counters.copied} copied, ${counters.removed} removed, ${counters.patched} patched, ${counters.skipped} unchanged.`,
    )
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

    return {
      changed: counters.copied + counters.removed + counters.patched > 0,
      copied: counters.copied,
      patched: counters.patched,
      removed: counters.removed,
      skipped: counters.skipped,
    }
  } finally {
    childCommandStdio = previousChildCommandStdio
  }
}

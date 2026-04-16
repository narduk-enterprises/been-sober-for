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
import { runCommand } from './command'
import {
  AUTH_BRIDGE_SYNC_FILES,
  BOOTSTRAP_SYNC_FILES,
  GENERATED_SYNC_FILES,
  REFERENCE_BASELINE_FILES,
  RECURSIVE_SYNC_DIRECTORIES,
  SEEDED_APP_OWNED_FILES,
  STALE_SYNC_PATHS,
  VERBATIM_SYNC_FILES,
  assertValidSyncManifestOwnership,
  getGeneratedSyncFileContent,
  isIgnoredManagedPath,
  resolveGeneratedSyncContext,
} from './sync-manifest'
import type { TemplateLayerSelection } from './layer-bundle-manifest'

export interface SyncCounters {
  copied: number
  patched: number
  skipped: number
  removed: number
}

const RECURSIVE_SOURCE_SKIP_DIRECTORIES = new Set([
  '.data',
  '.nitro',
  '.nuxt',
  '.output',
  '.turbo',
  '.wrangler',
  'node_modules',
])

export function createCounters(): SyncCounters {
  return { copied: 0, patched: 0, skipped: 0, removed: 0 }
}

export function ensureDir(filePath: string) {
  mkdirSync(dirname(filePath), { recursive: true })
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function walkFiles(rootDir: string, visitor: (filePath: string) => void) {
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

export function patchJsonFile<T extends object>(
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

export function syncManagedFiles(
  templateDir: string,
  appDir: string,
  counters: SyncCounters,
  dryRun: boolean,
  mode: 'full' | 'layer',
  _templateLayerSelection: TemplateLayerSelection,
  log: (message: string) => void,
) {
  assertValidSyncManifestOwnership()
  const trackedPaths = getTrackedTemplatePaths(templateDir)

  const syncFileIfMissingFromTemplate = (relativePath: string) => {
    if (
      trackedPaths &&
      !trackedPaths.has(relativePath) &&
      !existsSync(join(templateDir, relativePath))
    ) {
      return
    }

    const targetPath = join(appDir, relativePath)
    if (existsSync(targetPath)) return
    syncFile(join(templateDir, relativePath), targetPath, templateDir, counters, dryRun, log)
  }

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
    for (const file of SEEDED_APP_OWNED_FILES) {
      syncFileIfMissingFromTemplate(file)
    }
    for (const file of REFERENCE_BASELINE_FILES) {
      if (trackedPaths && !trackedPaths.has(file) && !existsSync(join(templateDir, file))) continue
      syncFile(join(templateDir, file), join(appDir, file), templateDir, counters, dryRun, log)
    }
    for (const file of BOOTSTRAP_SYNC_FILES) {
      syncFileIfMissingFromTemplate(file)
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

export function syncGeneratedFiles(
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

export function removeStalePaths(
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

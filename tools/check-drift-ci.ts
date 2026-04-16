import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, readFileSync, readlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runCommand } from './command'
import {
  AUTH_BRIDGE_SYNC_FILES,
  BOOTSTRAP_SYNC_FILES,
  GENERATED_SYNC_FILES,
  RECURSIVE_SYNC_DIRECTORIES,
  REFERENCE_BASELINE_FILES,
  SEEDED_APP_OWNED_FILES,
  STALE_SYNC_PATHS,
  VERBATIM_SYNC_FILES,
  assertValidSyncManifestOwnership,
  getGeneratedSyncFileContent,
  normalizeManagedContent,
  resolveGeneratedSyncContext,
} from './sync-manifest'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')
const GIT_MAX_BUFFER = 64 * 1024 * 1024
const TEMPLATE_REMOTE_URL = 'https://github.com/narduk-enterprises/narduk-template.git'
const STARTER_REF_PREFIX = 'starters/default'
const AUTHORING_REPO_SLUGS = [
  'narduk-enterprises/narduk-template',
  'narduk-enterprises/narduk-nuxt-template',
] as const

const strict = process.argv.includes('--strict')

function run(command: string, args: string[]): string {
  try {
    return runCommand(command, args, {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
  } catch {
    return ''
  }
}

function isTemplateRepo(): boolean {
  const url = run('git', ['config', '--get', 'remote.origin.url'])
  return AUTHORING_REPO_SLUGS.some((slug) => url.includes(slug))
}

function getTemplateRef(): string {
  const versionPath = join(ROOT_DIR, '.template-version')
  if (!existsSync(versionPath)) return 'template/main'

  const content = readFileSync(versionPath, 'utf-8')
  const match = content.match(/^sha=(.+)$/m)
  return match?.[1] || 'template/main'
}

interface GitTreeEntry {
  path: string
  type: string
  oid: string
}

function listTreeEntriesAtRef(
  ref: string,
  paths: readonly string[],
  recursive = false,
): GitTreeEntry[] {
  if (paths.length === 0) return []

  try {
    const output = execFileSync(
      'git',
      ['ls-tree', ...(recursive ? ['-r'] : []), '-z', ref, '--', ...paths],
      {
        cwd: ROOT_DIR,
        maxBuffer: GIT_MAX_BUFFER,
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    )

    return output
      .toString('utf-8')
      .split('\0')
      .filter(Boolean)
      .map((line) => {
        const tabIndex = line.indexOf('\t')
        const meta = line.slice(0, tabIndex)
        const path = line.slice(tabIndex + 1)
        const [, type, oid] = meta.split(' ')
        return { path, type, oid }
      })
  } catch {
    return []
  }
}

function getStarterRefPath(relativePath: string): string {
  return `${STARTER_REF_PREFIX}/${relativePath}`
}

function getFileContentsAtRef(
  ref: string,
  refPathsByRelativePath: ReadonlyMap<string, string>,
): Map<string, string> {
  const refPaths = [...new Set(refPathsByRelativePath.values())]
  const entries = listTreeEntriesAtRef(ref, refPaths, false).filter(
    (entry) => entry.type === 'blob',
  )
  if (entries.length === 0) return new Map()

  const uniqueOids = [...new Set(entries.map((entry) => entry.oid))]
  const batchOutput = execFileSync('git', ['cat-file', '--batch'], {
    cwd: ROOT_DIR,
    input: `${uniqueOids.join('\n')}\n`,
    maxBuffer: GIT_MAX_BUFFER,
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  const contentsByOid = new Map<string, string>()
  let offset = 0

  for (const expectedOid of uniqueOids) {
    const headerEnd = batchOutput.indexOf(0x0a, offset)
    if (headerEnd === -1) break

    const header = batchOutput.subarray(offset, headerEnd).toString('utf-8')
    const [actualOid, type, sizeText] = header.split(' ')
    const size = Number(sizeText)
    const contentStart = headerEnd + 1
    const contentEnd = contentStart + size

    if (actualOid === expectedOid && type === 'blob' && Number.isFinite(size)) {
      contentsByOid.set(actualOid, batchOutput.subarray(contentStart, contentEnd).toString('utf-8'))
    }

    offset = contentEnd + 1
  }

  const contentsByRefPath = new Map<string, string>()
  for (const entry of entries) {
    const content = contentsByOid.get(entry.oid)
    if (content !== undefined) {
      contentsByRefPath.set(entry.path, content)
    }
  }

  const contentsByRelativePath = new Map<string, string>()
  for (const [relativePath, refPath] of refPathsByRelativePath.entries()) {
    const content = contentsByRefPath.get(refPath)
    if (content !== undefined) {
      contentsByRelativePath.set(relativePath, content)
    }
  }

  return contentsByRelativePath
}

function listFilesAtRef(ref: string, directory: string): string[] {
  return listTreeEntriesAtRef(ref, [directory], true)
    .filter((entry) => entry.type === 'blob')
    .map((entry) => entry.path)
}

function hasBlobAtRef(ref: string, relativePath: string): boolean {
  return listTreeEntriesAtRef(ref, [relativePath], false).some(
    (entry) => entry.path === relativePath && entry.type === 'blob',
  )
}

function getLocalFile(relativePath: string): string | null {
  const absolutePath = join(ROOT_DIR, relativePath)
  if (!existsSync(absolutePath)) return null

  const stat = lstatSync(absolutePath)
  if (stat.isSymbolicLink()) {
    return readlinkSync(absolutePath, 'utf-8')
  }
  if (stat.isDirectory()) {
    return null
  }

  return readFileSync(absolutePath, 'utf-8')
}

function buildTrackedFiles(ref: string): Map<string, string> {
  assertValidSyncManifestOwnership()
  const tracked = new Map<string, string>()

  for (const file of VERBATIM_SYNC_FILES) {
    const starterRefPath = getStarterRefPath(file)
    if (hasBlobAtRef(ref, starterRefPath)) {
      tracked.set(file, starterRefPath)
    }
  }

  for (const file of AUTH_BRIDGE_SYNC_FILES) {
    const starterRefPath = getStarterRefPath(file)
    if (hasBlobAtRef(ref, starterRefPath)) {
      tracked.set(file, starterRefPath)
    }
  }

  for (const file of REFERENCE_BASELINE_FILES) {
    const starterRefPath = getStarterRefPath(file)
    if (hasBlobAtRef(ref, starterRefPath)) {
      tracked.set(file, starterRefPath)
    }
  }

  for (const directory of RECURSIVE_SYNC_DIRECTORIES) {
    for (const file of listFilesAtRef(ref, getStarterRefPath(directory))) {
      tracked.set(file.slice(STARTER_REF_PREFIX.length + 1), file)
    }
  }

  for (const generatedFile of GENERATED_SYNC_FILES) {
    tracked.set(generatedFile, generatedFile)
  }

  // Seed-only files deliberately drift after the starter creates them.
  for (const file of SEEDED_APP_OWNED_FILES) {
    tracked.delete(file)
  }
  for (const file of BOOTSTRAP_SYNC_FILES) {
    tracked.delete(file)
  }

  return new Map([...tracked.entries()].sort(([left], [right]) => left.localeCompare(right)))
}

function getGeneratedFileContent(relativePath: string): string | null {
  return getGeneratedSyncFileContent(relativePath, resolveGeneratedSyncContext(ROOT_DIR))
}

function hasResolvableRef(ref: string): boolean {
  return Boolean(run('git', ['rev-parse', '--verify', `${ref}^{commit}`]))
}

function ensureTemplateRefAvailable(ref: string): boolean {
  if (hasResolvableRef(ref)) {
    return true
  }

  if (ref !== 'template/main') {
    run('git', ['fetch', 'template', ref, '--depth=1'])
  }

  return hasResolvableRef(ref)
}

async function main() {
  if (isTemplateRepo()) {
    console.log('This is the template repository itself — drift check not applicable.')
    process.exit(0)
  }

  const remotes = run('git', ['remote', '-v'])
  if (!remotes.includes('template')) {
    run('git', ['remote', 'add', 'template', TEMPLATE_REMOTE_URL])
  } else {
    run('git', ['remote', 'set-url', 'template', TEMPLATE_REMOTE_URL])
  }
  run('git', ['fetch', 'template', 'main', '--depth=1'])

  const ref = getTemplateRef()
  if (!ensureTemplateRefAvailable(ref)) {
    console.log('\nTemplate Drift Check')
    console.log('════════════════════════════════════════════════════')
    console.log(`  Comparing against: ${ref}`)
    console.log('')
    console.log(` ❌ Unable to resolve template ref ${ref} from ${TEMPLATE_REMOTE_URL}`)
    console.log('    Push the upstream template commit or resync from a reachable template ref.')
    console.log('')
    console.log('════════════════════════════════════════════════════')
    process.exit(1)
  }

  const trackedFiles = buildTrackedFiles(ref)
  const templateContents = getFileContentsAtRef(
    ref,
    new Map(
      [...trackedFiles.entries()].filter(
        ([relativePath]) => getGeneratedFileContent(relativePath) === null,
      ),
    ),
  )
  const matched: string[] = []
  const drifted: string[] = []
  const missing: string[] = []

  console.log('\nTemplate Drift Check')
  console.log('════════════════════════════════════════════════════')
  console.log(`  Comparing against: ${ref}`)
  console.log('')

  for (const relativePath of trackedFiles.keys()) {
    const templateContent =
      getGeneratedFileContent(relativePath) ?? templateContents.get(relativePath) ?? null
    if (templateContent === null) continue

    const localContent = getLocalFile(relativePath)
    if (localContent === null) {
      missing.push(relativePath)
      continue
    }

    if (
      normalizeManagedContent(relativePath, localContent) !==
      normalizeManagedContent(relativePath, templateContent)
    ) {
      drifted.push(relativePath)
      continue
    }

    matched.push(relativePath)
  }

  const stale = STALE_SYNC_PATHS.filter((relativePath) => existsSync(join(ROOT_DIR, relativePath)))

  if (matched.length > 0) {
    console.log(` ✅ Up to date (${matched.length})`)
    console.log('')
  }

  if (drifted.length > 0) {
    console.log(` ❌ DRIFTED (${drifted.length}):`)
    for (const file of drifted) console.log(`    ${file}`)
    console.log('')
    console.log('  Fix: run local-first sync from your template checkout:')
    console.log(`       pnpm sync-template ${ROOT_DIR}`)
    console.log('')
  }

  if (missing.length > 0) {
    console.log(` ⚠️  MISSING (${missing.length}):`)
    for (const file of missing) console.log(`    ${file}`)
    console.log('')
  }

  if (stale.length > 0) {
    console.log(` 🗑  STALE (${stale.length}):`)
    for (const file of stale) console.log(`    ${file}`)
    console.log('')
  }

  console.log('════════════════════════════════════════════════════')
  console.log(` Score: ${matched.length}/${trackedFiles.size} files match template`)

  if (drifted.length === 0 && missing.length === 0 && stale.length === 0) {
    console.log(' ✅ All infrastructure files are in sync!')
    process.exit(0)
  }

  console.log(` ❌ ${drifted.length} drifted, ${missing.length} missing, ${stale.length} stale`)
  if (strict) {
    console.log('\n  --strict mode: failing CI.')
    process.exit(1)
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
})

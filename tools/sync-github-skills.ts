#!/usr/bin/env -S pnpm exec tsx

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const DEFAULT_LOCAL_SKILLS_DIR = join(homedir(), '.agents', 'skills')
export const DEFAULT_REPO_SKILLS_DIR = resolve(__dirname, '..', '.github', 'skills')

const IGNORED_PATH_PARTS = new Set(['.DS_Store', '.git', '__pycache__', 'node_modules'])

export interface SyncGithubSkillsOptions {
  dryRun?: boolean
  log?: (line: string) => void
  sourceDir?: string
  targetDir?: string
}

export interface SyncGithubSkillsResult {
  copiedFiles: number
  dryRun: boolean
  removedFiles: number
  sourceDir: string
  targetDir: string
}

function expandHome(value: string): string {
  return value.replace(/^~/, homedir())
}

export function shouldIgnoreGithubSkillMirrorPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/')
  if (normalized === '') return false

  const parts = normalized.split('/')
  if (parts.some((part) => IGNORED_PATH_PARTS.has(part))) return true

  return normalized.endsWith('.pyc')
}

function listMirrorFiles(rootDir: string, currentDir = ''): string[] {
  const start = currentDir ? join(rootDir, currentDir) : rootDir
  if (!existsSync(start)) return []

  const files: string[] = []
  for (const entry of readdirSync(start, { withFileTypes: true })) {
    const relativePath = currentDir ? `${currentDir}/${entry.name}` : entry.name
    if (shouldIgnoreGithubSkillMirrorPath(relativePath)) continue

    if (entry.isDirectory()) {
      files.push(...listMirrorFiles(rootDir, relativePath))
      continue
    }

    if (entry.isFile() || entry.isSymbolicLink()) {
      files.push(relativePath)
    }
  }

  return files.sort((left, right) => left.localeCompare(right))
}

export function syncGithubSkills(options: SyncGithubSkillsOptions = {}): SyncGithubSkillsResult {
  const log = options.log ?? console.log
  const sourceDir = resolve(expandHome(options.sourceDir ?? DEFAULT_LOCAL_SKILLS_DIR))
  const targetDir = resolve(options.targetDir ?? DEFAULT_REPO_SKILLS_DIR)
  const dryRun = options.dryRun ?? false

  if (!existsSync(sourceDir) || !statSync(sourceDir).isDirectory()) {
    throw new Error(
      `GitHub skill mirror failed: source directory not found: ${sourceDir}. Expected a local ~/.agents/skills checkout or pass --source=/path/to/skills.`,
    )
  }

  if (sourceDir === targetDir) {
    throw new Error('GitHub skill mirror failed: source and target directories must differ.')
  }

  const sourceFiles = listMirrorFiles(sourceDir)
  const removedFiles = listMirrorFiles(targetDir).length

  if (dryRun) {
    log(`[dry-run] Would mirror ${sourceFiles.length} file(s) from ${sourceDir} to ${targetDir}`)
    return {
      copiedFiles: sourceFiles.length,
      dryRun,
      removedFiles,
      sourceDir,
      targetDir,
    }
  }

  rmSync(targetDir, { recursive: true, force: true })
  mkdirSync(dirname(targetDir), { recursive: true })
  cpSync(sourceDir, targetDir, {
    dereference: true,
    filter: (entryPath) => {
      const relativePath = relative(sourceDir, entryPath)
      return relativePath === '' || !shouldIgnoreGithubSkillMirrorPath(relativePath)
    },
    recursive: true,
  })

  log(`Mirrored ${sourceFiles.length} file(s) from ${sourceDir} to ${targetDir}`)

  return {
    copiedFiles: sourceFiles.length,
    dryRun,
    removedFiles,
    sourceDir,
    targetDir,
  }
}

function printUsage() {
  console.log(
    [
      'Usage: pnpm exec tsx tools/sync-github-skills.ts [options]',
      '',
      'Options:',
      '  --source=/path   Source local skills root (default: ~/.agents/skills)',
      '  --target=/path   Target repo mirror root (default: .github/skills)',
      '  --dry-run        Report what would change without mutating files',
    ].join('\n'),
  )
}

function parseArgs(argv: string[]) {
  let dryRun = false
  let sourceDir: string | undefined
  let targetDir: string | undefined

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true
      continue
    }

    if (arg === '--help' || arg === '-h') {
      printUsage()
      process.exit(0)
    }

    if (arg.startsWith('--source=')) {
      sourceDir = arg.slice('--source='.length)
      continue
    }

    if (arg.startsWith('--target=')) {
      targetDir = arg.slice('--target='.length)
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return { dryRun, sourceDir, targetDir }
}

const isDirectRun = process.argv[1]?.includes('sync-github-skills')

if (isDirectRun) {
  try {
    syncGithubSkills(parseArgs(process.argv.slice(2)))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

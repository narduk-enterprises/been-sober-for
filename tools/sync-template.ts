import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runCommand } from './command'
import {
  parseOptionalLayerBundleArgs,
  parseTemplateLayerSelectionJson,
  type TemplateLayerSelection,
} from './layer-bundle-manifest'
import {
  parseBaseThemeArg,
  parseBaseThemeSelectionJson,
  type BaseThemeSelection,
} from './theme-manifest'
import {
  parseAppTemplateArg,
  parseAppTemplateSelectionJson,
  type AppTemplateSelection,
} from './app-template-manifest'
import { runAppSync } from './sync-core'
import {
  resolveRepoAppTemplateSelection,
  resolveRepoBaseThemeSelection,
  resolveRepoTemplateLayerSelection,
} from './template-layer-selection'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')
const AUTHORING_REPO_SLUGS = [
  'narduk-enterprises/narduk-template',
  'narduk-enterprises/narduk-nuxt-template',
] as const
const AUTHORING_WORKSPACE_NAMES = new Set(['narduk-template', 'narduk-nuxt-template'])
const TEMPLATE_DIR_HINT_NAMES = ['narduk-template', 'narduk-nuxt-template'] as const
const TEMPLATE_DIR_HINT_PARENTS = ['code/platform-new', 'code', 'new-code'] as const
const GIT_ARCHIVE_MAX_BUFFER = 64 * 1024 * 1024
const SYNC_TEMPLATE_SELF_RERUN_ENV = 'NARDUK_SYNC_TEMPLATE_RERUN'
const LOCAL_SYNC_TOOLING_PATHS = [
  'tools/sync-template.ts',
  'tools/sync-core.ts',
  'tools/sync-files.ts',
  'tools/sync-root-package.ts',
  'tools/sync-web-package.ts',
  'tools/sync-nuxt-config.ts',
  'tools/sync-wrangler.ts',
  'tools/sync-database.ts',
  'tools/sync-manifest.ts',
  'tools/command.ts',
  'tools/package-registry.ts',
  'tools/layer-bundle-manifest.ts',
  'tools/theme-manifest.ts',
  'tools/app-template-manifest.ts',
  'tools/template-layer-selection.ts',
  'tools/starter-composition.ts',
  'tools/starter-manifest.ts',
  'tools/provision-metadata.ts',
] as const

export interface SyncTemplateReport {
  appDir: string
  templateDir: string
  templateRef: string | null
  templateSha: string
  templateLayerSelection: TemplateLayerSelection
  baseThemeSelection: BaseThemeSelection
  appTemplateSelection: AppTemplateSelection | null
  dryRun: boolean
  strict: boolean
  skipInstall: boolean
  skipQuality: boolean
  success: boolean
  changed: boolean
  copied: number
  patched: number
  removed: number
  skipped: number
  error: string | null
  logs: string[]
}

export interface ParsedSyncTemplateArgs {
  positionalArgs: string[]
  flags: Set<string>
  fromValue: string | undefined
  templateRef: string | undefined
  templateLayerSelection: TemplateLayerSelection | undefined
  baseThemeSelection: BaseThemeSelection | undefined
  appTemplateSelection: AppTemplateSelection | null | undefined
  jsonOutput: boolean
}

export type SyncToolingSnapshot = Record<string, string | null>

export function parseSyncTemplateArgs(
  rawArgs: string[],
  env: NodeJS.ProcessEnv = process.env,
): ParsedSyncTemplateArgs {
  const positionalArgs: string[] = []
  const flags = new Set<string>()
  let fromValue: string | undefined
  let templateRef = env.NARDUK_TEMPLATE_REF
  let templateLayerSelection: TemplateLayerSelection | undefined
  let baseThemeSelection: BaseThemeSelection | undefined
  let appTemplateSelection: AppTemplateSelection | null | undefined

  for (let index = 0; index < rawArgs.length; index += 1) {
    const argument = rawArgs[index]

    if (argument === '--from') {
      fromValue = rawArgs[index + 1]
      index += 1
      continue
    }

    if (argument.startsWith('--from=')) {
      fromValue = argument.slice('--from='.length)
      continue
    }

    if (argument === '--template-ref' || argument === '--ref') {
      templateRef = rawArgs[index + 1]
      index += 1
      continue
    }

    if (argument.startsWith('--template-ref=')) {
      templateRef = argument.slice('--template-ref='.length)
      continue
    }

    if (argument.startsWith('--ref=')) {
      templateRef = argument.slice('--ref='.length)
      continue
    }

    if (argument.startsWith('--template-layer-selection-json=')) {
      templateLayerSelection = parseTemplateLayerSelectionJson(
        argument.slice('--template-layer-selection-json='.length),
      )
      continue
    }

    if (argument.startsWith('--base-theme-selection-json=')) {
      baseThemeSelection = parseBaseThemeSelectionJson(
        argument.slice('--base-theme-selection-json='.length),
      )
      continue
    }

    if (argument.startsWith('--app-template-selection-json=')) {
      appTemplateSelection = parseAppTemplateSelectionJson(
        argument.slice('--app-template-selection-json='.length),
      )
      continue
    }

    if (argument === '--legacy-full') {
      throw new Error('legacy-full is no longer supported. Use bundled layer selections only.')
    }

    if (argument.startsWith('--bundles=')) {
      templateLayerSelection = parseOptionalLayerBundleArgs(argument.slice('--bundles='.length))
      continue
    }

    if (argument.startsWith('--theme=')) {
      baseThemeSelection = parseBaseThemeArg(argument.slice('--theme='.length))
      continue
    }

    if (argument.startsWith('--base-theme=')) {
      baseThemeSelection = parseBaseThemeArg(argument.slice('--base-theme='.length))
      continue
    }

    if (argument.startsWith('--app-template=')) {
      appTemplateSelection = parseAppTemplateArg(argument.slice('--app-template='.length))
      continue
    }

    if (argument.startsWith('--')) {
      flags.add(argument)
      continue
    }

    positionalArgs.push(argument)
  }

  return {
    positionalArgs,
    flags,
    fromValue,
    templateRef,
    templateLayerSelection,
    baseThemeSelection,
    appTemplateSelection,
    jsonOutput: flags.has('--json'),
  }
}

export function snapshotLocalSyncTooling(
  rootDir: string,
  paths: readonly string[] = LOCAL_SYNC_TOOLING_PATHS,
): SyncToolingSnapshot {
  return Object.fromEntries(
    paths.map((relativePath) => {
      const absolutePath = join(rootDir, relativePath)
      return [relativePath, existsSync(absolutePath) ? readFileSync(absolutePath, 'utf-8') : null]
    }),
  )
}

export function getChangedLocalSyncToolingPaths(
  previousSnapshot: SyncToolingSnapshot,
  rootDir: string,
  paths: readonly string[] = Object.keys(previousSnapshot),
): string[] {
  const currentSnapshot = snapshotLocalSyncTooling(rootDir, paths)

  return paths.filter(
    (relativePath) => previousSnapshot[relativePath] !== currentSnapshot[relativePath],
  )
}

export function buildSelfRerunArgs(rawArgs: string[], templateDir: string): string[] {
  const nextArgs: string[] = []

  for (let index = 0; index < rawArgs.length; index += 1) {
    const argument = rawArgs[index]

    if (argument === '--from') {
      index += 1
      continue
    }

    if (argument.startsWith('--from=')) {
      continue
    }

    nextArgs.push(argument)
  }

  nextArgs.push('--from', templateDir)

  if (!nextArgs.includes('--allow-dirty-app')) {
    nextArgs.push('--allow-dirty-app')
  }
  if (!nextArgs.includes('--allow-dirty-template')) {
    nextArgs.push('--allow-dirty-template')
  }

  return nextArgs
}

export function isAppLocalSyncToolingExecution(appDir: string, rootDir = ROOT_DIR): boolean {
  return resolve(appDir) === resolve(rootDir)
}

function expandHome(value: string, homeDir = process.env.HOME || ''): string {
  return value.replace(/^~/, homeDir)
}

function isAuthoringWorkspace(rootDir: string): boolean {
  try {
    const originUrl = runCommand('git', ['remote', 'get-url', 'origin'], {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    if (AUTHORING_REPO_SLUGS.some((slug) => originUrl.includes(slug))) {
      return true
    }
  } catch {
    /* fall through */
  }

  try {
    const rootPackage = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8')) as {
      name?: string
    }
    if (rootPackage.name && AUTHORING_WORKSPACE_NAMES.has(rootPackage.name)) {
      return true
    }
  } catch {
    /* fall through */
  }

  return false
}

export interface ResolveTemplateDirOptions {
  fromValue?: string
  envOverride?: string
  homeDir?: string
  pathExists?: (path: string) => boolean
}

export function listTemplateDirHints(homeDir = process.env.HOME || ''): string[] {
  const candidates: string[] = []
  for (const parentDir of TEMPLATE_DIR_HINT_PARENTS) {
    for (const dirName of TEMPLATE_DIR_HINT_NAMES) {
      candidates.push(join(homeDir, parentDir, dirName))
    }
  }

  return [...new Set(candidates)]
}

export function resolveTemplateDir(
  rootDir: string,
  options: ResolveTemplateDirOptions = {},
): string {
  const homeDir = options.homeDir ?? process.env.HOME ?? ''

  if (options.fromValue) {
    return resolve(expandHome(options.fromValue, homeDir))
  }

  const envOverride = options.envOverride ?? process.env.NARDUK_TEMPLATE_DIR
  if (envOverride) {
    return resolve(expandHome(envOverride, homeDir))
  }

  if (isAuthoringWorkspace(rootDir)) {
    return rootDir
  }

  const pathExists = options.pathExists ?? existsSync
  const candidates = listTemplateDirHints(homeDir)
  for (const candidate of candidates) {
    if (pathExists(candidate)) {
      return candidate
    }
  }

  return (
    candidates[0] ??
    join(process.env.HOME || '', 'code', 'platform-new', TEMPLATE_DIR_HINT_NAMES[0])
  )
}

function resolveTemplateSha(templateDir: string, templateRef = 'HEAD'): string {
  try {
    return runCommand('git', ['rev-parse', templateRef], {
      cwd: templateDir,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

export function materializeTemplateRepoAtRef(templateDir: string, templateRef: string): string {
  const tempTemplateDir = mkdtempSync(join(tmpdir(), 'narduk-template-ref-'))

  try {
    const archive = execFileSync('git', ['archive', '--format=tar', templateRef], {
      cwd: templateDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: GIT_ARCHIVE_MAX_BUFFER,
    })

    execFileSync('tar', ['-xf', '-', '-C', tempTemplateDir], {
      input: archive,
      stdio: ['pipe', 'ignore', 'pipe'],
      maxBuffer: GIT_ARCHIVE_MAX_BUFFER,
    })
  } catch (error: unknown) {
    rmSync(tempTemplateDir, { recursive: true, force: true })
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Unable to materialize template ref "${templateRef}" from ${templateDir}: ${message}`,
    )
  }

  return tempTemplateDir
}

export function isDirectSyncTemplateExecution(
  scriptPath = fileURLToPath(import.meta.url),
  argv: readonly string[] = process.argv,
  cwd = process.cwd(),
): boolean {
  const invokedPath = argv[1]
  if (!invokedPath) {
    return false
  }

  const normalizedInvokedPath = resolve(cwd, invokedPath)
  const normalizedScriptPath = isAbsolute(scriptPath) ? scriptPath : resolve(cwd, scriptPath)

  return normalizedInvokedPath === normalizedScriptPath
}

function materializeStarterTemplate(
  templateDir: string,
  selection: TemplateLayerSelection | undefined,
  themeSelection: BaseThemeSelection | undefined,
  selectedAppTemplate: AppTemplateSelection | null | undefined,
  quiet = false,
): string {
  const tempTemplateDir = mkdtempSync(join(tmpdir(), 'narduk-template-sync-'))
  const exportScriptPath = join(templateDir, 'tools', 'export-starter.ts')
  const args = ['exec', 'tsx', exportScriptPath, tempTemplateDir, '--force']
  if (selection) {
    args.push(`--template-layer-selection-json=${JSON.stringify(selection)}`)
  }
  if (themeSelection) {
    args.push(`--base-theme-selection-json=${JSON.stringify(themeSelection)}`)
  }
  if (selectedAppTemplate !== undefined) {
    args.push(`--app-template-selection-json=${JSON.stringify(selectedAppTemplate)}`)
  }

  runCommand('pnpm', args, {
    cwd: ROOT_DIR,
    stdio: quiet ? ['ignore', 'ignore', 'ignore'] : 'inherit',
  })

  return tempTemplateDir
}

function emitJsonReport(report: SyncTemplateReport) {
  console.log(JSON.stringify(report, null, 2))
}

async function main() {
  const rawArgs = process.argv.slice(2)
  const {
    positionalArgs,
    flags,
    fromValue,
    templateRef,
    templateLayerSelection,
    baseThemeSelection,
    appTemplateSelection,
    jsonOutput,
  } = parseSyncTemplateArgs(rawArgs)
  const authoringWorkspace = isAuthoringWorkspace(ROOT_DIR)
  const appDirArg = authoringWorkspace ? positionalArgs[0] : positionalArgs[0] || '.'

  if (!appDirArg) {
    const message =
      'Usage: pnpm exec tsx tools/sync-template.ts <app-directory> [--from /path/to/narduk-template] [--template-ref <sha|tag|ref>] [--template-layer-selection-json=<json> | --bundles=auth,analytics,ai] [--theme=balanced|console|editorial|marketing] [--app-template=dashboard|marketing|docs|search] [--dry-run] [--strict] [--skip-install] [--skip-quality] [--allow-dirty-app] [--allow-dirty-template] [--json]'
    if (jsonOutput) {
      emitJsonReport({
        appDir: '',
        templateDir: '',
        templateRef: templateRef || null,
        templateSha: '',
        templateLayerSelection: { mode: 'bundled', bundles: [] },
        baseThemeSelection: { id: 'balanced' },
        appTemplateSelection: null,
        dryRun: flags.has('--dry-run'),
        strict: flags.has('--strict'),
        skipInstall: flags.has('--skip-install'),
        skipQuality: flags.has('--skip-quality'),
        success: false,
        changed: false,
        copied: 0,
        patched: 0,
        removed: 0,
        skipped: 0,
        error: message,
        logs: [],
      })
    } else {
      console.error(message)
    }
    process.exit(1)
  }

  const resolvedAppDir = resolve(expandHome(appDirArg))
  const templateDir = resolve(resolveTemplateDir(ROOT_DIR, { fromValue }))
  const reportLogs: string[] = []
  const log = (message: string) => {
    if (jsonOutput) {
      reportLogs.push(message)
      return
    }
    console.log(message)
  }

  const resolvedTemplateLayerSelection =
    templateLayerSelection ?? resolveRepoTemplateLayerSelection(resolvedAppDir)
  const resolvedBaseThemeSelection =
    baseThemeSelection ?? resolveRepoBaseThemeSelection(resolvedAppDir)
  const resolvedAppTemplateSelection =
    appTemplateSelection === undefined
      ? resolveRepoAppTemplateSelection(resolvedAppDir)
      : appTemplateSelection

  const reportBase = {
    appDir: resolvedAppDir,
    templateDir,
    templateRef: templateRef || null,
    templateSha: '',
    templateLayerSelection: resolvedTemplateLayerSelection,
    baseThemeSelection: resolvedBaseThemeSelection,
    appTemplateSelection: resolvedAppTemplateSelection,
    dryRun: flags.has('--dry-run'),
    strict: flags.has('--strict'),
    skipInstall: flags.has('--skip-install'),
    skipQuality: flags.has('--skip-quality'),
    logs: reportLogs,
  } satisfies Omit<
    SyncTemplateReport,
    'success' | 'changed' | 'copied' | 'patched' | 'removed' | 'skipped' | 'error'
  >

  if (!existsSync(resolvedAppDir)) {
    const error = `App directory not found: ${resolvedAppDir}`
    if (jsonOutput) {
      emitJsonReport({
        ...reportBase,
        success: false,
        changed: false,
        copied: 0,
        patched: 0,
        removed: 0,
        skipped: 0,
        error,
      })
    } else {
      console.error(error)
    }
    process.exit(1)
  }

  if (!existsSync(join(templateDir, 'starters', 'default'))) {
    const error = `Template directory not found or incomplete: ${templateDir}`
    if (jsonOutput) {
      emitJsonReport({
        ...reportBase,
        success: false,
        changed: false,
        copied: 0,
        patched: 0,
        removed: 0,
        skipped: 0,
        error,
      })
    } else {
      console.error(error)
      console.error(
        'Pass --from /path/to/narduk-template, set NARDUK_TEMPLATE_DIR, or run from the authoring workspace.',
      )
    }
    process.exit(1)
  }

  if (!authoringWorkspace && resolvedAppDir === templateDir) {
    const error = 'Template source resolves to the current app checkout.'
    if (jsonOutput) {
      emitJsonReport({
        ...reportBase,
        success: false,
        changed: false,
        copied: 0,
        patched: 0,
        removed: 0,
        skipped: 0,
        error,
      })
    } else {
      console.error(error)
      console.error(
        'Pass --from /path/to/narduk-template, set NARDUK_TEMPLATE_DIR, or use --template-ref from a template checkout.',
      )
    }
    process.exit(1)
  }

  const templateSha = resolveTemplateSha(templateDir, templateRef || 'HEAD')
  if (!templateSha) {
    const error = templateRef
      ? `Unable to resolve template ref "${templateRef}" in ${templateDir}`
      : `Unable to resolve template SHA for ${templateDir}`
    if (jsonOutput) {
      emitJsonReport({
        ...reportBase,
        success: false,
        changed: false,
        copied: 0,
        patched: 0,
        removed: 0,
        skipped: 0,
        error,
      })
    } else {
      console.error(error)
    }
    process.exit(1)
  }

  let tempStarterDir = ''
  let tempTemplateRepoDir = ''

  try {
    const templateExportDir = templateRef
      ? (tempTemplateRepoDir = materializeTemplateRepoAtRef(templateDir, templateRef))
      : templateDir

    tempStarterDir = materializeStarterTemplate(
      templateExportDir,
      resolvedTemplateLayerSelection,
      resolvedBaseThemeSelection,
      resolvedAppTemplateSelection,
      jsonOutput,
    )

    if (
      isAppLocalSyncToolingExecution(resolvedAppDir) &&
      !process.env[SYNC_TEMPLATE_SELF_RERUN_ENV]
    ) {
      const changedToolingPaths = getChangedLocalSyncToolingPaths(
        snapshotLocalSyncTooling(resolvedAppDir),
        tempStarterDir,
      )

      if (changedToolingPaths.length > 0) {
        const rerunMessage = `Detected sync tooling updates (${changedToolingPaths.join(', ')}); re-running with refreshed tooling.`
        log(rerunMessage)

        const rerunArgs = buildSelfRerunArgs(rawArgs, templateDir)
        const rerunScriptPath = join(tempStarterDir, 'tools', 'sync-template.ts')
        const rerunEnv = {
          ...process.env,
          [SYNC_TEMPLATE_SELF_RERUN_ENV]: '1',
        }

        if (jsonOutput) {
          const childOutput = runCommand('pnpm', ['exec', 'tsx', rerunScriptPath, ...rerunArgs], {
            cwd: resolvedAppDir,
            encoding: 'utf-8',
            stdio: ['ignore', 'pipe', 'pipe'],
            env: rerunEnv,
          })
          const childReport = JSON.parse(childOutput) as SyncTemplateReport
          emitJsonReport({
            ...childReport,
            logs: [...reportLogs, ...childReport.logs],
          })
        } else {
          runCommand('pnpm', ['exec', 'tsx', rerunScriptPath, ...rerunArgs], {
            cwd: resolvedAppDir,
            stdio: 'inherit',
            env: rerunEnv,
          })
        }

        return
      }
    }

    const result = await runAppSync({
      appDir: resolvedAppDir,
      templateDir: tempStarterDir,
      mode: 'full',
      dryRun: flags.has('--dry-run'),
      strict: flags.has('--strict'),
      skipInstall: flags.has('--skip-install'),
      skipQuality: flags.has('--skip-quality'),
      allowDirtyApp: flags.has('--allow-dirty-app'),
      allowDirtyTemplate: true,
      skipRewriteRepo: true,
      templateLayerSelection: resolvedTemplateLayerSelection,
      baseThemeSelection: resolvedBaseThemeSelection,
      appTemplateSelection: resolvedAppTemplateSelection,
      templateSha,
      quietChildCommands: jsonOutput,
      log,
    })

    if (jsonOutput) {
      emitJsonReport({
        ...reportBase,
        templateSha,
        success: true,
        changed: result.changed,
        copied: result.copied,
        patched: result.patched,
        removed: result.removed,
        skipped: result.skipped,
        error: null,
      })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    if (jsonOutput) {
      emitJsonReport({
        ...reportBase,
        templateSha,
        success: false,
        changed: false,
        copied: 0,
        patched: 0,
        removed: 0,
        skipped: 0,
        error: message,
      })
    } else {
      console.error(message)
    }
    process.exitCode = 1
  } finally {
    if (tempStarterDir) {
      rmSync(tempStarterDir, { recursive: true, force: true })
    }
    if (tempTemplateRepoDir) {
      rmSync(tempTemplateRepoDir, { recursive: true, force: true })
    }
  }
}

if (isDirectSyncTemplateExecution()) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exit(1)
  })
}

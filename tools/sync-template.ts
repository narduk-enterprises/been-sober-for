import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
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

const rawArgs = process.argv.slice(2)
const positionalArgs: string[] = []
const flags = new Set<string>()
let fromValue: string | undefined
let templateLayerSelection: TemplateLayerSelection | undefined
let baseThemeSelection: BaseThemeSelection | undefined
let appTemplateSelection: AppTemplateSelection | null | undefined
const jsonOutput = rawArgs.includes('--json')

export interface SyncTemplateReport {
  appDir: string
  templateDir: string
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
    console.error('legacy-full is no longer supported. Use bundled layer selections only.')
    process.exit(1)
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

function expandHome(value: string): string {
  return value.replace(/^~/, process.env.HOME || '')
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

function resolveTemplateDir(rootDir: string): string {
  if (fromValue) {
    return resolve(expandHome(fromValue))
  }

  if (isAuthoringWorkspace(rootDir)) {
    return rootDir
  }

  for (const dirName of TEMPLATE_DIR_HINT_NAMES) {
    const candidate = join(process.env.HOME || '', 'new-code', dirName)
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return join(process.env.HOME || '', 'new-code', TEMPLATE_DIR_HINT_NAMES[0])
}

function resolveTemplateSha(templateDir: string): string {
  try {
    return runCommand('git', ['rev-parse', 'HEAD'], {
      cwd: templateDir,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

function materializeStarterTemplate(
  templateDir: string,
  selection: TemplateLayerSelection | undefined,
  themeSelection: BaseThemeSelection | undefined,
  selectedAppTemplate: AppTemplateSelection | null | undefined,
  quiet = false,
): string {
  const tempTemplateDir = mkdtempSync(join(tmpdir(), 'narduk-template-sync-'))
  const args = ['exec', 'tsx', 'tools/export-starter.ts', tempTemplateDir, '--force']
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
    cwd: templateDir,
    stdio: quiet ? ['ignore', 'ignore', 'ignore'] : 'inherit',
  })

  return tempTemplateDir
}

function emitJsonReport(report: SyncTemplateReport) {
  console.log(JSON.stringify(report, null, 2))
}

async function main() {
  const authoringWorkspace = isAuthoringWorkspace(ROOT_DIR)
  const appDirArg = authoringWorkspace ? positionalArgs[0] : positionalArgs[0] || '.'

  if (!appDirArg) {
    const message =
      'Usage: pnpm exec tsx tools/sync-template.ts <app-directory> [--from /path/to/narduk-template] [--template-layer-selection-json=<json> | --bundles=auth,analytics,ai] [--theme=balanced|console|editorial|marketing] [--app-template=dashboard|marketing|docs|search] [--dry-run] [--strict] [--skip-install] [--skip-quality] [--allow-dirty-app] [--allow-dirty-template] [--json]'
    if (jsonOutput) {
      emitJsonReport({
        appDir: '',
        templateDir: '',
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
  const templateDir = resolve(resolveTemplateDir(ROOT_DIR))
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
        'Pass --from /path/to/narduk-template or clone the authoring workspace locally.',
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
      console.error('Pass --from /path/to/narduk-template to sync from the authoring workspace.')
    }
    process.exit(1)
  }

  const templateSha = resolveTemplateSha(templateDir)
  let tempStarterDir = ''

  try {
    tempStarterDir = materializeStarterTemplate(
      templateDir,
      resolvedTemplateLayerSelection,
      resolvedBaseThemeSelection,
      resolvedAppTemplateSelection,
      jsonOutput,
    )

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
  }
}

void main()

import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { runCommand, type CommandOptions } from './command'
import {
  buildPackageRegistryLine,
  getPackageRegistryConfig,
  patchPackageRegistryNpmrcContent,
} from './package-registry'
import {
  LAYER_BUNDLE_MANIFEST,
  normalizeTemplateLayerSelection,
  type TemplateLayerSelection,
} from './layer-bundle-manifest'
import { normalizeBaseThemeSelection, type BaseThemeSelection } from './theme-manifest'
import { normalizeAppTemplateSelection, type AppTemplateSelection } from './app-template-manifest'
import {
  resolveRepoAppTemplateSelection,
  resolveRepoBaseThemeSelection,
  resolveRepoTemplateLayerSelection,
} from './template-layer-selection'
import { getCloudflareWorkersBuildsSettings } from './provision-metadata'
import {
  createCounters,
  escapeRegExp,
  patchJsonFile,
  removeStalePaths,
  syncGeneratedFiles,
  syncManagedFiles,
  walkFiles,
  type SyncCounters,
} from './sync-files'
import { patchRootPackage } from './sync-root-package'
import { patchWebPackage } from './sync-web-package'
import { patchWebNuxtConfig } from './sync-nuxt-config'
import { mergeWebWranglerKvBinding } from './sync-wrangler'
import { applyAuthBridgeCompanionPatches } from './sync-database'

export type { AuthBridgeCompanionPatchResult } from './sync-database'
export { applyAuthBridgeCompanionPatches }

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

export interface RunAppSyncResult {
  changed: boolean
  copied: number
  patched: number
  removed: number
  skipped: number
}

const LEGACY_COMPAT_LAYER_DIRECTORY = 'layers/narduk-nuxt-layer'
const CLOUDFLARE_WORKERS_BUILDS_SETTINGS = getCloudflareWorkersBuildsSettings()
const SILENT_CHILD_COMMAND_STDIO: CommandOptions['stdio'] = ['ignore', 'pipe', 'pipe']
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

export function patchProvisionSelections(
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
  const nextWorkersBuilds = {
    ...CLOUDFLARE_WORKERS_BUILDS_SETTINGS,
    requiredBuildSecrets: [...CLOUDFLARE_WORKERS_BUILDS_SETTINGS.requiredBuildSecrets],
    requiredRuntimeVariables: [...CLOUDFLARE_WORKERS_BUILDS_SETTINGS.requiredRuntimeVariables],
  }
  let touched = false
  patchJsonFile<Record<string, any>>(
    provisionPath,
    (provision) => {
      const existingCloudflare =
        typeof provision.cloudflare === 'object' && provision.cloudflare !== null
          ? (provision.cloudflare as Record<string, unknown>)
          : null
      const existingWorkersBuilds =
        existingCloudflare &&
        typeof existingCloudflare.workersBuilds === 'object' &&
        existingCloudflare.workersBuilds !== null
          ? existingCloudflare.workersBuilds
          : null

      if (
        JSON.stringify(provision.templateLayer ?? null) === JSON.stringify(normalizedSelection) &&
        JSON.stringify(provision.baseTheme ?? null) === JSON.stringify(normalizedBaseTheme) &&
        JSON.stringify(provision.appTemplate ?? null) === JSON.stringify(normalizedAppTemplate) &&
        JSON.stringify(existingWorkersBuilds ?? null) === JSON.stringify(nextWorkersBuilds)
      ) {
        return false
      }

      provision.templateLayer = normalizedSelection
      provision.baseTheme = normalizedBaseTheme
      provision.appTemplate = normalizedAppTemplate
      provision.cloudflare = {
        ...(existingCloudflare || {}),
        workersBuilds: nextWorkersBuilds,
      }
      touched = true
      return true
    },
    dryRun,
  )

  if (touched) {
    log('  UPDATE: provision.json template selections and Workers Builds metadata')
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

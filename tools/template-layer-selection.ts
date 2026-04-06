import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  LAYER_BUNDLE_MANIFEST,
  OPTIONAL_LAYER_BUNDLE_IDS,
  createBundledLayerSelection,
  getLayerBundleByPackageName,
  isLegacyCompatSelection,
  parseTemplateLayerSelectionJson,
  resolveSelectedLayerPackageNames,
  type OptionalLayerBundleId,
  type TemplateLayerSelection,
} from './layer-bundle-manifest'
import {
  DEFAULT_BASE_THEME_SELECTION,
  getBaseThemeByPackageName,
  normalizeBaseThemeSelection,
  parseBaseThemeArg,
  parseBaseThemeSelectionJson,
  type BaseThemeSelection,
} from './theme-manifest'
import {
  getAppTemplateByPackageName,
  normalizeAppTemplateSelection,
  parseAppTemplateArg,
  parseAppTemplateSelectionJson,
  type AppTemplateSelection,
} from './app-template-manifest'
import {
  normalizeStarterCompositionSelection,
  resolveSelectedStarterPackageNames,
  type NormalizedStarterCompositionSelection,
} from './starter-composition'

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

interface ProvisionJson {
  templateLayer?: TemplateLayerSelection | string | null
  baseTheme?: BaseThemeSelection | string | null
  appTemplate?: AppTemplateSelection | string | null
}

const LEGACY_COMPAT_PACKAGE_NAME = '@narduk-enterprises/narduk-nuxt-template-layer'
const LEGACY_PUBLIC_SEO_FILE_PATTERN = /\.(?:ts|mts|js|mjs|vue)$/i
const LEGACY_PUBLIC_SEO_PATTERNS = [
  'useSeo(',
  'useWebPageSchema(',
  'useArticleSchema(',
  'useProductSchema(',
  'useFAQSchema(',
  'useLocalBusinessSchema(',
  'useBreadcrumbSchema(',
  'schemaOrg:',
  'defineOgImage(',
] as const

function readJsonIfExists<T>(path: string): T | null {
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

function getRepoWebPackageJsonPath(repoRoot: string) {
  return join(repoRoot, 'apps', 'web', 'package.json')
}

function getRepoProvisionJsonPath(repoRoot: string) {
  return join(repoRoot, 'provision.json')
}

function getRepoCompatLayerDir(repoRoot: string) {
  return join(repoRoot, 'layers', 'narduk-nuxt-layer')
}

function getInstalledPackageDir(repoRoot: string, packageName: string) {
  const parts = packageName.split('/')
  return join(repoRoot, 'node_modules', ...parts)
}

function listDeclaredPackages(pkg: PackageJson | null): string[] {
  if (!pkg) return []

  return [
    ...new Set([...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})]),
  ]
}

function readTextIfExists(path: string): string {
  if (!existsSync(path)) return ''
  return readFileSync(path, 'utf8')
}

function directoryContainsLegacyPublicSeo(dir: string): boolean {
  if (!existsSync(dir)) return false

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue

    const entryPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (directoryContainsLegacyPublicSeo(entryPath)) return true
      continue
    }

    if (!LEGACY_PUBLIC_SEO_FILE_PATTERN.test(entry.name)) continue

    const content = readTextIfExists(entryPath)
    if (LEGACY_PUBLIC_SEO_PATTERNS.some((pattern) => content.includes(pattern))) {
      return true
    }
  }

  return false
}

function repoDisablesSsr(repoRoot: string): boolean {
  return /\bssr\s*:\s*false\b/.test(readTextIfExists(join(repoRoot, 'apps', 'web', 'nuxt.config.ts')))
}

function repoUsesLegacyPublicSeo(repoRoot: string): boolean {
  if (repoDisablesSsr(repoRoot)) return false

  const nuxtConfig = readTextIfExists(join(repoRoot, 'apps', 'web', 'nuxt.config.ts'))
  if (LEGACY_PUBLIC_SEO_PATTERNS.some((pattern) => nuxtConfig.includes(pattern))) {
    return true
  }

  return directoryContainsLegacyPublicSeo(join(repoRoot, 'apps', 'web', 'app'))
}

function withLegacySeoBundle(
  repoRoot: string,
  selection: TemplateLayerSelection,
): TemplateLayerSelection {
  if (selection.bundles.includes('seo')) return selection
  if (!repoUsesLegacyPublicSeo(repoRoot)) return selection

  return createBundledLayerSelection([...selection.bundles, 'seo'])
}

function inferSelectionFromDeclaredPackages(packageNames: string[]): TemplateLayerSelection | null {
  if (packageNames.includes(LEGACY_COMPAT_PACKAGE_NAME)) {
    return createBundledLayerSelection(OPTIONAL_LAYER_BUNDLE_IDS)
  }

  const bundles: OptionalLayerBundleId[] = packageNames
    .map((packageName) => getLayerBundleByPackageName(packageName))
    .filter((bundle): bundle is NonNullable<typeof bundle> => bundle != null && bundle.optional)
    .map((bundle) => bundle.id as OptionalLayerBundleId)

  const includesCore = packageNames.includes(LAYER_BUNDLE_MANIFEST.core.packageName)
  if (!includesCore && bundles.length === 0) {
    return null
  }

  return createBundledLayerSelection(bundles)
}

function parseProvisionBaseThemeSelection(
  selection: BaseThemeSelection | string | null | undefined,
): BaseThemeSelection {
  if (typeof selection === 'string') {
    return selection.trim().startsWith('{')
      ? parseBaseThemeSelectionJson(selection)
      : parseBaseThemeArg(selection)
  }

  return normalizeBaseThemeSelection(selection)
}

function parseProvisionAppTemplateSelection(
  selection: AppTemplateSelection | string | null | undefined,
): AppTemplateSelection | null {
  if (typeof selection === 'string') {
    return selection.trim().startsWith('{')
      ? parseAppTemplateSelectionJson(selection)
      : parseAppTemplateArg(selection)
  }

  return normalizeAppTemplateSelection(selection)
}

function inferBaseThemeSelectionFromDeclaredPackages(
  packageNames: string[],
): BaseThemeSelection | null {
  const theme = packageNames
    .map((packageName) => getBaseThemeByPackageName(packageName))
    .find((definition): definition is NonNullable<typeof definition> => definition != null)

  return theme ? { id: theme.id } : null
}

function inferAppTemplateSelectionFromDeclaredPackages(
  packageNames: string[],
): AppTemplateSelection | null {
  const appTemplate = packageNames
    .map((packageName) => getAppTemplateByPackageName(packageName))
    .find((definition): definition is NonNullable<typeof definition> => definition != null)

  return appTemplate ? { id: appTemplate.id } : null
}

export function resolveRepoTemplateLayerSelection(repoRoot: string): TemplateLayerSelection {
  const provision = readJsonIfExists<ProvisionJson>(getRepoProvisionJsonPath(repoRoot))
  const provisionSelection = provision?.templateLayer
  if (typeof provisionSelection === 'string') {
    if (isLegacyCompatSelection(provisionSelection)) {
      return withLegacySeoBundle(repoRoot, createBundledLayerSelection(OPTIONAL_LAYER_BUNDLE_IDS))
    }

    return withLegacySeoBundle(repoRoot, parseTemplateLayerSelectionJson(provisionSelection))
  }
  if (provisionSelection && typeof provisionSelection === 'object') {
    if (isLegacyCompatSelection(provisionSelection)) {
      return withLegacySeoBundle(repoRoot, createBundledLayerSelection(OPTIONAL_LAYER_BUNDLE_IDS))
    }

    return withLegacySeoBundle(
      repoRoot,
      createBundledLayerSelection(provisionSelection.bundles || []),
    )
  }

  const webPackage = readJsonIfExists<PackageJson>(getRepoWebPackageJsonPath(repoRoot))
  const inferredSelection = inferSelectionFromDeclaredPackages(listDeclaredPackages(webPackage))
  if (inferredSelection) {
    return withLegacySeoBundle(repoRoot, inferredSelection)
  }

  if (existsSync(getRepoCompatLayerDir(repoRoot))) {
    return withLegacySeoBundle(repoRoot, createBundledLayerSelection(OPTIONAL_LAYER_BUNDLE_IDS))
  }

  return withLegacySeoBundle(repoRoot, { mode: 'bundled', bundles: [] })
}

export function resolveRepoBaseThemeSelection(repoRoot: string): BaseThemeSelection {
  const provision = readJsonIfExists<ProvisionJson>(getRepoProvisionJsonPath(repoRoot))
  if (provision && 'baseTheme' in provision) {
    return parseProvisionBaseThemeSelection(provision.baseTheme)
  }

  const webPackage = readJsonIfExists<PackageJson>(getRepoWebPackageJsonPath(repoRoot))
  const inferredSelection = inferBaseThemeSelectionFromDeclaredPackages(
    listDeclaredPackages(webPackage),
  )
  if (inferredSelection) {
    return inferredSelection
  }

  return DEFAULT_BASE_THEME_SELECTION
}

export function resolveRepoAppTemplateSelection(repoRoot: string): AppTemplateSelection | null {
  const provision = readJsonIfExists<ProvisionJson>(getRepoProvisionJsonPath(repoRoot))
  if (provision && 'appTemplate' in provision) {
    return parseProvisionAppTemplateSelection(provision.appTemplate)
  }

  const webPackage = readJsonIfExists<PackageJson>(getRepoWebPackageJsonPath(repoRoot))
  return inferAppTemplateSelectionFromDeclaredPackages(listDeclaredPackages(webPackage))
}

export function resolveRepoStarterCompositionSelection(
  repoRoot: string,
): NormalizedStarterCompositionSelection {
  return normalizeStarterCompositionSelection({
    templateLayerSelection: resolveRepoTemplateLayerSelection(repoRoot),
    baseThemeSelection: resolveRepoBaseThemeSelection(repoRoot),
    appTemplateSelection: resolveRepoAppTemplateSelection(repoRoot),
  })
}

export function repoUsesBundledLayers(repoRoot: string): boolean {
  return resolveRepoTemplateLayerSelection(repoRoot).mode === 'bundled'
}

export function resolveRepoStarterPackageNames(repoRoot: string): string[] {
  return resolveSelectedStarterPackageNames(resolveRepoStarterCompositionSelection(repoRoot))
}

export function resolveRepoLayerPackageNames(repoRoot: string): string[] {
  return resolveSelectedLayerPackageNames(resolveRepoTemplateLayerSelection(repoRoot))
}

export function resolveRepoLayerPackageDirs(repoRoot: string): string[] {
  return resolveSelectedLayerPackageNames(resolveRepoTemplateLayerSelection(repoRoot))
    .map((packageName) => getInstalledPackageDir(repoRoot, packageName))
    .filter((dir, index, dirs) => existsSync(dir) && dirs.indexOf(dir) === index)
}

export function resolveRepoLayerDrizzleDirs(repoRoot: string): string[] {
  return resolveRepoLayerPackageDirs(repoRoot)
    .map((packageDir) => join(packageDir, 'drizzle'))
    .filter((dir, index, dirs) => existsSync(dir) && dirs.indexOf(dir) === index)
}

export function resolveRepoLayerPublicDir(repoRoot: string): string | null {
  const corePackageDir = getInstalledPackageDir(repoRoot, LAYER_BUNDLE_MANIFEST.core.packageName)
  return existsSync(join(corePackageDir, 'public')) ? join(corePackageDir, 'public') : null
}

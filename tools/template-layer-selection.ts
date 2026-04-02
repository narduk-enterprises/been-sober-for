import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  COMPAT_LAYER_PACKAGE_NAME,
  LAYER_BUNDLE_MANIFEST,
  getLayerBundleByPackageName,
  normalizeTemplateLayerSelection,
  parseTemplateLayerSelectionJson,
  resolveSelectedLayerPackageNames,
  type OptionalLayerBundleId,
  type TemplateLayerSelection,
} from './layer-bundle-manifest'

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

interface ProvisionJson {
  templateLayer?: TemplateLayerSelection | string | null
}

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

function inferSelectionFromDeclaredPackages(packageNames: string[]): TemplateLayerSelection | null {
  if (packageNames.includes(COMPAT_LAYER_PACKAGE_NAME)) {
    return { mode: 'legacy-full' }
  }

  const bundles: OptionalLayerBundleId[] = packageNames
    .map((packageName) => getLayerBundleByPackageName(packageName))
    .filter((bundle): bundle is NonNullable<typeof bundle> => bundle != null && bundle.optional)
    .map((bundle) => bundle.id as OptionalLayerBundleId)

  const includesCore = packageNames.includes(LAYER_BUNDLE_MANIFEST.core.packageName)
  if (!includesCore && bundles.length === 0) {
    return null
  }

  return normalizeTemplateLayerSelection({
    mode: 'bundled',
    bundles,
  })
}

export function resolveRepoTemplateLayerSelection(repoRoot: string): TemplateLayerSelection {
  const provision = readJsonIfExists<ProvisionJson>(getRepoProvisionJsonPath(repoRoot))
  const provisionSelection = provision?.templateLayer
  if (typeof provisionSelection === 'string') {
    return parseTemplateLayerSelectionJson(provisionSelection)
  }
  if (provisionSelection && typeof provisionSelection === 'object') {
    return normalizeTemplateLayerSelection(provisionSelection)
  }

  const webPackage = readJsonIfExists<PackageJson>(getRepoWebPackageJsonPath(repoRoot))
  const inferredSelection = inferSelectionFromDeclaredPackages(listDeclaredPackages(webPackage))
  if (inferredSelection) {
    return inferredSelection
  }

  if (existsSync(getRepoCompatLayerDir(repoRoot))) {
    return { mode: 'legacy-full' }
  }

  return { mode: 'bundled', bundles: [] }
}

export function repoUsesBundledLayers(repoRoot: string): boolean {
  return resolveRepoTemplateLayerSelection(repoRoot).mode === 'bundled'
}

export function resolveRepoLayerPackageNames(repoRoot: string): string[] {
  return resolveSelectedLayerPackageNames(resolveRepoTemplateLayerSelection(repoRoot))
}

export function resolveRepoLayerPackageDirs(repoRoot: string): string[] {
  const selection = resolveRepoTemplateLayerSelection(repoRoot)

  if (selection.mode === 'legacy-full') {
    const localCompatLayerDir = getRepoCompatLayerDir(repoRoot)
    if (existsSync(localCompatLayerDir)) {
      return [localCompatLayerDir]
    }

    const installedCompatDir = getInstalledPackageDir(repoRoot, COMPAT_LAYER_PACKAGE_NAME)
    return existsSync(installedCompatDir) ? [installedCompatDir] : []
  }

  return resolveSelectedLayerPackageNames(selection)
    .map((packageName) => getInstalledPackageDir(repoRoot, packageName))
    .filter((dir, index, dirs) => existsSync(dir) && dirs.indexOf(dir) === index)
}

export function resolveRepoLayerDrizzleDirs(repoRoot: string): string[] {
  return resolveRepoLayerPackageDirs(repoRoot)
    .map((packageDir) => join(packageDir, 'drizzle'))
    .filter((dir, index, dirs) => existsSync(dir) && dirs.indexOf(dir) === index)
}

export function resolveRepoLayerPublicDir(repoRoot: string): string | null {
  const selection = resolveRepoTemplateLayerSelection(repoRoot)

  if (selection.mode === 'legacy-full') {
    const localCompatLayerDir = getRepoCompatLayerDir(repoRoot)
    if (existsSync(join(localCompatLayerDir, 'public'))) {
      return join(localCompatLayerDir, 'public')
    }
  }

  const corePackageDir = getInstalledPackageDir(repoRoot, LAYER_BUNDLE_MANIFEST.core.packageName)
  return existsSync(join(corePackageDir, 'public')) ? join(corePackageDir, 'public') : null
}

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  listLayerBundleDefinitions,
  normalizeTemplateLayerSelection,
  resolveSelectedLayerDrizzlePackageNames,
  resolveSelectedLayerPackageNames,
  type TemplateLayerSelection,
} from './layer-bundle-manifest'
import { listBaseThemeDefinitions, type BaseThemeSelection } from './theme-manifest'
import { listAppTemplateDefinitions, type AppTemplateSelection } from './app-template-manifest'
import {
  resolveSelectedStarterPackageNames,
  resolveSelectedStarterRequiredAppDependencies,
} from './starter-composition'
import { FLEET_WEB_SCRIPT_PATCHES } from './sync-manifest'
import { patchJsonFile } from './sync-files'

function resolveLayerDrizzleDirsForSelection(selection: TemplateLayerSelection): string[] {
  return resolveSelectedLayerDrizzlePackageNames(selection).map(
    (packageName) => `node_modules/${packageName}/drizzle`,
  )
}

function getSeedLayerPackageName(selection: TemplateLayerSelection): string {
  return resolveSelectedLayerPackageNames(normalizeTemplateLayerSelection(selection))[0] || ''
}

export function patchWebPackage(
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
          const expectedDev = 'nuxt dev'

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

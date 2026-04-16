import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { FLEET_ROOT_SCRIPT_PATCHES } from './sync-manifest'
import { patchJsonFile } from './sync-files'

export function patchRootPackage(
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
  const staleRootPackages = ['concurrently', 'googleapis'] as const
  const preserveExistingVersionRootPackages = new Set(['@narduk-enterprises/narduk-skills'])

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
          const existingVersion = pkg.devDependencies[dependency] ?? pkg.dependencies?.[dependency]
          if (preserveExistingVersionRootPackages.has(dependency) && existingVersion) {
            continue
          }

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

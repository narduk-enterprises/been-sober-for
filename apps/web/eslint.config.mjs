// @ts-check
// ⚠️ SYNCED FILE — do not edit. App-specific rules go in eslint.overrides.mjs
import withNuxt from './.nuxt/eslint.config.mjs'
import { sharedConfigs } from '@narduk-enterprises/eslint-config/config'

const NUXT_MANAGED_PLUGIN_KEYS = new Set(['@typescript-eslint'])

function stripNuxtManagedPlugins(config) {
  if (!config?.plugins) {
    return config
  }

  const filteredPlugins = Object.fromEntries(
    Object.entries(config.plugins).filter(([name]) => !NUXT_MANAGED_PLUGIN_KEYS.has(name)),
  )

  if (Object.keys(filteredPlugins).length === Object.keys(config.plugins).length) {
    return config
  }

  if (Object.keys(filteredPlugins).length === 0) {
    const { plugins: _plugins, ...rest } = config
    return rest
  }

  return {
    ...config,
    plugins: filteredPlugins,
  }
}

let layerFragments
try {
  layerFragments =
    await import('@narduk-enterprises/narduk-nuxt-template-layer-core/eslint-nuxt-flat-fragments')
} catch (error) {
  throw new Error(
    `Missing core layer ESLint fragments; install workspace dependencies before linting: ${String(error)}`,
  )
}

const { importXVueCoreModuleFragment, redundantNuxtAutoImportFlatConfig } = layerFragments

let appOverrides = []
try {
  const mod = await import('./eslint.overrides.mjs')
  appOverrides = mod.default || []
} catch {
  // No overrides file — using sharedConfigs only
}

const sanitizedSharedConfigs = sharedConfigs.map(stripNuxtManagedPlugins)

export default withNuxt(
  ...sanitizedSharedConfigs,
  redundantNuxtAutoImportFlatConfig,
  importXVueCoreModuleFragment,
  ...appOverrides,
)

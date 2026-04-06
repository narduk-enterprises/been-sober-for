// @ts-check
// ⚠️ SYNCED FILE — do not edit. App-specific rules go in eslint.overrides.mjs
import withNuxt from './.nuxt/eslint.config.mjs'
import { sharedConfigs } from '@narduk-enterprises/eslint-config/config'

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

export default withNuxt(
  ...sharedConfigs,
  redundantNuxtAutoImportFlatConfig,
  importXVueCoreModuleFragment,
  ...appOverrides,
)

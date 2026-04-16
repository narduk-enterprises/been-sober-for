// @ts-check
// ⚠️ SYNCED FILE — do not edit. App-specific rules go in eslint.overrides.mjs
import appOverrides from './eslint.overrides.mjs'
import withNuxt from './.nuxt/eslint.config.mjs'
import { createAppLintConfig } from '@narduk-enterprises/narduk-nuxt-template-layer-core/eslint-app-config'

export default createAppLintConfig({
  withNuxt,
  capabilityPacks: ['core', 'designSystem', 'nuxtUi', 'seo', 'server', 'auth', 'template'],
  seoMode: 'internal-only',
  extraOverrides: appOverrides,
})

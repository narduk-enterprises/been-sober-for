export const OPTIONAL_LAYER_BUNDLE_IDS = ['auth', 'analytics', 'maps', 'uploads'] as const
export const LAYER_BUNDLE_IDS = ['core', ...OPTIONAL_LAYER_BUNDLE_IDS, 'full-compat'] as const

export type OptionalLayerBundleId = (typeof OPTIONAL_LAYER_BUNDLE_IDS)[number]
export type LayerBundleId = (typeof LAYER_BUNDLE_IDS)[number]

export type TemplateLayerSelection =
  | { mode: 'legacy-full' }
  | { mode: 'bundled'; bundles: OptionalLayerBundleId[] }

export interface LayerBundleDefinition {
  id: LayerBundleId
  packageName: string
  description: string
  optional: boolean
  ownedRuntimePaths: string[]
  ownedTestPaths: string[]
  ownedMigrationPaths: string[]
  requiredAppDependencies: string[]
  requiredEnvKeys: string[]
}

export const LAYER_BUNDLE_MANIFEST: Record<LayerBundleId, LayerBundleDefinition> = {
  core: {
    id: 'core',
    packageName: '@narduk-enterprises/narduk-nuxt-template-layer-core',
    description: 'Core UI, worker runtime, SEO, and shared utilities.',
    optional: false,
    ownedRuntimePaths: [
      'app/app.config.ts',
      'app/app.vue',
      'app/assets/css/main.css',
      'app/components/AppConfirmModal.vue',
      'app/components/AppCopyButton.vue',
      'app/components/AppEmptyState.vue',
      'app/components/AppLightbox.vue',
      'app/components/AppPresetLayout.vue',
      'app/components/AppSettingsProfile.vue',
      'app/components/AppShareButtons.vue',
      'app/components/AppTabs.vue',
      'app/components/LayerAppFooter.vue',
      'app/components/LayerAppHeader.vue',
      'app/components/LayerAppShell.vue',
      'app/components/LayerChromelessShell.vue',
      'app/components/presets/**',
      'app/composables/useAppFetch.ts',
      'app/composables/useBreadcrumbs.ts',
      'app/composables/useColorModeToggle.ts',
      'app/composables/useCsrfFetch.ts',
      'app/composables/useFormHandler.ts',
      'app/composables/useFormat.ts',
      'app/composables/useHaptics.ts',
      'app/composables/useLayoutPresets.ts',
      'app/composables/useMarkdown.ts',
      'app/composables/useOgImageData.ts',
      'app/composables/usePersistentTab.ts',
      'app/composables/useSchemaOrg.ts',
      'app/composables/useScrollReveal.ts',
      'app/composables/useSeo.ts',
      'app/error.vue',
      'app/layouts/landing.vue',
      'app/layouts/preset-surface.vue',
      'app/plugins/build-info.client.ts',
      'app/plugins/build-meta.ts',
      'app/plugins/fetch.client.ts',
      'app/types/api.ts',
      'app/types/layoutPresets.ts',
      'app/types/page-meta.d.ts',
      'app/types/runtime-config.d.ts',
      'app/utils/formatBuildTimeLocal.ts',
      'app/utils/ogPreview.ts',
      'app/utils/persistentTab.ts',
      'app/utils/xaiModels.ts',
      'components/OgImage/**',
      'public/**',
      'server/api/control-plane/**',
      'server/api/health.get.ts',
      'server/routes/cdn-cgi/image/**',
      'server/database/pg-schema.ts',
      'server/database/schema.ts',
      'server/middleware/canonicalRedirect.ts',
      'server/middleware/cors.ts',
      'server/middleware/csrf.ts',
      'server/middleware/d1.ts',
      'server/middleware/requestLogger.ts',
      'server/middleware/securityHeaders.ts',
      'server/plugins/error-logger.ts',
      'server/types/h3.d.ts',
      'server/utils/cron.ts',
      'server/utils/d1Cache.ts',
      'server/utils/database.ts',
      'server/utils/demo.ts',
      'server/utils/hyperdrive.ts',
      'server/utils/kv.ts',
      'server/utils/logger.ts',
      'server/utils/mutation.ts',
      'server/utils/auth.ts',
      'server/utils/password.ts',
      'server/utils/rateLimit.ts',
      'server/utils/sse.ts',
      'server/utils/systemPrompts.ts',
      'server/utils/xai.ts',
      'shared/controlPlaneProxy.ts',
      'drizzle/**',
    ],
    ownedTestPaths: ['testing/**', 'tests/**'],
    ownedMigrationPaths: ['drizzle'],
    requiredAppDependencies: [],
    requiredEnvKeys: [],
  },
  auth: {
    id: 'auth',
    packageName: '@narduk-enterprises/narduk-nuxt-template-layer-auth',
    description: 'Auth, user session, and protected-route capabilities.',
    optional: true,
    ownedRuntimePaths: [
      'app/components/AppNotificationCenter.vue',
      'app/components/AppUserMenu.vue',
      'app/components/AuthLoginCard.vue',
      'app/components/AuthRegisterCard.vue',
      'app/components/admin/AdminAiTab.vue',
      'app/components/admin/AdminOgImagePreview.vue',
      'app/components/admin/AdminOgImagesTab.vue',
      'app/components/admin/AdminUsersTab.vue',
      'app/composables/useAdminAi.ts',
      'app/composables/useAuth.ts',
      'app/composables/useAuthApi.ts',
      'app/composables/useNotifications.ts',
      'app/middleware/auth.ts',
      'app/middleware/guest.ts',
      'app/pages/dashboard/index.vue',
      'app/pages/login.vue',
      'app/pages/register.vue',
      'app/types/auth.d.ts',
      'server/api/admin/ai/**',
      'server/api/admin/system-prompts/**',
      'server/api/admin/users/**',
      'server/api/auth/**',
      'server/api/notifications/**',
      'server/utils/accountDeletion.ts',
      'server/utils/notifications.ts',
    ],
    ownedTestPaths: ['tests/app/auth/**', 'tests/server/auth/**'],
    ownedMigrationPaths: [],
    requiredAppDependencies: ['@supabase/auth-js', '@supabase/supabase-js'],
    requiredEnvKeys: ['NUXT_SESSION_PASSWORD'],
  },
  analytics: {
    id: 'analytics',
    packageName: '@narduk-enterprises/narduk-nuxt-template-layer-analytics',
    description: 'PostHog, GA, and indexing helpers.',
    optional: true,
    ownedRuntimePaths: [
      'app/composables/usePosthog.ts',
      'app/plugins/gtag.client.ts',
      'app/plugins/posthog.client.ts',
      'app/types/posthog.d.ts',
      'server/api/indexnow/**',
      'server/api/admin/ga/**',
      'server/api/admin/gsc/**',
      'server/api/admin/indexing/**',
      'server/api/owner-tag.post.ts',
      'server/api/owner/posthog-bootstrap.get.ts',
      'server/middleware/indexnow.ts',
      'server/utils/analyticsCache.ts',
      'server/utils/google.ts',
      'server/utils/indexNow.ts',
    ],
    ownedTestPaths: ['tests/server/analytics/**'],
    ownedMigrationPaths: [],
    requiredAppDependencies: [],
    requiredEnvKeys: ['GA_MEASUREMENT_ID', 'POSTHOG_PUBLIC_KEY', 'POSTHOG_HOST'],
  },
  maps: {
    id: 'maps',
    packageName: '@narduk-enterprises/narduk-nuxt-template-layer-maps',
    description: 'Apple Maps and map-kit helpers.',
    optional: true,
    ownedRuntimePaths: [
      'app/components/AppMapKit.vue',
      'app/composables/useMapKit.ts',
      'server/api/mapkit-token.get.ts',
      'server/utils/apple-maps.ts',
      'server/utils/appleMapToken.ts',
    ],
    ownedTestPaths: ['tests/app/maps/**', 'tests/server/maps/**'],
    ownedMigrationPaths: [],
    requiredAppDependencies: [],
    requiredEnvKeys: [
      'APPLE_TEAM_ID',
      'APPLE_KEY_ID',
      'APPLE_PRIVATE_KEY',
      'MAPKIT_SERVER_API_KEY',
    ],
  },
  uploads: {
    id: 'uploads',
    packageName: '@narduk-enterprises/narduk-nuxt-template-layer-uploads',
    description: 'R2 upload and image delivery helpers.',
    optional: true,
    ownedRuntimePaths: [
      'app/composables/useUpload.ts',
      'server/api/upload.post.ts',
      'server/routes/images/**',
      'server/utils/r2.ts',
      'server/utils/upload.ts',
    ],
    ownedTestPaths: ['tests/app/uploads/**', 'tests/server/uploads/**'],
    ownedMigrationPaths: [],
    requiredAppDependencies: [],
    requiredEnvKeys: ['R2_BUCKET'],
  },
  'full-compat': {
    id: 'full-compat',
    packageName: '@narduk-enterprises/narduk-nuxt-template-layer',
    description: 'Legacy full layer surface for existing downstream apps.',
    optional: false,
    ownedRuntimePaths: ['layers/narduk-nuxt-layer/**'],
    ownedTestPaths: ['layers/narduk-nuxt-layer/testing/**', 'layers/narduk-nuxt-layer/tests/**'],
    ownedMigrationPaths: ['layers/narduk-nuxt-layer/drizzle'],
    requiredAppDependencies: ['@supabase/auth-js', '@supabase/supabase-js'],
    requiredEnvKeys: [],
  },
} as const

export const DEFAULT_LAYER_BUNDLE_ID: LayerBundleId = 'full-compat'
export const COMPAT_LAYER_PACKAGE_NAME = LAYER_BUNDLE_MANIFEST[DEFAULT_LAYER_BUNDLE_ID].packageName
export const DEFAULT_TEMPLATE_LAYER_SELECTION: TemplateLayerSelection = {
  mode: 'bundled',
  bundles: [],
}

export function getLayerBundleDefinition(bundleId: LayerBundleId = DEFAULT_LAYER_BUNDLE_ID) {
  return LAYER_BUNDLE_MANIFEST[bundleId]
}

export function getLayerBundlePackageName(bundleId: LayerBundleId = DEFAULT_LAYER_BUNDLE_ID) {
  return getLayerBundleDefinition(bundleId).packageName
}

export function getLayerBundleByPackageName(packageName: string): LayerBundleDefinition | null {
  const normalized = packageName.trim()
  if (!normalized) return null

  return (
    Object.values(LAYER_BUNDLE_MANIFEST).find((bundle) => bundle.packageName === normalized) ?? null
  )
}

export function listLayerBundleDefinitions(): LayerBundleDefinition[] {
  return Object.values(LAYER_BUNDLE_MANIFEST)
}

export function normalizeTemplateLayerSelection(
  selection: TemplateLayerSelection | null | undefined,
): TemplateLayerSelection {
  if (selection?.mode === 'legacy-full') {
    return { mode: 'legacy-full' }
  }

  const requestedBundles = selection?.mode === 'bundled' ? selection.bundles : []
  return {
    mode: 'bundled',
    bundles: OPTIONAL_LAYER_BUNDLE_IDS.filter((bundle, index, allBundles) => {
      return requestedBundles?.includes(bundle) && allBundles.indexOf(bundle) === index
    }),
  }
}

export function parseTemplateLayerSelectionJson(
  value: string | null | undefined,
): TemplateLayerSelection {
  if (!value?.trim()) return DEFAULT_TEMPLATE_LAYER_SELECTION

  try {
    const parsed = JSON.parse(value) as TemplateLayerSelection
    return normalizeTemplateLayerSelection(parsed)
  } catch {
    return DEFAULT_TEMPLATE_LAYER_SELECTION
  }
}

export function mapLegacyLayerBundleIdToSelection(
  bundleId: LayerBundleId | null | undefined,
): TemplateLayerSelection {
  switch (bundleId) {
    case 'auth':
    case 'analytics':
    case 'maps':
    case 'uploads':
      return { mode: 'bundled', bundles: [bundleId] }
    case 'full-compat':
      return { mode: 'legacy-full' }
    case 'core':
    default:
      return DEFAULT_TEMPLATE_LAYER_SELECTION
  }
}

export function resolveSelectedOptionalBundles(
  selection: TemplateLayerSelection | null | undefined,
): OptionalLayerBundleId[] {
  const normalized = normalizeTemplateLayerSelection(selection)
  return normalized.mode === 'legacy-full' ? [...OPTIONAL_LAYER_BUNDLE_IDS] : normalized.bundles
}

export function resolveSelectedLayerPackageNames(
  selection: TemplateLayerSelection | null | undefined,
): string[] {
  const normalized = normalizeTemplateLayerSelection(selection)
  if (normalized.mode === 'legacy-full') {
    return [COMPAT_LAYER_PACKAGE_NAME]
  }

  return [
    LAYER_BUNDLE_MANIFEST.core.packageName,
    ...normalized.bundles.map((bundleId) => LAYER_BUNDLE_MANIFEST[bundleId].packageName),
  ]
}

export function resolveRequiredAppDependencies(
  selection: TemplateLayerSelection | null | undefined,
): string[] {
  const normalized = normalizeTemplateLayerSelection(selection)
  const bundleIds: LayerBundleId[] =
    normalized.mode === 'legacy-full' ? ['full-compat'] : ['core', ...normalized.bundles]

  const dependencies = bundleIds.flatMap(
    (bundleId) => LAYER_BUNDLE_MANIFEST[bundleId].requiredAppDependencies,
  )

  return dependencies.filter((dependency, index) => dependencies.indexOf(dependency) === index)
}

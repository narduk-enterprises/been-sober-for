export const OPTIONAL_LAYER_BUNDLE_IDS = [
  'seo',
  'auth',
  'operator',
  'analytics',
  'ai',
  'maps',
  'uploads',
] as const
export const LAYER_BUNDLE_IDS = ['core', ...OPTIONAL_LAYER_BUNDLE_IDS] as const

export type OptionalLayerBundleId = (typeof OPTIONAL_LAYER_BUNDLE_IDS)[number]
export type LayerBundleId = (typeof LAYER_BUNDLE_IDS)[number]

export type TemplateLayerSelection = { mode: 'bundled'; bundles: OptionalLayerBundleId[] }

export interface LayerBundleDefinition {
  id: LayerBundleId
  packageName: string
  description: string
  optional: boolean
  hasDrizzlePayload: boolean
  requiredAppDependencies: string[]
  requiredEnvKeys: string[]
}

export const LAYER_BUNDLE_MANIFEST: Record<LayerBundleId, LayerBundleDefinition> = {
  core: {
    id: 'core',
    packageName: '@narduk-enterprises/narduk-nuxt-template-layer-core',
    description: 'Core UI, worker runtime, database helpers, and shared utilities.',
    optional: false,
    hasDrizzlePayload: true,
    requiredAppDependencies: ['@supabase/auth-js', '@supabase/supabase-js'],
    requiredEnvKeys: [],
  },
  seo: {
    id: 'seo',
    packageName: '@narduk-enterprises/narduk-nuxt-template-layer-seo',
    description: 'Public SEO, Schema.org, and Open Graph helpers for SSR apps.',
    optional: true,
    hasDrizzlePayload: false,
    requiredAppDependencies: [],
    requiredEnvKeys: [],
  },
  auth: {
    id: 'auth',
    packageName: '@narduk-enterprises/narduk-nuxt-template-layer-auth',
    description: 'Auth, user session, and protected-route capabilities.',
    optional: true,
    hasDrizzlePayload: false,
    requiredAppDependencies: [],
    requiredEnvKeys: ['NUXT_SESSION_PASSWORD'],
  },
  operator: {
    id: 'operator',
    packageName: '@narduk-enterprises/narduk-nuxt-template-layer-operator',
    description: 'Operator-console shell, tables, and admin workspace primitives.',
    optional: true,
    hasDrizzlePayload: false,
    requiredAppDependencies: [],
    requiredEnvKeys: [],
  },
  analytics: {
    id: 'analytics',
    packageName: '@narduk-enterprises/narduk-nuxt-template-layer-analytics',
    description: 'PostHog, GA, and indexing helpers.',
    optional: true,
    hasDrizzlePayload: false,
    requiredAppDependencies: [],
    requiredEnvKeys: [
      'GA_MEASUREMENT_ID',
      'POSTHOG_PUBLIC_KEY',
      'POSTHOG_HOST',
      'GA_PROPERTY_ID',
      'GSC_SERVICE_ACCOUNT_JSON',
      'GSC_SITE_URL',
      'POSTHOG_PROJECT_ID',
      'POSTHOG_PERSONAL_API_KEY',
      'POSTHOG_DOMAIN',
      'POSTHOG_API_HOST',
    ],
  },
  ai: {
    id: 'ai',
    packageName: '@narduk-enterprises/narduk-nuxt-template-layer-ai',
    description: 'Shared AI runtime utilities, system prompts, and admin model controls.',
    optional: true,
    hasDrizzlePayload: true,
    requiredAppDependencies: [],
    requiredEnvKeys: ['XAI_API_KEY'],
  },
  maps: {
    id: 'maps',
    packageName: '@narduk-enterprises/narduk-nuxt-template-layer-maps',
    description: 'Apple Maps and map-kit helpers.',
    optional: true,
    hasDrizzlePayload: false,
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
    hasDrizzlePayload: false,
    requiredAppDependencies: [],
    requiredEnvKeys: ['R2_BUCKET'],
  },
}

export const DEFAULT_TEMPLATE_LAYER_SELECTION: TemplateLayerSelection = {
  mode: 'bundled',
  bundles: [],
}

export function isKnownOptionalLayerBundleId(value: string): value is OptionalLayerBundleId {
  return OPTIONAL_LAYER_BUNDLE_IDS.includes(value as OptionalLayerBundleId)
}

export function ensureOptionalLayerBundleOrder(
  bundles: readonly OptionalLayerBundleId[],
): OptionalLayerBundleId[] {
  return OPTIONAL_LAYER_BUNDLE_IDS.filter((bundleId) => bundles.includes(bundleId))
}

export function createBundledLayerSelection(
  bundles: readonly OptionalLayerBundleId[],
): TemplateLayerSelection {
  return {
    mode: 'bundled',
    bundles: ensureOptionalLayerBundleOrder(bundles),
  }
}

export function getLegacyCompatMigrationSelection(): TemplateLayerSelection {
  return createBundledLayerSelection(OPTIONAL_LAYER_BUNDLE_IDS)
}

export function isLegacyCompatSelection(
  selection: { mode?: string } | string | null | undefined,
): boolean {
  if (typeof selection === 'string') {
    return selection === 'legacy-full'
  }

  return selection?.mode === 'legacy-full'
}

export function normalizeTemplateLayerSelection(
  selection:
    | TemplateLayerSelection
    | { mode?: string; bundles?: string[] }
    | string
    | null
    | undefined,
): TemplateLayerSelection {
  if (selection == null) {
    return DEFAULT_TEMPLATE_LAYER_SELECTION
  }

  if (typeof selection === 'string') {
    if (isLegacyCompatSelection(selection)) {
      throw new Error('legacy-full is no longer supported. Use bundled layer selections only.')
    }

    return DEFAULT_TEMPLATE_LAYER_SELECTION
  }

  if (isLegacyCompatSelection(selection)) {
    throw new Error('legacy-full is no longer supported. Use bundled layer selections only.')
  }

  if (selection.mode !== 'bundled') {
    return DEFAULT_TEMPLATE_LAYER_SELECTION
  }

  const bundles = Array.isArray(selection.bundles)
    ? selection.bundles.reduce<OptionalLayerBundleId[]>((accumulator, bundle) => {
        if (isKnownOptionalLayerBundleId(bundle)) {
          accumulator.push(bundle)
        }
        return accumulator
      }, [])
    : []

  return createBundledLayerSelection(bundles)
}

export function parseTemplateLayerSelectionJson(
  value: string | null | undefined,
): TemplateLayerSelection {
  if (!value?.trim()) return DEFAULT_TEMPLATE_LAYER_SELECTION

  try {
    const parsed = JSON.parse(value) as
      | TemplateLayerSelection
      | { mode?: string; bundles?: string[] }
    return normalizeTemplateLayerSelection(parsed)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return DEFAULT_TEMPLATE_LAYER_SELECTION
    }

    throw error
  }
}

export function parseOptionalLayerBundles(value: string): OptionalLayerBundleId[] {
  const bundles = value
    .split(',')
    .map((bundle) => bundle.trim())
    .filter(isKnownOptionalLayerBundleId)

  return ensureOptionalLayerBundleOrder([...new Set(bundles)])
}

export function parseOptionalLayerBundleArgs(
  value: string | null | undefined,
): TemplateLayerSelection {
  if (!value?.trim()) {
    return DEFAULT_TEMPLATE_LAYER_SELECTION
  }

  return createBundledLayerSelection(parseOptionalLayerBundles(value))
}

export function getLayerBundleDefinition(bundleId: LayerBundleId = 'core') {
  return LAYER_BUNDLE_MANIFEST[bundleId]
}

export function getLayerBundlePackageName(bundleId: LayerBundleId = 'core') {
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

export function mapLegacyLayerBundleIdToSelection(
  bundleId: LayerBundleId | OptionalLayerBundleId | null | undefined,
): TemplateLayerSelection {
  switch (bundleId) {
    case 'seo':
    case 'auth':
    case 'analytics':
    case 'ai':
    case 'maps':
    case 'uploads':
      return createBundledLayerSelection([bundleId])
    case 'core':
    default:
      return DEFAULT_TEMPLATE_LAYER_SELECTION
  }
}

export function resolveSelectedOptionalBundles(
  selection:
    | TemplateLayerSelection
    | { mode?: string; bundles?: string[] }
    | string
    | null
    | undefined,
): OptionalLayerBundleId[] {
  return normalizeTemplateLayerSelection(selection).bundles
}

export function resolveSelectedLayerPackageNames(
  selection:
    | TemplateLayerSelection
    | { mode?: string; bundles?: string[] }
    | string
    | null
    | undefined,
): string[] {
  const normalized = normalizeTemplateLayerSelection(selection)

  return [
    LAYER_BUNDLE_MANIFEST.core.packageName,
    ...normalized.bundles.map((bundleId) => LAYER_BUNDLE_MANIFEST[bundleId].packageName),
  ]
}

export function resolveSelectedLayerDrizzlePackageNames(
  selection:
    | TemplateLayerSelection
    | { mode?: string; bundles?: string[] }
    | string
    | null
    | undefined,
): string[] {
  const normalized = normalizeTemplateLayerSelection(selection)
  const bundleIds: LayerBundleId[] = ['core', ...normalized.bundles]

  return bundleIds
    .filter((bundleId) => LAYER_BUNDLE_MANIFEST[bundleId].hasDrizzlePayload)
    .map((bundleId) => LAYER_BUNDLE_MANIFEST[bundleId].packageName)
}

export function resolvePrimaryLayerPackageName(
  selection:
    | TemplateLayerSelection
    | { mode?: string; bundles?: string[] }
    | string
    | null
    | undefined,
): string {
  return resolveSelectedLayerPackageNames(selection)[0] || LAYER_BUNDLE_MANIFEST.core.packageName
}

export function resolveRequiredAppDependencies(
  selection:
    | TemplateLayerSelection
    | { mode?: string; bundles?: string[] }
    | string
    | null
    | undefined,
): string[] {
  const normalized = normalizeTemplateLayerSelection(selection)
  const bundleIds: LayerBundleId[] = ['core', ...normalized.bundles]

  const dependencies = bundleIds.flatMap(
    (bundleId) => LAYER_BUNDLE_MANIFEST[bundleId].requiredAppDependencies,
  )

  return dependencies.filter((dependency, index) => dependencies.indexOf(dependency) === index)
}

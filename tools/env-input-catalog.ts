import type { OptionalLayerBundleId } from './layer-bundle-manifest'

export const REGISTRY_INPUT_SCOPE_POLICIES = ['global', 'app', 'derived'] as const
export const REGISTRY_INPUT_STORAGE_KINDS = [
  'registry-plain',
  'command-plain',
  'doppler-secret',
  'command-secret',
  'generated-secret',
] as const
export const REGISTRY_INPUT_DERIVED_SOURCES = ['site-url', 'site-hostname', 'gsc-site-url'] as const

export type RegistryInputScopePolicy = (typeof REGISTRY_INPUT_SCOPE_POLICIES)[number]
export type RegistryInputStorageKind = (typeof REGISTRY_INPUT_STORAGE_KINDS)[number]
export type RegistryInputDerivedSource = (typeof REGISTRY_INPUT_DERIVED_SOURCES)[number]

export interface EnvInputCatalogEntry {
  key: string
  bundleIds: OptionalLayerBundleId[]
  scopePolicy: RegistryInputScopePolicy
  storageKind: RegistryInputStorageKind
  allowAppOverride: boolean
  defaultPlainValue?: string
  derivedFrom?: RegistryInputDerivedSource
  managementHint: string
  notes?: string
}

export const ENV_INPUT_CATALOG: Record<string, EnvInputCatalogEntry> = {
  NUXT_OG_IMAGE_SECRET: {
    key: 'NUXT_OG_IMAGE_SECRET',
    bundleIds: ['seo'],
    scopePolicy: 'app',
    storageKind: 'generated-secret',
    allowAppOverride: false,
    managementHint:
      'Generated during bootstrap and stored as an app-specific GitHub plus Cloudflare build/runtime secret.',
    notes: 'Keep stable so signed OG image URLs remain valid across deploys.',
  },
  NUXT_SESSION_PASSWORD: {
    key: 'NUXT_SESSION_PASSWORD',
    bundleIds: ['auth'],
    scopePolicy: 'app',
    storageKind: 'generated-secret',
    allowAppOverride: false,
    managementHint:
      'Generated during starter bootstrap and stored as an app-specific Cloudflare runtime secret.',
    notes: 'Keep stable across deploys to preserve sessions.',
  },
  GA_MEASUREMENT_ID: {
    key: 'GA_MEASUREMENT_ID',
    bundleIds: ['analytics'],
    scopePolicy: 'app',
    storageKind: 'registry-plain',
    allowAppOverride: false,
    managementHint: 'Managed per app in command and synced into Cloudflare build/runtime vars.',
    notes: 'Public Google Analytics measurement id for the specific app.',
  },
  GA_PROPERTY_ID: {
    key: 'GA_PROPERTY_ID',
    bundleIds: ['analytics'],
    scopePolicy: 'app',
    storageKind: 'registry-plain',
    allowAppOverride: false,
    managementHint: 'Managed per app in command and synced into Cloudflare runtime vars.',
    notes: 'Server-side Google Analytics property id for admin analytics routes.',
  },
  GSC_SERVICE_ACCOUNT_JSON: {
    key: 'GSC_SERVICE_ACCOUNT_JSON',
    bundleIds: ['analytics'],
    scopePolicy: 'global',
    storageKind: 'command-secret',
    allowAppOverride: false,
    managementHint:
      'Managed by the command bootstrap secret COMMAND_GSC_SERVICE_ACCOUNT_JSON and synced into app Cloudflare runtime secrets.',
    notes: 'Shared Google Search Console service account used by analytics admin routes.',
  },
  GSC_SITE_URL: {
    key: 'GSC_SITE_URL',
    bundleIds: ['analytics'],
    scopePolicy: 'derived',
    storageKind: 'registry-plain',
    allowAppOverride: true,
    derivedFrom: 'gsc-site-url',
    managementHint:
      'Defaults from the app SITE_URL hostname, with an app-specific override allowed in command.',
    notes: 'Search Console property id or sc-domain key.',
  },
  INDEXNOW_KEY: {
    key: 'INDEXNOW_KEY',
    bundleIds: ['analytics'],
    scopePolicy: 'global',
    storageKind: 'command-plain',
    allowAppOverride: false,
    managementHint:
      'Managed by command bootstrap and synced into app runtime vars as a public value so each app can serve the IndexNow key file and submit URLs.',
    notes: 'Shared IndexNow key used by indexing endpoints for sitemap and URL submissions.',
  },
  POSTHOG_PUBLIC_KEY: {
    key: 'POSTHOG_PUBLIC_KEY',
    bundleIds: ['analytics'],
    scopePolicy: 'global',
    storageKind: 'registry-plain',
    allowAppOverride: false,
    managementHint: 'Managed globally in command and synced into Cloudflare build/runtime vars.',
    notes: 'Shared PostHog public client key.',
  },
  POSTHOG_HOST: {
    key: 'POSTHOG_HOST',
    bundleIds: ['analytics'],
    scopePolicy: 'global',
    storageKind: 'registry-plain',
    allowAppOverride: false,
    managementHint: 'Managed globally in command and synced into Cloudflare build/runtime vars.',
    notes: 'Shared PostHog client ingest host.',
  },
  POSTHOG_PROJECT_ID: {
    key: 'POSTHOG_PROJECT_ID',
    bundleIds: ['analytics'],
    scopePolicy: 'global',
    storageKind: 'registry-plain',
    allowAppOverride: false,
    managementHint: 'Managed globally in command and synced into Cloudflare runtime vars.',
    notes: 'Shared PostHog project id used by admin analytics routes.',
  },
  POSTHOG_PERSONAL_API_KEY: {
    key: 'POSTHOG_PERSONAL_API_KEY',
    bundleIds: ['analytics'],
    scopePolicy: 'global',
    storageKind: 'doppler-secret',
    allowAppOverride: false,
    managementHint:
      'Managed globally in Doppler (narduk/prd) and synced into app Cloudflare runtime secrets.',
    notes: 'Shared PostHog server-side API token.',
  },
  POSTHOG_DOMAIN: {
    key: 'POSTHOG_DOMAIN',
    bundleIds: ['analytics'],
    scopePolicy: 'derived',
    storageKind: 'registry-plain',
    allowAppOverride: true,
    derivedFrom: 'site-hostname',
    managementHint:
      'Defaults from the app SITE_URL hostname, with an app-specific override allowed in command.',
    notes: 'PostHog domain resolution for analytics sync.',
  },
  POSTHOG_API_HOST: {
    key: 'POSTHOG_API_HOST',
    bundleIds: ['analytics'],
    scopePolicy: 'global',
    storageKind: 'registry-plain',
    allowAppOverride: false,
    defaultPlainValue: 'https://p.nard.uk',
    managementHint: 'Managed globally in command and synced into Cloudflare runtime vars.',
    notes: 'Shared PostHog server-side API base URL.',
  },
}

export function getEnvInputCatalogEntry(
  key: string | null | undefined,
): EnvInputCatalogEntry | null {
  const normalized = key?.trim()
  if (!normalized) return null
  return ENV_INPUT_CATALOG[normalized] ?? null
}

export function listEnvInputCatalogEntries(): EnvInputCatalogEntry[] {
  return Object.values(ENV_INPUT_CATALOG).sort((left, right) => left.key.localeCompare(right.key))
}

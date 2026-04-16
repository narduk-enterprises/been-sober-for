import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface CloudflareWorkersBuildsSettings {
  rootDirectory: string
  skipDependencyInstall: boolean
  previewUrls: boolean
  requiredBuildSecrets: string[]
  requiredRuntimeVariables: string[]
  targets: {
    production: {
      branch: string
      environmentName: string
      buildCommand: string
      deployCommand: string
    }
    staging: {
      branch: string
      environmentName: string
      buildCommand: string
      deployCommand: string
    }
  }
  preview: {
    enabled: boolean
    safeMode: boolean
    buildCommand: string
    deployCommand: string
    branchExcludes: string[]
  }
}

export interface ProvisionMetadata {
  name: string | null
  displayName: string | null
  shortName: string | null
  description: string | null
  url: string | null
  localDevNuxtPort: number | null
}

export function getCloudflareWorkersBuildsSettings(
  previewBuildsEnabled = false,
): CloudflareWorkersBuildsSettings {
  return {
    rootDirectory: '/apps/web',
    skipDependencyInstall: true,
    previewUrls: true,
    requiredBuildSecrets: [
      'NARDUK_PLATFORM_GH_PACKAGES_READ',
      'NUXT_SESSION_PASSWORD',
      'NUXT_OG_IMAGE_SECRET',
    ],
    requiredRuntimeVariables: [
      'SITE_URL',
      'STAGING_SITE_URL',
      'NUXT_SESSION_PASSWORD',
      'NUXT_OG_IMAGE_SECRET',
    ],
    targets: {
      production: {
        branch: 'main',
        environmentName: 'production',
        buildCommand: 'pnpm run cf:build:production',
        deployCommand: 'pnpm run cf:deploy',
      },
      staging: {
        branch: 'staging',
        environmentName: 'staging',
        buildCommand: 'pnpm run cf:build:staging',
        deployCommand: 'pnpm run cf:deploy:staging',
      },
    },
    preview: {
      enabled: previewBuildsEnabled,
      safeMode: true,
      buildCommand: 'pnpm run cf:build:preview',
      deployCommand: 'pnpm run cf:deploy:preview',
      branchExcludes: ['main', 'staging'],
    },
  }
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || /^__.+__$/.test(trimmed)) return null
  return trimmed
}

function normalizePort(value: unknown): number | null {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : Number.NaN

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
    return null
  }

  return parsed
}

export function readProvisionMetadata(rootDir: string): ProvisionMetadata {
  const provisionPath = join(rootDir, 'provision.json')
  if (!existsSync(provisionPath)) {
    return {
      name: null,
      displayName: null,
      shortName: null,
      description: null,
      url: null,
      localDevNuxtPort: null,
    }
  }

  try {
    const parsed = JSON.parse(readFileSync(provisionPath, 'utf-8')) as Record<string, unknown>
    const localDev =
      typeof parsed.localDev === 'object' && parsed.localDev !== null
        ? (parsed.localDev as Record<string, unknown>)
        : null

    return {
      name: normalizeText(parsed.name),
      displayName: normalizeText(parsed.displayName),
      shortName: normalizeText(parsed.shortName),
      description: normalizeText(parsed.description),
      url: normalizeText(parsed.url),
      localDevNuxtPort: normalizePort(localDev?.nuxtPort),
    }
  } catch {
    return {
      name: null,
      displayName: null,
      shortName: null,
      description: null,
      url: null,
      localDevNuxtPort: null,
    }
  }
}

export function resolveLocalNuxtPort(
  env: Record<string, string | undefined>,
  provision: ProvisionMetadata,
  fallback: number,
) {
  return normalizePort(env.NUXT_PORT) ?? provision.localDevNuxtPort ?? fallback
}

export function getProvisionDisplayName(provision: ProvisionMetadata, fallback: string): string {
  return provision.displayName || provision.name || fallback
}

export function getProvisionShortName(provision: ProvisionMetadata, fallback: string): string {
  return provision.shortName || provision.displayName || provision.name || fallback
}

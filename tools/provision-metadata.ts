import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface ProvisionMetadata {
  name: string | null
  displayName: string | null
  shortName: string | null
  description: string | null
  url: string | null
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || /^__.+__$/.test(trimmed)) return null
  return trimmed
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
    }
  }

  try {
    const parsed = JSON.parse(readFileSync(provisionPath, 'utf-8')) as Record<string, unknown>
    return {
      name: normalizeText(parsed.name),
      displayName: normalizeText(parsed.displayName),
      shortName: normalizeText(parsed.shortName),
      description: normalizeText(parsed.description),
      url: normalizeText(parsed.url),
    }
  } catch {
    return {
      name: null,
      displayName: null,
      shortName: null,
      description: null,
      url: null,
    }
  }
}

export function getProvisionDisplayName(provision: ProvisionMetadata, fallback: string): string {
  return provision.displayName || provision.name || fallback
}

export function getProvisionShortName(provision: ProvisionMetadata, fallback: string): string {
  return provision.shortName || provision.displayName || provision.name || fallback
}

export const BASE_THEME_IDS = ['balanced', 'console', 'editorial', 'marketing'] as const

export type BaseThemeId = (typeof BASE_THEME_IDS)[number]
export type BaseThemeSelection = { id: BaseThemeId }

export interface BaseThemeDefinition {
  id: BaseThemeId
  packageName: string
  description: string
}

export const BASE_THEME_MANIFEST: Record<BaseThemeId, BaseThemeDefinition> = {
  balanced: {
    id: 'balanced',
    packageName: '@narduk-enterprises/narduk-nuxt-template-layer-theme-balanced',
    description: 'Balanced product theme with calm defaults for general-purpose apps.',
  },
  console: {
    id: 'console',
    packageName: '@narduk-enterprises/narduk-nuxt-template-layer-theme-console',
    description: 'Dense operator-facing theme for dashboards and technical workspaces.',
  },
  editorial: {
    id: 'editorial',
    packageName: '@narduk-enterprises/narduk-nuxt-template-layer-theme-editorial',
    description: 'Reading-first theme for documentation, long-form content, and knowledge apps.',
  },
  marketing: {
    id: 'marketing',
    packageName: '@narduk-enterprises/narduk-nuxt-template-layer-theme-marketing',
    description: 'Expressive campaign theme for launch, pricing, and conversion surfaces.',
  },
}

export const DEFAULT_BASE_THEME_SELECTION: BaseThemeSelection = { id: 'balanced' }

export function isKnownBaseThemeId(value: string): value is BaseThemeId {
  return BASE_THEME_IDS.includes(value as BaseThemeId)
}

export function normalizeBaseThemeSelection(
  selection: BaseThemeSelection | { id?: string } | string | null | undefined,
): BaseThemeSelection {
  if (selection == null) return DEFAULT_BASE_THEME_SELECTION

  if (typeof selection === 'string') {
    return isKnownBaseThemeId(selection) ? { id: selection } : DEFAULT_BASE_THEME_SELECTION
  }

  return isKnownBaseThemeId(selection.id || '')
    ? { id: selection.id as BaseThemeId }
    : DEFAULT_BASE_THEME_SELECTION
}

export function parseBaseThemeSelectionJson(value: string | null | undefined): BaseThemeSelection {
  if (!value?.trim()) return DEFAULT_BASE_THEME_SELECTION

  try {
    const parsed = JSON.parse(value) as BaseThemeSelection | { id?: string }
    return normalizeBaseThemeSelection(parsed)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return DEFAULT_BASE_THEME_SELECTION
    }

    throw error
  }
}

export function parseBaseThemeArg(value: string | null | undefined): BaseThemeSelection {
  if (!value?.trim()) return DEFAULT_BASE_THEME_SELECTION
  return normalizeBaseThemeSelection(value.trim())
}

export function getBaseThemeDefinition(
  selection: BaseThemeSelection | { id?: string } | string | null | undefined,
): BaseThemeDefinition {
  return BASE_THEME_MANIFEST[normalizeBaseThemeSelection(selection).id]
}

export function getBaseThemeByPackageName(packageName: string): BaseThemeDefinition | null {
  const normalized = packageName.trim()
  if (!normalized) return null

  return (
    Object.values(BASE_THEME_MANIFEST).find((theme) => theme.packageName === normalized) ?? null
  )
}

export function listBaseThemeDefinitions(): BaseThemeDefinition[] {
  return Object.values(BASE_THEME_MANIFEST)
}

export function resolveSelectedBaseThemePackageName(
  selection: BaseThemeSelection | { id?: string } | string | null | undefined,
): string {
  return getBaseThemeDefinition(selection).packageName
}

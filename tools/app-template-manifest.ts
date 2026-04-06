export const APP_TEMPLATE_IDS = ['dashboard', 'marketing', 'docs', 'search'] as const

export type AppTemplateId = (typeof APP_TEMPLATE_IDS)[number]
export type AppTemplateSelection = { id: AppTemplateId }

export interface AppTemplateDefinition {
  id: AppTemplateId
  packageName: string
  description: string
  requiredAppDependencies: string[]
}

export const APP_TEMPLATE_MANIFEST: Record<AppTemplateId, AppTemplateDefinition> = {
  dashboard: {
    id: 'dashboard',
    packageName: '@narduk-enterprises/narduk-nuxt-template-layer-template-dashboard',
    description: 'Starter dashboard IA with overview, workspace entry, and multi-route structure.',
    requiredAppDependencies: [],
  },
  marketing: {
    id: 'marketing',
    packageName: '@narduk-enterprises/narduk-nuxt-template-layer-template-marketing',
    description: 'Starter marketing IA with launch, narrative, and pricing routes.',
    requiredAppDependencies: [],
  },
  docs: {
    id: 'docs',
    packageName: '@narduk-enterprises/narduk-nuxt-template-layer-template-docs',
    description: 'Starter documentation IA with index and reference-style routes.',
    requiredAppDependencies: [],
  },
  search: {
    id: 'search',
    packageName: '@narduk-enterprises/narduk-nuxt-template-layer-template-search',
    description: 'Starter browse/search IA with discover and results routes.',
    requiredAppDependencies: [],
  },
}

export function isKnownAppTemplateId(value: string): value is AppTemplateId {
  return APP_TEMPLATE_IDS.includes(value as AppTemplateId)
}

export function normalizeAppTemplateSelection(
  selection: AppTemplateSelection | { id?: string } | string | null | undefined,
): AppTemplateSelection | null {
  if (selection == null) return null

  if (typeof selection === 'string') {
    return isKnownAppTemplateId(selection) ? { id: selection } : null
  }

  return isKnownAppTemplateId(selection.id || '') ? { id: selection.id as AppTemplateId } : null
}

export function parseAppTemplateSelectionJson(
  value: string | null | undefined,
): AppTemplateSelection | null {
  if (!value?.trim()) return null

  try {
    const parsed = JSON.parse(value) as AppTemplateSelection | { id?: string } | null
    return normalizeAppTemplateSelection(parsed)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return null
    }

    throw error
  }
}

export function parseAppTemplateArg(value: string | null | undefined): AppTemplateSelection | null {
  if (!value?.trim()) return null
  return normalizeAppTemplateSelection(value.trim())
}

export function getAppTemplateDefinition(
  selection: AppTemplateSelection | { id?: string } | string | null | undefined,
): AppTemplateDefinition | null {
  const normalized = normalizeAppTemplateSelection(selection)
  return normalized ? APP_TEMPLATE_MANIFEST[normalized.id] : null
}

export function getAppTemplateByPackageName(packageName: string): AppTemplateDefinition | null {
  const normalized = packageName.trim()
  if (!normalized) return null

  return (
    Object.values(APP_TEMPLATE_MANIFEST).find((template) => template.packageName === normalized) ??
    null
  )
}

export function listAppTemplateDefinitions(): AppTemplateDefinition[] {
  return Object.values(APP_TEMPLATE_MANIFEST)
}

export function resolveSelectedAppTemplatePackageNames(
  selection: AppTemplateSelection | { id?: string } | string | null | undefined,
): string[] {
  const definition = getAppTemplateDefinition(selection)
  return definition ? [definition.packageName] : []
}

export function resolveRequiredAppTemplateDependencies(
  selection: AppTemplateSelection | { id?: string } | string | null | undefined,
): string[] {
  const definition = getAppTemplateDefinition(selection)
  return definition ? [...definition.requiredAppDependencies] : []
}

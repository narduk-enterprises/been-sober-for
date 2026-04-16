import {
  LAYER_BUNDLE_MANIFEST,
  normalizeTemplateLayerSelection,
  resolveRequiredAppDependencies,
  resolveSelectedLayerPackageNames,
  type TemplateLayerSelection,
} from './layer-bundle-manifest'
import {
  normalizeBaseThemeSelection,
  resolveSelectedBaseThemePackageName,
  type BaseThemeSelection,
} from './theme-manifest'
import {
  normalizeAppTemplateSelection,
  resolveRequiredAppTemplateDependencies,
  resolveSelectedAppTemplatePackageNames,
  type AppTemplateSelection,
} from './app-template-manifest'

export interface StarterCompositionSelection {
  templateLayerSelection: TemplateLayerSelection
  baseThemeSelection?: BaseThemeSelection | null
  appTemplateSelection?: AppTemplateSelection | null
}

export interface NormalizedStarterCompositionSelection {
  templateLayerSelection: TemplateLayerSelection
  baseThemeSelection: BaseThemeSelection
  appTemplateSelection: AppTemplateSelection | null
}

function unique(values: string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) === index)
}

export function normalizeStarterCompositionSelection(
  selection: StarterCompositionSelection,
): NormalizedStarterCompositionSelection {
  return {
    templateLayerSelection: normalizeTemplateLayerSelection(selection.templateLayerSelection),
    baseThemeSelection: normalizeBaseThemeSelection(selection.baseThemeSelection),
    appTemplateSelection: normalizeAppTemplateSelection(selection.appTemplateSelection),
  }
}

export function resolveSelectedStarterPackageNames(
  selection: StarterCompositionSelection,
): string[] {
  const normalized = normalizeStarterCompositionSelection(selection)
  const layerPackageNames = resolveSelectedLayerPackageNames(normalized.templateLayerSelection)
  const operatorLayerPackageName = LAYER_BUNDLE_MANIFEST.operator.packageName
  const orderedLayerPackageNames = layerPackageNames.includes(operatorLayerPackageName)
    ? [
        operatorLayerPackageName,
        ...layerPackageNames.filter((packageName) => packageName !== operatorLayerPackageName),
      ]
    : layerPackageNames

  return unique([
    resolveSelectedBaseThemePackageName(normalized.baseThemeSelection),
    ...resolveSelectedAppTemplatePackageNames(normalized.appTemplateSelection),
    ...orderedLayerPackageNames,
  ])
}

export function resolveSelectedStarterRequiredAppDependencies(
  selection: StarterCompositionSelection,
): string[] {
  const normalized = normalizeStarterCompositionSelection(selection)

  return unique([
    ...resolveRequiredAppDependencies(normalized.templateLayerSelection),
    ...resolveRequiredAppTemplateDependencies(normalized.appTemplateSelection),
  ])
}

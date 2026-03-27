export type LayoutPresetId =
  | 'marketing-hero'
  | 'saas-product'
  | 'docs-knowledge'
  | 'editorial-story'
  | 'dashboard-analytics'
  | 'dashboard-crm'
  | 'auth-split'
  | 'settings-console'
  | 'pricing-cascade'
  | 'portfolio-canvas'

export type LayoutPresetActionColor =
  | 'error'
  | 'info'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'neutral'

export type LayoutPresetActionVariant = 'link' | 'solid' | 'outline' | 'soft' | 'subtle' | 'ghost'

export interface LayoutPresetAction {
  label: string
  to?: string
  icon?: string
  color?: LayoutPresetActionColor
  variant?: LayoutPresetActionVariant
}

export interface LayoutPresetNavItem {
  label: string
  to: string
}

export interface PresetLayoutProps {
  eyebrow?: string
  title?: string
  description?: string
  primaryAction?: LayoutPresetAction
  secondaryAction?: LayoutPresetAction
  showAnnotations?: boolean
}

export interface LayoutPresetMeta {
  id: LayoutPresetId
  name: string
  summary: string
  personality: string
  category: string
  bestFor: string[]
  navItems: LayoutPresetNavItem[]
  previewTo: string
}

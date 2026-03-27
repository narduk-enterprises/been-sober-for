import type { LayoutPresetId, LayoutPresetMeta } from '../types/layoutPresets'

export const layoutPresetCatalog: LayoutPresetMeta[] = [
  {
    id: 'marketing-hero',
    name: 'Marketing Hero',
    summary:
      'A cinematic landing shell with a bold hero, credibility band, and layered product narrative.',
    personality: 'Cinematic launch page',
    category: 'Marketing',
    bestFor: ['Launch pages', 'Feature announcements', 'Campaign microsites'],
    navItems: [
      { label: 'Overview', to: '#overview' },
      { label: 'Proof', to: '#proof' },
      { label: 'Pricing', to: '#pricing' },
      { label: 'Contact', to: '#contact' },
    ],
    previewTo: '/layouts/marketing-hero',
  },
  {
    id: 'saas-product',
    name: 'SaaS Product',
    summary:
      'A product narrative tuned for B2B SaaS with customer proof, workflow steps, and modular comparison blocks.',
    personality: 'Operator-friendly product pitch',
    category: 'Marketing',
    bestFor: ['B2B homepages', 'Feature overview pages', 'Product storytelling'],
    navItems: [
      { label: 'Product', to: '#product' },
      { label: 'Workflow', to: '#workflow' },
      { label: 'Customers', to: '#customers' },
      { label: 'Demo', to: '#demo' },
    ],
    previewTo: '/layouts/saas-product',
  },
  {
    id: 'docs-knowledge',
    name: 'Docs Knowledge',
    summary:
      'A documentation shell with strong navigation, context panels, and starter reference blocks.',
    personality: 'Focused knowledge base',
    category: 'Documentation',
    bestFor: ['Product docs', 'Internal handbooks', 'API references'],
    navItems: [
      { label: 'Getting Started', to: '#getting-started' },
      { label: 'Guides', to: '#guides' },
      { label: 'Reference', to: '#reference' },
      { label: 'Changelog', to: '#changelog' },
    ],
    previewTo: '/layouts/docs-knowledge',
  },
  {
    id: 'editorial-story',
    name: 'Editorial Story',
    summary:
      'A magazine-style reading surface with pull quotes, chapter rhythm, and a featured narrative rail.',
    personality: 'Long-form editorial',
    category: 'Content',
    bestFor: ['Case studies', 'Manifestos', 'Feature stories'],
    navItems: [
      { label: 'Latest', to: '#latest' },
      { label: 'Archive', to: '#archive' },
      { label: 'Features', to: '#features' },
      { label: 'About', to: '#about' },
    ],
    previewTo: '/layouts/editorial-story',
  },
  {
    id: 'dashboard-analytics',
    name: 'Dashboard Analytics',
    summary: 'A metrics-first workspace with executive KPIs, funnel cards, and a command surface.',
    personality: 'Calm analytics cockpit',
    category: 'Dashboard',
    bestFor: ['Ops dashboards', 'Revenue reporting', 'Growth teams'],
    navItems: [
      { label: 'Summary', to: '#summary' },
      { label: 'Metrics', to: '#metrics' },
      { label: 'Pipeline', to: '#pipeline' },
      { label: 'Reports', to: '#reports' },
    ],
    previewTo: '/layouts/dashboard-analytics',
  },
  {
    id: 'dashboard-crm',
    name: 'Dashboard CRM',
    summary:
      'A relationship workflow layout with pipeline stages, account context, and activity sequencing.',
    personality: 'Sales control room',
    category: 'Dashboard',
    bestFor: ['CRM surfaces', 'Success operations', 'Pipeline tracking'],
    navItems: [
      { label: 'Accounts', to: '#accounts' },
      { label: 'Pipeline', to: '#pipeline' },
      { label: 'Activity', to: '#activity' },
      { label: 'Forecast', to: '#forecast' },
    ],
    previewTo: '/layouts/dashboard-crm',
  },
  {
    id: 'auth-split',
    name: 'Auth Split',
    summary:
      'A two-panel sign-in shell pairing identity actions with brand context and trust signals.',
    personality: 'Branded access gateway',
    category: 'Authentication',
    bestFor: ['Login pages', 'Signup flows', 'Magic-link entry'],
    navItems: [
      { label: 'Sign in', to: '#sign-in' },
      { label: 'Security', to: '#security' },
      { label: 'Support', to: '#support' },
      { label: 'Status', to: '#status' },
    ],
    previewTo: '/layouts/auth-split',
  },
  {
    id: 'settings-console',
    name: 'Settings Console',
    summary:
      'A controlled settings workspace with dense information architecture and review-friendly change zones.',
    personality: 'Configuration console',
    category: 'Application',
    bestFor: ['Admin settings', 'Team preferences', 'Billing and permissions'],
    navItems: [
      { label: 'Profile', to: '#profile' },
      { label: 'Permissions', to: '#permissions' },
      { label: 'Billing', to: '#billing' },
      { label: 'Audit', to: '#audit' },
    ],
    previewTo: '/layouts/settings-console',
  },
  {
    id: 'pricing-cascade',
    name: 'Pricing Cascade',
    summary: 'A pricing-led shell with tier framing, proof blocks, and upgrade logic callouts.',
    personality: 'Commercial conversion surface',
    category: 'Commercial',
    bestFor: ['Pricing pages', 'Plan comparisons', 'Expansion prompts'],
    navItems: [
      { label: 'Plans', to: '#plans' },
      { label: 'Compare', to: '#compare' },
      { label: 'FAQ', to: '#faq' },
      { label: 'Sales', to: '#sales' },
    ],
    previewTo: '/layouts/pricing-cascade',
  },
  {
    id: 'portfolio-canvas',
    name: 'Portfolio Canvas',
    summary:
      'A gallery-driven shell with a bold author voice, selected work rhythm, and soft-case storytelling.',
    personality: 'Creative showcase',
    category: 'Portfolio',
    bestFor: ['Studios', 'Creators', 'Agency profiles'],
    navItems: [
      { label: 'Selected Work', to: '#selected-work' },
      { label: 'Services', to: '#services' },
      { label: 'About', to: '#about' },
      { label: 'Contact', to: '#contact' },
    ],
    previewTo: '/layouts/portfolio-canvas',
  },
]

export const layoutPresetIds = layoutPresetCatalog.map((preset) => preset.id)

export function useLayoutPresets() {
  function getPresetById(id: string | LayoutPresetId) {
    return layoutPresetCatalog.find((preset) => preset.id === id) ?? null
  }

  return {
    presets: layoutPresetCatalog,
    presetIds: layoutPresetIds,
    getPresetById,
  }
}

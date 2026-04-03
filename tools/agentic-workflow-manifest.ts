export interface RemappedTemplateFile {
  source: string
  target: string
}

export const INHERITED_AGENTIC_WORKFLOW_FILES = [
  '.github/aw/actions-lock.json',
  '.github/workflows/provisioned-app-build.md',
  '.github/workflows/pr-guardrails-review.md',
  '.github/workflows/repo-bug-finder.md',
  '.github/workflows/nuxt-consistency-sweep.md',
  '.github/workflows/seo-content-sweep.md',
] as const

export const INHERITED_AGENTIC_WORKFLOW_DIRECTORIES = ['.github/workflows/shared'] as const

export const REMAPPED_INHERITED_AGENTIC_WORKFLOW_FILES = [
  {
    source: 'tools/starter-templates/agentic-workflows/gh-aw-compile.yml',
    target: '.github/workflows/gh-aw-compile.yml',
  },
  {
    source: 'tools/starter-templates/agentic-workflows/provisioned-app-build.lock.yml',
    target: '.github/workflows/provisioned-app-build.lock.yml',
  },
  {
    source: 'tools/starter-templates/agentic-workflows/pr-guardrails-review.lock.yml',
    target: '.github/workflows/pr-guardrails-review.lock.yml',
  },
  {
    source: 'tools/starter-templates/agentic-workflows/repo-bug-finder.lock.yml',
    target: '.github/workflows/repo-bug-finder.lock.yml',
  },
  {
    source: 'tools/starter-templates/agentic-workflows/nuxt-consistency-sweep.lock.yml',
    target: '.github/workflows/nuxt-consistency-sweep.lock.yml',
  },
  {
    source: 'tools/starter-templates/agentic-workflows/seo-content-sweep.lock.yml',
    target: '.github/workflows/seo-content-sweep.lock.yml',
  },
] as const satisfies readonly RemappedTemplateFile[]

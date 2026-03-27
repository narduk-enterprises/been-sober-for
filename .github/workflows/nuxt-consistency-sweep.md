---
name: Nuxt Consistency Sweep
description:
  Remove low-risk Nuxt, Nuxt UI, and Tailwind anti-patterns with one focused
  cleanup PR or issue
on:
  schedule: weekly on tuesday
  workflow_dispatch:
  skip-if-match: 'is:pr is:open in:title "[nuxt-consistency-sweep]"'
permissions:
  actions: read
  contents: read
  issues: read
  pull-requests: read
engine: copilot
inlined-imports: true
resources:
  - shared/narduk-review-baseline.md
  - shared/narduk-nuxt-stack-review.md
  - shared/narduk-ui-consistency-review.md
  - shared/narduk-architecture-security-qa-review.md
imports:
  - shared/narduk-review-baseline.md
  - shared/narduk-nuxt-stack-review.md
  - shared/narduk-ui-consistency-review.md
  - shared/narduk-architecture-security-qa-review.md
tools:
  bash: ['*']
  github:
    toolsets: [default]
network: defaults
safe-outputs:
  create-issue:
    labels: [automation, consistency, refactor]
    max: 1
  create-pull-request:
    title-prefix: '[nuxt-consistency-sweep] '
    labels: [automation, consistency, refactor]
    max: 1
    protected-files: fallback-to-issue
timeout-minutes: 30
source: narduk-enterprises/narduk-nuxt-template/.github/workflows/nuxt-consistency-sweep.md@main
---

# Nuxt Consistency Sweep

Find a small batch of mechanical, low-risk cleanup work that removes stack
anti-patterns without changing product behavior.

## Scope

Focus on authored source files that match the repository's Nuxt stack:

- `app/`, `components/`, `composables/`, `server/`, `content/`, `modules/`
- `nuxt.config.*`, `app.config.*`, `content.config.*`, and shared CSS/theme
  files

## Cleanup targets

Prefer cleanup batches like these:

- raw top-level `$fetch()` in page `script setup`
- SSR-unsafe `window`, `document`, or storage access in render paths
- module-scope reactive state leaks
- internal links rendered without `NuxtLink`
- duplicated or ad hoc Nuxt UI patterns when a repository standard exists
- raw color values or theme drift where semantic tokens are clearly expected
- obvious, repo-specific legacy patterns that are now documented as deprecated

Do not attempt large refactors, copy rewrites, or architecture reshuffles from
this workflow.

## Decision rule

1. If you find a surgical cleanup batch touching roughly 1-5 files and you can
   validate it credibly, create one PR.
2. If the cleanup is valuable but too broad, risky, or validation is incomplete,
   create one issue instead.
3. If nothing high-value is found, exit silently.

## Validation

- Prefer targeted validation such as repo-standard lint, typecheck, or focused
  test commands.
- If the repo needs credentials or packages that are unavailable in the run
  environment, fall back to an issue rather than forcing a PR through weak
  validation.

## Output policy

- Keep PRs narrowly scoped and reversible.
- In the PR body or issue body, explain:
  - what anti-patterns were removed
  - which files were affected
  - which validation commands ran

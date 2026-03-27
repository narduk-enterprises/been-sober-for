---
name: Repo Bug Finder
description:
  Find one high-confidence bug or risk cluster in the repository and open a
  single actionable issue
on:
  schedule: daily on weekdays
  workflow_dispatch:
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
  - shared/narduk-seo-content-review.md
  - shared/narduk-architecture-security-qa-review.md
imports:
  - shared/narduk-review-baseline.md
  - shared/narduk-nuxt-stack-review.md
  - shared/narduk-ui-consistency-review.md
  - shared/narduk-seo-content-review.md
  - shared/narduk-architecture-security-qa-review.md
tools:
  bash: ['*']
  github:
    toolsets: [default]
network: defaults
safe-outputs:
  create-issue:
    labels: [automation, bug-hunt, code-review]
    max: 1
timeout-minutes: 25
source: narduk-enterprises/narduk-nuxt-template/.github/workflows/repo-bug-finder.md@main
---

# Repo Bug Finder

Find one high-confidence problem worth a maintainer's attention. Prefer a real
bug, risky anti-pattern cluster, or a concrete security/testability defect over
broad "tech debt" commentary.

## Investigation flow

1. Inspect recent activity first:
   - merged pull requests and commits from the last 7 days
   - recently touched app routes, server handlers, composables, config files,
     content collections, and tests
2. If recent activity is too quiet to yield a strong result, inspect the
   repository's highest-risk surfaces:
   - `server/`, `app/pages/`, `app/composables/`, auth flows, route middleware,
     `nuxt.config.*`, `content.config.*`, `modules/`, and CI/workflow files
3. Use the imported review packs to evaluate only the areas that actually exist
   in the repository.

## What counts as a good finding

Good findings usually have one or more of these traits:

- user-visible bug or likely regression
- missing validation or auth protection
- Workers-runtime incompatibility
- hydration or SSR/client mismatch risk
- architecture drift that is already creating duplicate logic or broken
  ownership
- important behavior change with weak or missing tests

## Duplicate control

Before creating an issue, search open issues and recent closed issues for the
same root cause. If the problem is already captured, exit silently unless you
can add materially new evidence.

## Output policy

- Open at most one issue.
- If you cannot find a high-confidence issue, exit silently.
- Title format: `[repo-bug-finder] <concise problem summary>`
- The issue body must include:
  - `Summary`
  - `Evidence`
  - `Impact`
  - `Suggested Fix`
  - `Validation`
- Keep the write-up concise, concrete, and ranked by severity.

Do not create a pull request from this workflow.

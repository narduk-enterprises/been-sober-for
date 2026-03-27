---
name: SEO Content Sweep
description:
  Audit important pages and content collections for SEO, schema, and metadata
  gaps, then open one focused issue
on:
  schedule: weekly on thursday
  workflow_dispatch:
permissions:
  contents: read
  issues: read
  pull-requests: read
engine: copilot
inlined-imports: true
resources:
  - shared/narduk-review-baseline.md
  - shared/narduk-nuxt-stack-review.md
  - shared/narduk-seo-content-review.md
imports:
  - shared/narduk-review-baseline.md
  - shared/narduk-nuxt-stack-review.md
  - shared/narduk-seo-content-review.md
tools:
  bash: ['*']
  github:
    toolsets: [default]
network: defaults
safe-outputs:
  create-issue:
    labels: [automation, content, seo]
    max: 1
timeout-minutes: 20
source: narduk-enterprises/narduk-nuxt-template/.github/workflows/seo-content-sweep.md@main
---

# SEO Content Sweep

Audit the repository's most important user-facing pages and content surfaces for
missing or broken SEO foundations. Your goal is one focused issue, not a
complete marketing rewrite.

## Investigation flow

1. Start with pages or content files touched in the last 14 days.
2. If recent changes are sparse, inspect the most important entry points such as
   the home page, route roots, landing pages, docs or blog indexes, and the
   content collection configuration.
3. Apply the imported SEO and content guidance only where the repository
   actually uses those systems.

## Findings to prefer

Prefer issues such as:

- missing `useSeo(...)` or schema helpers on important pages
- empty, duplicate, or clearly misleading titles and descriptions
- broken site config foundations that undermine canonical, sitemap, or OG output
- content collections or frontmatter that are wired incorrectly for the repo's
  SEO conventions
- high-value pages that skip the shared SEO pipeline even though the repo
  standard expects it

## Metadata optimization rule

Use metadata optimization suggestions only when the page intent is explicit in
the existing content. Suggest tighter titles and descriptions, but do not invent
new claims, change meaning, or produce generic keyword stuffing.

## Output policy

- Search existing issues before creating a new one.
- If there is no meaningful SEO/content gap, exit silently.
- Open at most one issue.
- Title format: `[seo-content-sweep] <concise problem summary>`
- The issue body must include:
  - `Summary`
  - `Affected Pages Or Collections`
  - `Why It Matters`
  - `Suggested Fix`
  - `Example Metadata` when a concrete title/description recommendation is
    justified

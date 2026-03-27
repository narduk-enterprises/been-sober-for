---
name: PR Guardrails Review
description:
  Review pull requests for Nuxt, UI, SEO, security, and testing regressions with
  a high-signal findings summary
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
permissions:
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
  add-comment:
    max: 1
timeout-minutes: 20
source: narduk-enterprises/narduk-nuxt-template/.github/workflows/pr-guardrails-review.md@main
---

# PR Guardrails Review

Review the pull request as a senior repository maintainer. Your job is not to
rewrite the PR or produce style commentary. Your job is to identify the most
important regressions, anti-patterns, consistency breaks, and validation gaps.

## Scope

1. Work from the PR diff first. Collect the changed files, affected symbols, and
   any directly adjacent files you need for context.
2. Skip pure docs, snapshot, or lockfile churn unless the change affects runtime
   behavior or indicates a real workflow/configuration defect.
3. Apply only the imported review packs that are relevant to the files touched
   by the PR.

## Review priorities

Prioritize, in order:

1. Bugs and regressions in runtime behavior
2. Security or validation mistakes
3. SSR, hydration, routing, or Workers-runtime hazards
4. Architecture drift or duplicated patterns that will likely regress
5. Missing tests for newly risky behavior

Avoid low-value nits about naming, formatting, or subjective style unless they
directly reinforce a documented repository standard.

## Validation

- Use GitHub diff and repository context as the primary source of truth.
- Use `bash` for targeted evidence gathering with commands like `rg`, `sed`,
  `git diff`, or focused test commands when they are lightweight and realistic.
- Do not run heavyweight installs just to chase uncertain suspicions. If you
  cannot fully verify a concern, record it as a validation gap rather than a
  confirmed defect.

## Output policy

- If you do not find a material issue, exit silently without commenting.
- If you do find material issues, leave exactly one PR comment.
- Structure the comment with these sections when they have content:
  - `Blocking Risks`
  - `Important Follow-Ups`
  - `Validation Gaps`
- Each bullet must include the affected file or files, the reason it matters,
  and the most direct next action.
- Keep the comment concise and ranked by severity.

Do not open issues or pull requests from this workflow.

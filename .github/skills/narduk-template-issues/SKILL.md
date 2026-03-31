---
name: narduk-template-issues
description: Use when a downstream app uncovers a likely defect, missing
  guidance, or reusable improvement in
  `narduk-enterprises/narduk-nuxt-template`, its shared layer,
  `.template-reference`, or sync tooling. Searches existing GitHub issues with
  `gh`, classifies ownership, and files or updates the upstream template issue
  with a concise reproduction.
---

# Narduk Template Issues

Use this skill when work in a downstream app reveals something that likely
belongs upstream in `narduk-enterprises/narduk-nuxt-template`.

## Scope

Use this for issues in:

- template authoring workspace files
- `layers/narduk-nuxt-layer`
- `.template-reference`
- sync/update tooling
- reusable docs or recipes gaps that will affect multiple apps

Do not use this for one-off product bugs that only belong in the downstream app.

## Workflow

1. Confirm the issue is upstream-owned rather than app-specific.
2. Capture the minimum useful context:
   - affected downstream app names
   - exact routes, commands, or files involved
   - actual behavior
   - expected behavior
   - current workaround or mitigation
   - ownership classification: `authoring workspace`, `layer`,
     `.template-reference`, `sync tooling`, or `docs`
3. Search for existing issues first:
   - `gh issue list --repo narduk-enterprises/narduk-nuxt-template --search "<keywords>"`
4. If a matching issue exists, add context there instead of creating a duplicate.
5. Otherwise create a new issue with `gh issue create --repo
   narduk-enterprises/narduk-nuxt-template ...`.
6. Return the issue URL and a one-line summary of what was filed.

## Issue Shape

Prefer this structure:

- `Summary`
- `Affected downstream app(s)`
- `What is happening`
- `Expected outcome`
- `Current workaround`
- `Classification`

Keep the issue concrete and reproducible. Avoid long narrative.

## Title Guidance

Use short titles that name the reusable problem, for example:

- `Clarify layout ownership for downstream auth and full-bleed routes`
- `Document and standardize first-party session bootstrap for shared auth`
- `Sync template should preserve app-local route metadata`

## Output Requirement

Always include:

- whether you found an existing issue or created a new one
- the final GitHub issue URL

---
name: scraper-new-profile
description: Create or update a scraper site profile for the boat-search workflow. Use when Codex needs to add support for a new marketplace, brokerage site, or listing domain; create a new trusted preset; improve extraction for a site that already half-works; or debug why a new site's CSV output is missing fields, duplicating rows, pulling junk images, or failing to preserve detail data during merge.
---

# Scraper New Profile

Use this skill when adding a new site profile to the boat-search scraper extension. The goal is not just to make selectors pass once. The goal is to produce a durable preset that survives real runs, exports clean CSV data, and does not regress the existing browser-scrape flow.

## Start Here

1. Ground in the current boat-search implementation before changing anything.
2. Collect one search URL, one or two detail URLs, and the field set the user actually cares about.
3. Save representative HTML fixtures before changing selectors. Prefer fixture-backed work over live-only trial and error.
4. Confirm whether the target should be:
   - a trusted preset in `packages/chrome-scraper-extension/src/shared/sitePresets.ts`
   - a generic analyzer improvement in `packages/chrome-scraper-extension/src/content/analyzer.ts`
   - a normalization-only upgrade for an existing preset
5. Prefer stable extraction plus normalization over brittle CSS chains.

## Repo Touchpoints

Read these files first when working in the boat-search repo:

- `packages/chrome-scraper-extension/src/shared/sitePresets.ts`
- `packages/chrome-scraper-extension/src/shared/types.ts`
- `packages/chrome-scraper-extension/src/content/analyzer.ts`
- `packages/chrome-scraper-extension/src/sidepanel/composables/useExtensionSession.ts`
- `packages/chrome-scraper-extension/tests/unit/sitePresets.test.ts`
- `packages/chrome-scraper-extension/tests/fixtures/<site>/`
- `packages/boat-crawler/tests/fixtures/<site>/` when the node crawler already has useful reference pages for the same domain
- `packages/boat-crawler/scripts/capture-trusted-page.mjs` when you need a trusted-Chrome capture flow for a site that blocks plain HTTP fetches
- `packages/boat-crawler/scripts/debug-selectors.mjs` when you need a quick Playwright-based DOM dump while exploring selectors

Use `references/profile-checklist.md` for the intake and acceptance checklist.

## Workflow

### 1. Gather and Store Real Inputs

Capture:

- a representative search/results page
- a representative no-results or edge-state search page when feasible
- at least one representative detail page
- a second detail page when the site mixes brokers, gallery layouts, or detail modules
- expected pagination behavior
- the minimum acceptable field set
- any known anti-bot or auth constraints

Do not design from screenshots alone if the live DOM can be inspected.

Before editing selectors, persist the pages that will anchor the profile:

- save raw HTML fixtures under `packages/chrome-scraper-extension/tests/fixtures/<site>/`
- prefer names such as `search-ok.html`, `search-no-results.html`, `detail-ok.html`, `detail-gallery-noise.html`
- keep the original source URLs in the task notes or test names so fixture provenance is easy to trace
- reuse existing crawler fixtures as secondary references, but do not skip extension fixtures when adding a trusted preset
- when plain HTTP returns a challenge page, capture through Playwright with `packages/boat-crawler/scripts/capture-trusted-page.mjs` or equivalent browser tooling instead of saving the challenge HTML

### 2. Inspect Before Editing

Check:

- what `lastAnalysis.fields` detects automatically
- whether a preset already matches the site
- whether the site is better handled by field rules, normalization, or both
- whether the current failure is really selector drift, merge drift, or CSV/export drift

Important:

- `lastAnalysis.fields` only shows auto-detected suggestions
- the real export schema may be much larger once a trusted preset is applied

### 3. Add the Preset Conservatively

When creating a new trusted preset:

- define search fields for identity and navigation first
- define detail fields for durable, high-signal data only
- keep field selectors broad enough to survive minor layout changes
- avoid selectors that depend on transient index positions unless there is no stable alternative

Always prioritize these fields first:

- `url`
- listing identity
- `title`
- `price`
- `location`
- `images`
- `description`
- `fullText`

If the site exposes richer detail panels, prefer parsing those from normalized detail text instead of adding dozens of brittle DOM selectors.

### 4. Normalize Aggressively

Add site-specific normalization in `sitePresets.ts` when any of these happen:

- titles contain badges, payment text, or merged pricing junk
- locations include broker names or UI chrome
- images include logos, SVG placeholders, ads, avatars, or unrelated media
- the site exposes useful detail sections that are easier to parse from text than from CSS selectors
- search pages provide a stronger truth than detail pages for fields like URL or listing type

Normalization should:

- preserve real listing data
- remove generic marketplace copy
- avoid inventing values when the site does not actually expose them
- favor search-derived identity fields when detail pages are noisier

### 5. Protect Merge Behavior

Whenever detail pages are merged back into search records, verify that:

- detail pages do not overwrite the canonical search-result URL
- search-derived listing type is not clobbered by noisy detail text
- merged images are re-normalized after combining arrays
- duplicate identities do not collapse distinct rows incorrectly

If a field is known to be stronger on search pages, preserve the search value during merge.

### 6. Extend the Export Schema Only When It Helps

Add new CSV columns only when the data will be useful and reasonably reliable.

Use this rule:

- top-level listing facts should usually become structured columns
- large detail panels should become structured columns only when the labels are stable
- if a detail block is unstable but valuable, keep it in `fullText` first

When adding structured fields:

- extend `BrowserScrapeRecord` in `shared/types.ts`
- initialize defaults in the content analyzer
- add merge coverage in `useExtensionSession.ts`
- add the columns to CSV export
- add regression tests

### 7. Test at Three Levels

Minimum test coverage:

1. unit tests for preset match/draft/normalization behavior
2. merge and CSV coverage when new structured fields are added
3. one live scrape verification using the extension

At unit level, cover:

- preset matching
- fixture-backed draft generation from stored search HTML
- normalized titles/locations
- image filtering
- row identity preservation
- listing type preservation
- any new structured field parsing

### 8. Validate Before Reporting Done

For the extension package, run:

```bash
pnpm --filter chrome-scraper-extension run test:unit
pnpm --filter chrome-scraper-extension run typecheck
pnpm --filter chrome-scraper-extension run lint
pnpm --filter chrome-scraper-extension run build
```

Do not report the profile as done until these pass.

### 9. Verify the Real Output

After the build, verify the actual downloaded CSV or persisted output. Check:

- row count matches the search page
- URLs are unique when they should be unique
- images contain real listing photos, not logos or placeholders
- key scalar fields are clean
- new structured fields are populated only when the site exposes them
- warnings are empty or explain real gaps

If Boat Search auth fails and the extension falls back to local CSV, validate the CSV anyway. That fallback is still the truth for extraction quality.

## Default Output Shape

Use this shape when working the request:

```md
## Snapshot
- Site:
- Search URL:
- Detail URL:
- Requested fields:
- Primary failure:

## Plan
- ...

## Changes
- ...

## Validation
- test:unit:
- typecheck:
- lint:
- build:

## Live Verification
- row count:
- unique URLs:
- image quality:
- missing fields:
```

## Common Failure Modes

- live DOM inspection looked good, but no representative fixture was stored so regressions became invisible
- auto-analysis looks fine, but the runtime scrape is still using stale draft selectors
- detail pages overwrite stronger search-page values
- image arrays are normalized before merge but not after merge
- a bogus detail URL collapses all rows into one identity
- `fullText` contains the right data, but the CSV header list never exports the new columns
- a field looks present on one sample page but is not stable across brokers or listing layouts

## Guardrails

- make the smallest site-specific change that solves the real extraction problem
- do not rework the generic analyzer unless multiple sites benefit
- do not trust a selector just because it worked on one broker page
- prefer deterministic normalization over clever but fragile DOM traversal
- keep the preset readable; do not hide the logic in giant regex blobs if a helper function is clearer

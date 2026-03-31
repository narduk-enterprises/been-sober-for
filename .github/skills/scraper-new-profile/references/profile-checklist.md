# Scraper Profile Checklist

Use this checklist when creating or debugging a new site profile in boat-search.

## Intake

- What domain is being added?
- What is the canonical search URL?
- What is one canonical detail URL?
- Which real pages will be stored as fixtures for this profile?
- Which fields are mandatory?
- Which fields are nice-to-have?
- Does the site require login, geo, or anti-bot handling?
- Should the profile support browser CSV fallback cleanly?

## Minimum Acceptable Extraction

- one row per listing
- canonical listing URL
- stable listing identity
- clean title
- clean price
- clean location
- real gallery images only
- meaningful description or `fullText`

## Escalate to Structured Fields When

- the labels are stable across listings
- the values are repeated enough to justify columns
- the site exposes a real details/specifications panel
- users need to filter or search these values later

## Keep in `fullText` First When

- the section layout varies by broker
- labels appear inconsistently
- the data is sparse or marketing-heavy
- the extraction would require brittle nth-child selectors

## File Map

- `packages/chrome-scraper-extension/src/shared/sitePresets.ts`
  - preset matching
  - preset field rules
  - site-specific normalization
- `packages/chrome-scraper-extension/src/shared/types.ts`
  - exported record shape
- `packages/chrome-scraper-extension/src/content/analyzer.ts`
  - generic extraction and record assignment
- `packages/chrome-scraper-extension/src/sidepanel/composables/useExtensionSession.ts`
  - merge behavior
  - runtime preset override
  - CSV export
- `packages/chrome-scraper-extension/tests/fixtures/<site>/`
  - saved search/detail HTML used to keep the preset grounded in real DOM examples
- `packages/boat-crawler/tests/fixtures/<site>/`
  - optional secondary references when an existing crawler already captures the same site
- `packages/chrome-scraper-extension/tests/unit/sitePresets.test.ts`
  - regression coverage

## Acceptance

- representative fixtures are stored for the new profile
- preset applies on the intended site
- browser scrape uses the trusted preset when matched
- row count matches the page
- duplicate listings do not collapse incorrectly
- images are valid listing photos
- CSV exports every intended structured column
- validation commands pass

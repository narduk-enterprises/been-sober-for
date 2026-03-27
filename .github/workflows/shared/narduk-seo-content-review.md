<!-- SEO and content guidance derived from the repo skill set. -->

# SEO and Content Review

Apply this guidance when the repo contains pages, content collections, OG image
utilities, or `@nuxtjs/seo` / `@nuxt/content` usage.

## SEO checks

- Every user-facing page should follow the repo's SEO baseline. Flag missing
  `useSeo(...)`, missing schema helpers, broken canonical handling, or missing
  site configuration foundations when the repo standard requires them.
- Check OG image, sitemap, robots, and schema-org patterns when the repository
  advertises those capabilities. Focus on broken coverage, not minor wording
  preferences.
- Use metadata optimization conservatively. Suggest improved titles and
  descriptions only when the page intent is already clear from the content. Do
  not invent claims, promises, or brand positioning that the page does not
  already support.

## Nuxt Content checks

- When `content.config.*` or collection definitions exist, flag obviously broken
  collection schemas, missing frontmatter the templates rely on, or query
  patterns that will return empty or mismatched content.
- If the repo uses SEO-aware content collections, check that newly added content
  is wired into the expected sitemap/schema/meta conventions.

## What to report

Report only issues that materially affect discoverability, content correctness,
or consistency, such as:

- missing or broken page metadata
- absent schema/OG coverage on important pages
- content collection wiring mistakes
- duplicate, empty, or misleading titles/descriptions

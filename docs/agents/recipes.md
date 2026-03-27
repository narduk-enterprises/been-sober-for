# Recipes

Use these recipes when the project needs a specific capability. They are
references, not mandatory reads for every task.

## Testing

For the shared Playwright model and extension rules, start with
`docs/e2e-testing.md`.

High-level expectations:

- write unit tests for business logic, parsers, formatters, and composables
- add E2E coverage for critical user flows
- keep tests runnable against local dev servers and deployed environments when
  practical

## Authentication

Use this when the app needs accounts, login, and protected routes.

Checklist:

1. Re-export the layer schema in `apps/web/server/database/schema.ts`.
2. Add app-owned tables in `apps/web/server/database/app-schema.ts`.
3. Create `apps/web/server/utils/database.ts` with `useAppDatabase(event)`.
4. Use Web Crypto PBKDF2 helpers, not Node `crypto` or `bcrypt`.
5. Add auth API routes, auth composables, and route middleware.

Important constraint:

- Do not name the app helper `useDatabase`. That collides with the layer import.

## Analytics

The layer already wires PostHog, GA4, IndexNow, and Google indexing helpers.

Guidelines:

- Use `usePosthog().capture(...)` for custom events.
- Keep event names stable and lowercase, for example `snake_case`.
- Do not use email as `distinct_id`.
- Reuse event names across apps and segment with the shared `app` property.
- Do not fork `posthog.client.ts` unless you preserve SPA pageviews and identity
  rules.

## Content And Blog

Nuxt Content v3 is already available.

Typical flow:

1. Add markdown files under `content/`.
2. Create app pages and layouts under `app/pages/` and `app/layouts/`.
3. Query content with `queryCollection(...)` inside `useAsyncData`.
4. Render with `<ContentRenderer />`.

On Cloudflare Workers, Nuxt Content uses D1-backed storage, so the `DB` binding
must exist in `wrangler.json`.

## Linting And Code Quality

The workspace uses a two-file ESLint model for the main app:

| File                            | Purpose                                        |
| ------------------------------- | ---------------------------------------------- |
| `apps/web/eslint.config.mjs`    | Canonical synced config. Do not edit directly. |
| `apps/web/eslint.overrides.mjs` | App-specific overrides that are never synced.  |

Use `eslint.overrides.mjs` only for justified, narrow exceptions. The normal
path is to fix the code instead of disabling rules.

## UI Components

Reference UI patterns live in the companion `narduk-nuxt-template-examples`
repository and in the shared layer itself.

Use them as source material for:

- heroes
- pricing sections
- testimonials
- dashboards
- layout chrome

If a pattern is reusable for every downstream app, move it into the layer
instead of copying it repeatedly.

## Form Handling

Preferred pattern:

1. Use `<UForm :schema :state>` with Zod.
2. Wrap inputs with `<UFormField>`.
3. Use shared layout utility classes and Nuxt UI primitives.
4. Keep form logic in composables where possible.

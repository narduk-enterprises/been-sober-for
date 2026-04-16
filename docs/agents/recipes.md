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

1. Re-export the bundle schema in `apps/web/server/database/schema.ts`.
2. Add app-owned tables in `apps/web/server/database/app-schema.ts`.
3. If the app runs on Postgres, mirror those tables in
   `apps/web/server/database/pg-app-schema.ts`.
4. Create `apps/web/server/utils/database.ts` with `useAppDatabase(event)`.
5. Use Web Crypto PBKDF2 helpers, not Node `crypto` or `bcrypt`.
6. Add auth API routes, auth composables, and route middleware.

Important constraint:

- Do not name the app helper `useDatabase`. That collides with the bundle
  import.

## Managed Supabase Preset

Use this when the app should keep first-party template sessions but use hosted
Supabase for auth/data/storage.

## Analytics

Use `usePosthog().capture(...)` for custom events.

## Content And Blog

Nuxt Content v3 is already available.

Typical flow:

1. Add markdown files under `content/`.
2. Create app pages and layouts under `app/pages/` and `app/layouts/`.
3. Query content with `queryCollection(...)` inside `useAsyncData`.
4. Render with `<ContentRenderer />`.

## Scheduled Tasks And Cron

Use this when the app needs background ingestion, cache warming, content
generation, or periodic maintenance on Cloudflare Workers.

Recommended shape:

1. `apps/web/wrangler.json` owns the external cron schedule.
2. `apps/web/nuxt.config.ts` maps the schedule to Nitro `scheduledTasks`.
3. `apps/web/server/tasks/*` handles the Nitro task entrypoint.
4. `apps/web/server/utils/*` owns the shared business logic.
5. `apps/web/server/api/cron/*.post.ts` is optional and exists only when the
   same automation also needs a manual or external trigger.

Use `defineCronMutation` for `/api/cron/*` routes so cron auth, CSRF exemptions,
and mutation handling stay aligned with the shared layer.

Default rules:

- keep the real work in one shared utility instead of duplicating logic across
  scheduled tasks and HTTP routes
- check required env vars and bindings at the edge of the task before doing real
  work
- log start, success, and failure with enough context to tell scheduled runs
  from manual triggers
- design the task to be idempotent when possible
- do not self-fetch the same Worker origin when the Nitro task can call the
  shared server utility directly

Expose a manual `/api/cron/*` route only when an operator, webhook, or external
system needs to run the same job on demand. If the work is purely internal to
the scheduled task, keep it inside `server/tasks/*` plus the shared utility.

Example layout:

- `apps/web/wrangler.json`
- `apps/web/nuxt.config.ts`
- `apps/web/server/tasks/sync/observations.ts`
- `apps/web/server/utils/syncObservations.ts`
- `apps/web/server/api/cron/sync-observations.post.ts`

## Linting And Code Quality

Use `apps/web/eslint.config.mjs` as the canonical synced config. App-specific
overrides stay in `apps/web/eslint.overrides.mjs`.

## Forward-Sync Styling Drift

When a template forward exposes styling drift, use this order:

1. Move active product UI toward semantic tokens and bundle patterns first.
2. Keep layout cleanup consistent with explicit grid or flex shells, stable
   gaps, and `min-w-0` on shrinking columns.
3. Escalate to `tailwind-design-system`, `tailwind-theme-builder`, and
   `tailwindcss-advanced-layouts` before inventing a new local design system.

Typical fixes:

- `text-neutral-600` to `text-muted`
- `bg-white` to `bg-default`
- `border-neutral-200` to `border-default`
- fragile wrapper stacks to one explicit responsive shell such as
  `grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]`

Use `apps/web/eslint.overrides.mjs` only for narrow, migration-safe exceptions,
such as an intentionally preserved archive-style page that should keep
historical styling for now.

Good exception rules:

- scope to the smallest file glob possible
- disable only the exact styling rule you are deferring
- leave a short note explaining why the surface is intentionally preserved
- plan to remove the exception when that legacy surface is redesigned

Avoid exceptions when the surface is current product UI, starter-owned shell, or
a reusable component that other pages will inherit.

Example shape:

```js
export default [
  {
    files: ['app/pages/archive/**/*.vue'],
    rules: {
      // 'exact-style-rule': 'off',
    },
  },
]
```

## UI Components

Build on the bundle-provided UI patterns instead of recreating them locally.

## Form Handling

Preferred pattern:

1. Use `<UForm :schema :state>` with Zod.
2. Wrap inputs with `<UFormField>`.
3. Use shared layout utility classes and Nuxt UI primitives.
4. Keep form logic in composables where possible.

# Workspace Guide

## Repository Identity

This repository is a downstream app generated from `narduk-nuxt-template`. Treat
`apps/web/` as the shipped product surface and the rest of the workspace as
shared infrastructure that supports it.

The generated starter keeps:

- `apps/web/` as the main application
- `layers/narduk-nuxt-layer/` as the shared Nuxt layer
- `packages/eslint-config/` as the shared ESLint package
- `tools/` as local Node.js automation
- `scripts/` as shell helpers such as `dev-kill.sh`

This repo does not include the template authoring workspace's `apps/showcase/`.

## Glossary

| Term          | Meaning                                                                         |
| ------------- | ------------------------------------------------------------------------------- |
| Layer         | Shared Nuxt layer in `layers/narduk-nuxt-layer/` consumed by apps via `extends` |
| Package       | Workspace package such as `packages/eslint-config/`                             |
| Isolate       | Cloudflare Worker V8 isolate with no shared in-memory state across requests     |
| Per-isolate   | State that exists only inside one Worker isolate instance                       |
| Hub project   | Doppler project that owns shared infrastructure or analytics secrets            |
| Spoke project | Doppler project for a single app that references hub secrets                    |

## Where Code Goes

| Area                        | Use it for                          | Avoid                     |
| --------------------------- | ----------------------------------- | ------------------------- |
| `apps/web/`                 | Product-specific app work           | Rebuilding layer features |
| `layers/narduk-nuxt-layer/` | Reusable functionality for all apps | One-off app behavior      |
| `packages/eslint-config/`   | Shared lint rules and plugins       | App-only lint overrides   |
| `tools/`                    | Local or CI automation in Node.js   | Edge runtime code         |
| `scripts/`                  | Shell convenience scripts           | TypeScript automation     |

## Layer Inventory

Before adding a new file in `apps/web/`, check whether the layer already
provides it.

| Category      | Provided by layer                                                       |
| ------------- | ----------------------------------------------------------------------- |
| Modules       | `@nuxt/ui`, `@nuxt/fonts`, `@nuxt/image`, `@nuxtjs/seo`, `@nuxt/eslint` |
| App shell     | `app/app.vue`, `app/app.config.ts`, branded `app/error.vue`             |
| SEO           | `useSeo`, `useSchemaOrg`, OG image components                           |
| UI helpers    | `AppTabs`, `usePersistentTab`, base CSS utilities                       |
| Analytics     | `gtag.client.ts`, `posthog.client.ts`, `usePosthog`                     |
| Security      | CORS, CSRF, security headers, per-isolate rate limiter                  |
| Data and auth | D1 helpers, Drizzle schema, auth helpers, KV and R2 helpers             |
| Server routes | `/api/health`, IndexNow routes, admin GA and GSC routes                 |

If the feature belongs in every downstream app, add it to the layer. If it
belongs only to this application, keep it in `apps/web/`.

## Updating Template Infrastructure

Use a local checkout of `narduk-nuxt-template` as the source of truth.

Layer-only sync:

```bash
pnpm run update-layer -- --from ~/new-code/narduk-nuxt-template
```

Full managed template sync:

```bash
pnpm run sync-template -- --from ~/new-code/narduk-nuxt-template
```

If you keep the template checkout at `~/new-code/narduk-nuxt-template`, the
`--from` flag can be omitted.

What the sync flow does:

1. Uses the local template checkout as the source of truth.
2. Copies managed files into the downstream app.
3. Rewrites the vendored layer `repository.url` to match the downstream app.
4. Applies canonical pnpm config.
5. Runs `pnpm install`.
6. Leaves any repo skill management to the app owner. `.github/skills` is no
   longer part of template sync.

## Build Pipeline

The workspace uses Turborepo for orchestration.

```text
quality <- lint + typecheck
lint    <- build:plugins
build   <- ^build
deploy  <- build
```

Common commands:

- `pnpm run dev`
- `pnpm run quality`
- `pnpm test:e2e`
- `pnpm run build:plugins`
- `pnpm run sync-template -- --from ~/new-code/narduk-nuxt-template`
- `pnpm run update-layer -- --from ~/new-code/narduk-nuxt-template`

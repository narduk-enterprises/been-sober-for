# AGENTS.md

Use this file as the entry point for agent work in this repository.

## Repository Identity

- This checkout is a downstream app created from `narduk-template`.
- The main shipped application lives in `apps/web/`.
- The app depends on a published Narduk bundle package — do not recreate what
  the bundle already provides.

## Where Changes Belong

| Change type                       | Preferred location                      |
| --------------------------------- | --------------------------------------- |
| App-specific product work         | `apps/web/`                             |
| Shared reusable app functionality | Published bundle packages or `apps/web` |
| Shared ESLint rules and plugins   | `apps/web/`                             |
| Starter-managed helper commands   | `package.json` scripts + toolkit        |
| Shell helper scripts              | `scripts/`                              |

Do not recreate bundle-provided composables, plugins, middleware, auth helpers,
rate limiting, OG image building blocks, or base schema files inside `apps/web`
without first checking the workspace guide.

Generated repos should keep deploy mechanics app-local. Use the repo's own
`build`, `deploy`, and `db:migrate` scripts and let platform automation own
rollout orchestration instead of reintroducing template-only fleet helpers.

## Non-Negotiable Rules

- Cloudflare Workers constraints apply to deployed server code: no Node.js
  built-ins, Web Crypto only, Drizzle ORM only, and no per-request shared
  mutable state.
- All mutation routes must use the shared mutation wrappers from
  `#layer/server/utils/mutation`.
- Validate mutation bodies with `withValidatedBody(...)` or
  `withOptionalValidatedBody(...)`. Do not read unvalidated bodies directly.
- In `server/`, use the `#server/` alias instead of long relative imports.
- Public, indexable SSR pages in apps that extend the optional SEO layer must
  call `useSeo(...)` and a Schema.org helper such as `useWebPageSchema(...)`.
  Internal-only tools, authenticated surfaces, and SPA-only apps can omit the
  SEO layer and use `useSeoMeta(...)` / `useHead(...)` instead.
- In page `script setup`, use composables plus `useAsyncData` or `useFetch`. Do
  not use raw `$fetch`.
- If the app extends the database schema, create and use `useAppDatabase(event)`
  in `apps/web/server/utils/database.ts`. Do not shadow the layer's
  `useDatabase`.
- Zero warnings is policy. Do not hide problems with `eslint-disable`,
  `@ts-ignore`, or similar suppressions unless the exception is explicitly
  tracked and justified.

## Scoped Agent Docs

Before changing files, prefer the closest scoped `AGENTS.md`. Template-synced
baselines live in `.template-reference/` — compare your working copy against
them to see local customizations.

| Area               | Working copy         | Synced baseline                          |
| ------------------ | -------------------- | ---------------------------------------- |
| Main app           | `apps/web/AGENTS.md` | `.template-reference/apps/web/AGENTS.md` |
| Automation scripts | starter toolkit docs | shared starter toolkit package           |

## Quality Commands

- Main app quality: `pnpm --filter web run quality`
- Full workspace quality: `pnpm run quality`
- Verify local D1 setup: `pnpm --filter web run db:verify`

## Reference Handbook

Open only the docs relevant to the task:

- `docs/agents/README.md` — handbook index
- `docs/agents/workspace.md` — repo layout, layer inventory, starter export and
  fleet sync
- `docs/agents/engineering.md` — hard constraints, security, lint rules, SEO,
  design tokens, and architecture patterns
- `docs/agents/operations.md` — setup, provisioning, deploys, Doppler secrets,
  and agent admin API access
- `docs/agents/recipes.md` — testing, auth, analytics, content, linting, UI, and
  form-handling recipes
- `docs/e2e-testing.md` — shared Playwright baseline and extension model

## Template Sync

This file is starter-managed. Downstream repos should not carry copied root
`tools/` files or local `sync-template`/`check-sync-health`/guardrail helpers.
Starter-managed helper commands should resolve through the published
`@narduk-enterprises/narduk-starter-toolkit` dependency instead of copied
`packages/starter-toolkit/` source files.

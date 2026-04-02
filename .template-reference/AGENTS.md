# AGENTS.md - Workspace Root

Use this file as the entry point for agent work in this repository.

## Repository Identity

- This checkout is a downstream app created from `narduk-nuxt-template`.
- The main shipped application lives in `apps/web/`.
- The starter export depends on a published Narduk bundle package.

## Where Changes Belong

| Change type                               | Preferred location                      |
| ----------------------------------------- | --------------------------------------- |
| App-specific product work                 | `apps/web/`                             |
| Shared reusable app functionality         | Published bundle packages or `apps/web` |
| Shared ESLint rules and plugins           | `packages/eslint-config/`               |
| Local Node.js automation and sync tooling | `tools/`                                |
| Shell helper scripts                      | `scripts/`                              |

Do not recreate bundle-provided composables, plugins, middleware, auth helpers,
rate limiting, OG image building blocks, or base schema files inside `apps/web`
without first checking the workspace guide.

## Quality Commands

- Main app quality: `pnpm --filter web run quality`
- Verify local D1 setup: `pnpm --filter web run db:verify`
- Rebuild shared ESLint plugins after plugin changes: `pnpm run build:plugins`

## Reference Handbook

Open only the docs relevant to the task:

- `docs/agents/README.md`
- `docs/agents/workspace.md`
- `docs/agents/engineering.md`
- `docs/agents/operations.md`
- `docs/agents/recipes.md`
- `docs/e2e-testing.md`

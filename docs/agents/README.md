# Agent Handbook

This folder holds the long-form guidance for downstream apps generated from
`narduk-nuxt-template`.

Use the root `AGENTS.md` for the non-negotiable rules, then open only the
handbook file that matches the work you are doing.

## Handbook Map

- `workspace.md` - repo structure, where code goes, layer inventory, and sync
  flows
- `engineering.md` - Cloudflare constraints, security defaults, Nuxt UI rules,
  lint guidance, design tokens, SEO, and architecture patterns
- `operations.md` - setup, deployment, migrations, Doppler, and agent admin API
  access
- `recipes.md` - opt-in implementation recipes for testing, auth, analytics,
  content, linting, UI, and forms
- `../e2e-testing.md` - shared Playwright baseline, fixtures, and extension
  guidance

## Scoped AGENTS

Before changing files, prefer the closest scoped `AGENTS.md`:

- `apps/web/AGENTS.md`
- `layers/narduk-nuxt-layer/AGENTS.md`
- `packages/eslint-config/AGENTS.md`
- `tools/AGENTS.md`

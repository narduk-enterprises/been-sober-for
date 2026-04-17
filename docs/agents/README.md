# Agent Handbook

This folder holds the long-form guidance that used to live in the workspace root
`AGENTS.md`.

Use the root `AGENTS.md` for the non-negotiable rules, then open only the
handbook file that matches the work you are doing.

## Handbook Map

- `workspace.md` - monorepo structure, where code goes, layer inventory, layer
  packages, starter export/sync, workflow inventory, and build pipeline
- `engineering.md` - Cloudflare constraints, security defaults, Nuxt UI rules,
  lint guidance, design tokens, SEO, and architecture patterns
- `operations.md` - provisioning, setup, deployment, migrations, Vault, and
  agent admin API access
- `recipes.md` - opt-in implementation recipes for testing, auth, analytics,
  content, linting, UI, and forms
- `layer-auth-maintainer-prompt.md` - copy-paste brief for upstreaming the
  shared Supabase auth contract into the bundled layer packages
- `skills.md` - local-skill to repo-mirror workflow plus installation methods
  (`npx skills add`, `/skill-create`)
- The starter no longer ships a copied root `tools/` tree. Use the shared
  `@narduk-enterprises/narduk-starter-toolkit` dependency through the repo root
  scripts instead.
- `../e2e-testing.md` - shared Playwright baseline, fixtures, and extension
  guidance

## Scoped AGENTS

Before changing files, prefer the closest scoped `AGENTS.md`:

- `apps/web/AGENTS.md`
- `layers/AGENTS.md`

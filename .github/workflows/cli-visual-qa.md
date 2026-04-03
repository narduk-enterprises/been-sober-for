---
on:
  workflow_dispatch:

# Optional: fuzzy schedule (uncomment to enable)
# on:
#   schedule: weekly on monday
#   workflow_dispatch:

permissions:
  contents: read
  issues: read
  pull-requests: read

# Secrets such as COPILOT_GITHUB_TOKEN: GitHub Actions environment `copilot`
# (sync from Doppler `prd_copilot` / `copilot` via `pnpm run sync:copilot-secrets`).
environment: copilot

engine:
  id: copilot
  agent: cli-visual-qa

tools:
  github:
    toolsets: [default]

network: defaults

# Agent job default is 20m; Playwright + install + screenshots needs more headroom.
timeout-minutes: 30

safe-outputs:
  create-issue:
    max: 2
---

# CLI visual QA (Playwright + screenshots + DOM)

You are running in **GitHub Actions** via
[GitHub Agentic Workflows](https://github.github.com/gh-aw/). Follow the
**cli-visual-qa** custom agent (`.github/agents/cli-visual-qa.agent.md`) for
methodology.

## Goal

Manually verify the **Nuxt web app** (`apps/web/`) by driving a browser from the
shell, capturing **screenshots**, inspecting the **DOM / accessibility tree**
where needed, and summarizing **pass/fail** with evidence.

## GitHub Packages (required before `pnpm install`)

The monorepo depends on **`@narduk-enterprises/*`** from `npm.pkg.github.com`.
Root **`.npmrc`** uses **`NODE_AUTH_TOKEN`**.

Doppler uses **`GITHUB_TOKEN_PACKAGES_READ`** (template convention).
**`sync:copilot-secrets`** copies that to GitHub as **`GH_TOKEN_PACKAGES_READ`**
and **`NODE_AUTH_TOKEN`** (same value). In this environment,
**`NODE_AUTH_TOKEN`** should already be set; if not, try:  
`export NODE_AUTH_TOKEN="${NODE_AUTH_TOKEN:-$GH_TOKEN_PACKAGES_READ}"`  
then `pnpm install`.

- **Do not** remove, stub, or rewrite `package.json` / workspace deps to bypass
  private packages.

## Scope this run

1. Install deps if needed: `pnpm install` (prefer `--frozen-lockfile` when the
   lockfile is present), after the token step above.
2. Run **`pnpm test:e2e`** from the repo root (Playwright config starts or
   reuses `pnpm run dev`).
3. For **primary marketing or app routes** from `SPEC.md` / `UI_PLAN.md` (or
   `apps/web/app/` pages if those docs are missing), capture at least **3**
   full-page screenshots under a temp directory, e.g.  
   `pnpm exec playwright screenshot http://localhost:3000/ tmp/qa-home.png --full-page`  
   (ensure the dev server is reachable—reuse the same base URL as
   `playwright.config.ts`, `NUXT_PORT` if set).
4. If any route or assertion fails, capture an extra screenshot at the failure
   state and record **visible error text** from the DOM.

## Evidence and reporting

- In the **workflow summary / final response**, list: commands run, E2E exit
  code, screenshot paths (or describe artifacts), and a short **per-route**
  verdict.
- If there are regressions or flaky behavior, use **safe output**
  **`create-issue`** with title prefix `[cli-visual-qa] `, labels if available
  (`bug` or `testing`), and body containing: repro steps, expected vs actual,
  and which checks failed.
- Do **not** print secrets; do **not** commit screenshots to the repo unless
  explicitly asked in a follow-up task.

## After editing this file

Run **`gh aw compile`** and commit **`cli-visual-qa.lock.yml`**.

Docs: https://github.github.com/gh-aw/

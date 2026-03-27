---
# Trigger - when should this workflow run?
on:
  workflow_dispatch: # Manual trigger

# Alternative triggers (uncomment to use):
# on:
#   issues:
#     types: [opened, reopened]
#   pull_request:
#     types: [opened, synchronize]
#   schedule: daily  # Fuzzy daily schedule (scattered execution time)
#   # schedule: weekly on monday  # Fuzzy weekly schedule

# Permissions - what can this workflow access?
# Write operations (creating issues, PRs, comments, etc.) are handled
# automatically by the safe-outputs job with its own scoped permissions.
permissions:
  contents: read
  issues: read
  pull-requests: read

# AI engine to use for this workflow
engine: copilot

# Tools - GitHub API access via toolsets (context, repos, issues, pull_requests)
tools:
  github:
    toolsets: [default]

# Network access
network: defaults

# Outputs - what APIs and tools can the AI use?
safe-outputs:
  create-issue:
    max: 5
  create-pull-request:
    max: 1
  # actions:
  # activation-comments:
  # add-comment:
  # add-labels:
  # add-reviewer:
  # allowed-github-references:
  # assign-milestone:
  # assign-to-agent:
  # assign-to-user:
  # autofix-code-scanning-alert:
  # call-workflow:
  # close-discussion:
  # close-issue:
  # close-pull-request:
  # concurrency-group:
  # create-agent-session:
  # create-agent-task:
  # create-code-scanning-alert:
  # create-discussion:
  # create-project:
  # create-project-status-update:
  # create-pull-request:
  # create-pull-request-review-comment:
  # dispatch-workflow:
  # dispatch_repository:
  # environment:
  # failure-issue-repo:
  # footer:
  # group-reports:
  # hide-comment:
  # id-token:
  # link-sub-issue:
  # mark-pull-request-as-ready-for-review:
  # max-bot-mentions:
  # mentions:
  # missing-data:
  # missing-tool:
  # noop:
  # push-to-pull-request-branch:
  # remove-labels:
  # reply-to-pull-request-review-comment:
  # report-failure-as-issue:
  # resolve-pull-request-review-thread:
  # scripts:
  # set-issue-type:
  # steps:
  # submit-pull-request-review:
  # threat-detection:
  # unassign-from-user:
  # update-discussion:
  # update-issue:
  # update-project:
  # update-pull-request:
  # update-release:
  # upload-asset:
---

# provisioned-app-build

End-to-end build for a **provisioned** Nuxt + Cloudflare app from this template.
All implementation work happens on branch **`integrate/build`**. Finish with
**one pull request** into **`main`**.

Secrets for install/build (registry, optional Cloudflare) come from the GitHub
Actions **environment `copilot`** — synced from Doppler config **`copilot`** /
**`prd_copilot`** / **`dev_copilot`** via
`pnpm run sync:copilot-secrets -- <doppler-project-slug>` in the template repo.
Never print secret values or commit `.env`.

## Read first

1. Root **`AGENTS.md`**, **`docs/agents/engineering.md`**,
   **`layers/narduk-nuxt-layer/AGENTS.md`**.
2. **`provision.json`** (canonical app name, display name, description, url,
   provisionedAt).
3. **`SPEC.md`** — refine through Author → Critic → Gatekeeper until
   **`Status: LOCKED v1`** (max 3 rounds per pass). Required sections: product;
   in/out scope; user flows; conceptual data model (no SQL); pages/routes;
   non-functional; **test acceptance (MVP)** bullets; open questions empty at
   lock.
4. Do **not** implement persistence or API handlers until SPEC is locked.

## Phase order (sequential on `integrate/build`)

1. **UI_PLAN.md** — lock with **`Status: LOCKED v1`**: sitemap, per-route
   layout/components, loading/empty/error. Align with SPEC only.
2. **CONTRACT.md** — lock: endpoints, request/response fields, errors, auth.
   Point to where Zod lives under `apps/web/server/`.
3. **Schema** — Drizzle + `apps/web/drizzle/` migrations; extend app DB via
   `apps/web/server/utils/database.ts`; do **not** shadow layer `useDatabase`.
4. **Server** — Nitro routes per contract; **`#server/`** imports; mutations
   only through layer **`withValidatedBody`** / wrappers in
   `server/utils/mutation.ts`.
5. **UI** — under `apps/web/app/`; **`useFetch` / `useAsyncData`** only (no raw
   `$fetch` in `<script setup>`); every page **`useSeo`** + Schema.org helper.
6. **Integration**
   - Run **`pnpm install`** (prefer **`--frozen-lockfile`**),
     **`pnpm --filter web run build`**, **`pnpm --filter web run quality`**,
     **`pnpm -r --if-present test:unit`**, and add/run
     **`pnpm --filter web test:e2e`** when the environment supports Playwright +
     secrets; if E2E cannot run here, add tests anyway and note that CI will run
     them.
   - Add **screenshots** (PNG/WebP) for each primary route from UI_PLAN under
     **`docs/build-proofs/<yyyy-mm-dd>/`** plus **`README.md`** mapping file →
     URL (no secrets in images; cap ~10).
   - Open **exactly one PR**: **`integrate/build` → `main`**. PR body: locked
     doc versions, migrations, env var **names** for humans (Doppler),
     build/test summary, screenshot index.

## Guardrails

- Cloudflare Workers: no Node built-ins; Web Crypto; stateless handlers; Drizzle
  only.
- No `.env` in repo; no `eslint-disable` / `@ts-ignore` unless a tracked
  exception.
- Feature code stays in **`apps/web/`** unless the change is truly generic for
  all apps (then layer — see layer AGENTS).

## Skills (deep reference when needed)

Repo `.github/skills/`: **nuxt-patterns**, **vue-best-practices**, **nuxt-ui**,
**build-spec**, Cloudflare **workers-best-practices** / **wrangler**,
**playwright**, **code-reviewer**.

## Notes

- After editing this file run **`gh aw compile`** and commit
  **`provisioned-app-build.lock.yml`**.
- Docs: https://github.github.com/gh-aw/

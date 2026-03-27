# Operations Guide

## First Setup

Use this flow in a generated starter:

```bash
pnpm install
pnpm run validate
pnpm run db:migrate
doppler setup --project my-app --config dev
doppler run -- pnpm run dev
```

Bootstrap guard:

- `pnpm dev`, `pnpm build`, and `pnpm ship` are blocked until `.setup-complete`
  exists.
- In provisioned repos, the control plane writes `.setup-complete`. Generated
  local starters should be treated as incomplete until you finish the platform
  setup they depend on.
- Provisioned apps: the control plane must hydrate **`apps/web/wrangler.json`**
  **`kv_namespaces`** for binding **`KV`** (real **`id`** and **`preview_id`**).
  See the root handbook **`docs/agents/operations.md`** (control plane KV).

## Template Updates

Use a local checkout of `narduk-nuxt-template` as the source of truth.

Full managed sync:

```bash
pnpm run sync-template -- --from ~/new-code/narduk-nuxt-template
```

Layer-only sync:

```bash
pnpm run update-layer -- --from ~/new-code/narduk-nuxt-template
```

## Deployment And D1 Migrations

Deployment is local-only. CI may run quality checks, but it does not deploy.

Standard flow:

1. Keep the working tree clean.
2. Run remote D1 migrations if the app uses D1:
   ```bash
   cd apps/web && pnpm run db:migrate -- --remote
   ```
3. Deploy from the repo root:
   ```bash
   pnpm run ship
   ```
4. Push afterward as normal git hygiene.

If `apps/web/wrangler.json` still has the template all-zero Workers KV IDs, you
can repair it locally before deploy:

```bash
pnpm ship -- --repair-only
```

That repair path reuses or creates `<app>-kv` and `<app>-kv-preview`, writes the
real IDs into `apps/web/wrangler.json`, and exits before git push or Wrangler
deploy.

Local development migrations still go through the app entrypoint so shared layer
SQL runs before app-owned SQL.

## Secrets And Environment

Doppler is the single source of truth. Do not create `.env` or `.env.example`
files. Do not commit `doppler.yaml`.

Typical local setup:

```bash
doppler setup --project <app-name> --config dev
doppler run -- pnpm run dev
```

Declare secrets explicitly in `runtimeConfig`:

```ts
runtimeConfig: {
  secretKey: process.env.SECRET_KEY || '',
  public: {
    appUrl: process.env.SITE_URL || '',
  },
}
```

Most keys use their raw names. The intentional Nuxt-prefixed exceptions in this
stack are `NUXT_SESSION_PASSWORD` and `NUXT_PORT`.

Keep `NUXT_SESSION_PASSWORD` stable across deploys. Rotating it invalidates the
sealed auth cookie and forces every user to log in again.

## Hub-And-Spoke Doppler Model

Shared infrastructure and analytics keys live in hub projects. Each app gets a
spoke project with cross-project references plus its own per-app secrets.

Reference syntax:

```text
${<hub-project>.<config>.<KEY>}
```

Important keys:

| Key                        | Owner                |
| -------------------------- | -------------------- |
| `CLOUDFLARE_API_TOKEN`     | Infrastructure hub   |
| `CLOUDFLARE_ACCOUNT_ID`    | Infrastructure hub   |
| `POSTHOG_PUBLIC_KEY`       | Analytics hub        |
| `POSTHOG_PROJECT_ID`       | Analytics hub        |
| `POSTHOG_HOST`             | Analytics hub        |
| `POSTHOG_PERSONAL_API_KEY` | Analytics hub        |
| `SITE_URL`                 | Per-app spoke        |
| `APP_NAME`                 | Per-app spoke        |
| `GA_MEASUREMENT_ID`        | Per-app spoke        |
| `INDEXNOW_KEY`             | Per-app spoke        |
| `AGENT_ADMIN_API_KEY`      | Per-app spoke        |
| `NUXT_PORT`                | Per-app `dev` config |

Important config notes:

- `dev` is the normal local development config.
- `prd` is used for local deploys.
- Deploys fail if `prd` is missing Cloudflare credentials.

## GitHub Copilot agent environment

Coding agents (for example the **provisioned-app-build** workflow) use the
GitHub Actions **environment `copilot`**. Populate it from a **narrow Doppler
config** on this project (often **`prd_copilot`** or **`copilot`**, not all of
`prd`):

```bash
# From a template or tooling checkout with the script (see tools/AGENTS.md)
pnpm run sync:copilot-secrets -- <doppler-project-slug>
```

Doppler `GITHUB_*` keys become **`GH_*`** on GitHub. Document required **names**
in your platform runbook; never commit values.

## Agent Admin API Access

For deployed apps, prefer `SITE_URL` plus `AGENT_ADMIN_API_KEY` over browser
automation for admin APIs.

The token must be the raw `nk_...` key minted by the app, not a random value.

One-time mint and store flow:

1. Login as an existing admin:
   ```bash
   curl -sS "$SITE_URL/api/auth/login" \
     -H "Content-Type: application/json" \
     -H "X-Requested-With: XMLHttpRequest" \
     -c /tmp/<app>.cookies \
     --data '{"email":"<admin-email>","password":"<admin-password>"}'
   ```
2. Mint the API key:
   ```bash
   curl -sS "$SITE_URL/api/auth/api-keys" \
     -X POST \
     -H "Content-Type: application/json" \
     -H "X-Requested-With: XMLHttpRequest" \
     -b /tmp/<app>.cookies \
     --data '{"name":"agents-admin"}'
   ```
3. Store the returned raw key in Doppler:
   ```bash
   doppler secrets set AGENT_ADMIN_API_KEY='<raw nk_... token>' --project <app-name> --config prd
   ```
4. Use it for admin routes:
   ```bash
   curl -sS "$SITE_URL/api/admin/users" \
     -H "Authorization: Bearer $AGENT_ADMIN_API_KEY"
   ```

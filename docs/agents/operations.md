# Operations Guide

## Starting A New Project

Preferred flow:

```bash
curl -X POST https://platform.nard.uk/api/fleet/provision \
  -H "Authorization: Bearer $PROVISION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"my-app","displayName":"My App","description":"Short product blurb for agents.","url":"https://my-app.nard.uk"}'
```

The platform should persist **`description`** into the new repo (for example
**`provision.json`** and the draft **`SPEC.md`**) so GitHub Agentic Workflows
can read it without pasting secrets in chat. Fresh starter repos are created by
the platform and exported from the template workspace; downstream app repos do
not run a local materializer, sync, or guardrail command.

If you need a GitHub repo plus Cloudflare Workers Builds to own build and
deploy, use the platform bootstrap flow. It hydrates the starter, writes
`.setup-complete`, creates the repo, and leaves Cloudflare runtime bindings in
automatic-provisioning form so Workers Builds can create KV, D1, and R2 on the
first deploy.

Generated repo workflow callers:

- `.github/workflows/ci.yml`
- `.github/workflows/bootstrap-starter.yml`
- `.github/workflows/deploy-production.yml`
- `.github/workflows/deploy-staging.yml`

These callers target reusable workflows published from
`narduk-enterprises/narduk-template/.github/workflows/` and are pinned to the
same template SHA recorded in `.template-version` unless the materializer gets
`--workflow-ref=<sha|tag|branch>`.

For the connected Worker, use these Cloudflare Workers Builds settings:

- `root_directory`: `/apps/web`
- `production build_command`:
  `cloudflare.workersBuilds.targets.production.buildCommand`
- `production deploy_command`:
  `cloudflare.workersBuilds.targets.production.deployCommand`
- `staging build_command`:
  `cloudflare.workersBuilds.targets.staging.buildCommand`
- `staging deploy_command`:
  `cloudflare.workersBuilds.targets.staging.deployCommand`
- optional preview build/deploy commands: `cloudflare.workersBuilds.preview.*`
- Build variable: `SKIP_DEPENDENCY_INSTALL=true`
- Build secrets: `NARDUK_PLATFORM_GH_PACKAGES_READ`, `NUXT_SESSION_PASSWORD`,
  `NUXT_OG_IMAGE_SECRET`
- Runtime variables: `SITE_URL`, `STAGING_SITE_URL`, `NUXT_SESSION_PASSWORD`,
  `NUXT_OG_IMAGE_SECRET`

The starter records the same contract in `provision.json` under
`cloudflare.workersBuilds.targets.production|staging` plus
`cloudflare.workersBuilds.preview`. `apps/web/package.json` expects Cloudflare
to skip its default dependency install step so the target-aware `cf:build:*`
commands can configure GitHub Packages auth before running
`pnpm install --frozen-lockfile`.

Workers Builds also requires the Cloudflare account to have an active GitHub
integration. Creating and pushing the GitHub repo is necessary, but it is not
sufficient on its own if Cloudflare has not been authorized against that GitHub
account/org yet.

Required build/runtime variables for a minimal local-auth app:

- `SITE_URL`
- `NUXT_SESSION_PASSWORD`

Optional auth and analytics variables stay the same as the repo-owned deploy
flow. If you leave analytics keys blank, the app still builds; the analytics
features simply stay inactive.

Cloudflare automatic resource provisioning now covers the starter's default
Cloudflare bindings:

- `KV` for the shared key-value binding
- `DB` for the shared D1 binding
- `BUCKET` when the uploads bundle is selected

When these bindings are deployed from Wrangler or Workers Builds without pinned
resource IDs, Cloudflare creates the resources automatically and binds them to
the Worker.

Once provisioned:

```bash
git clone https://github.com/narduk-enterprises/my-app.git ~/new-code/my-app
cd ~/new-code/my-app
pnpm install
pnpm run dev
```

There is no legacy `tools/init.ts` or `.github/workflows/provision-app.yml`
flow. Use the platform provision API or the platform bootstrap flow; do not
resurrect the old authoring-era init path.

Bootstrap guard:

- `pnpm dev`, `pnpm build`, and `pnpm deploy` are blocked until
  `.setup-complete` exists (written when the platform finishes provisioning the
  repo, or present in authoring clones).
- Local quality and local deploy are the source of truth after that.

## Deployment And D1 Migrations

Deployment is local-only unless you intentionally adopt Cloudflare Workers
Builds or the generated repo workflow callers. The authoring workspace on
`narduk-template` does **not** auto-deploy downstream apps on push to `main`; it
only publishes reusable workflows and layer packages. Downstream repos own when
they dispatch `Bootstrap Starter`, `Production Deploy`, or `Staging Deploy`.

Standard flow:

1. Keep the working tree clean.
2. Run remote D1 migrations if the app uses D1:
   ```bash
   doppler run --project <app> --config prd -- pnpm --filter web run db:migrate -- --remote
   ```
3. Deploy the app:
   ```bash
   # Deploy happens automatically on push to main
   ```
4. Push afterward as normal git hygiene.

Fleet-wide deploy, repo repair, and remote orchestration belong to
`platform.nard.uk` or `narduk-cli`, not this template checkout.

Local development migrations still go through the app entrypoint so shared layer
SQL runs before app-owned SQL.

## Managed Supabase Preset

Downstream apps can opt into hosted Supabase without changing the template auth
contract by setting:

```bash
APP_BACKEND_PRESET=managed-supabase
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Compatible legacy names still work:

```bash
AUTH_AUTHORITY_URL
SUPABASE_AUTH_ANON_KEY
SUPABASE_AUTH_SERVICE_ROLE_KEY
```

Guidelines:

- Keep `/api/auth/*`, `useAuth()`, and `useUserSession()` as the public app
  contract.
- Use `#server/utils/supabase` for worker-safe public, user-scoped, and
  service-role clients.
- Use `app/composables/useManagedSupabase.ts` for opt-in browser
  data/RPC/storage access.
- For Postgres-backed apps, set `NUXT_DATABASE_BACKEND=postgres` and keep
  `apps/web/server/database/app-schema.ts` and `pg-app-schema.ts` aligned.
- Apple Sign In still redirects through Supabase first. Your Apple return URL
  remains `https://<project>.supabase.co/auth/v1/callback`, while Supabase URL
  configuration should allow the app callback route such as `/auth/callback`.

## PR Previews On `narduk`

Provisioned repos can opt into the host preview reconciler with the repo-managed
assets that ship from this template:

- root `.dockerignore`
- `deploy/preview/Dockerfile`
- `deploy/preview/docker-compose.yml`

Contract assumptions for the app repo:

- The host manifest points at `deploy/preview/docker-compose.yml`.
- The preview service binds to `127.0.0.1:${PREVIEW_HOST_PORT}` via the compose
  port mapping.
- `SITE_URL` defaults to that same loopback URL when the host does not inject a
  different origin.
- Health checks target `/api/health`, which already ships from the shared layer.

Package registry auth for preview builds uses a BuildKit secret. The token is
not passed as a Docker build arg and is not written into image layers or
committed files.

- Default mode: resolve `NARDUK_PLATFORM_GH_PACKAGES_READ` before local preview
  builds.

GitHub SCM defaults are platform-owned; no self-hosted host or owner override is
needed in app repos.

Existing apps receive the same repo assets through the platform-controlled sync
flow or a fresh starter export. Do not copy the files manually. The remaining
platform step is to add or update the repo manifest in `narduk-infrastructure`.

## Generated Starter Notes

The generated starter already excludes authoring workspace files and other
authoring-only scripts. After setup, the main remaining template tasks are:

- update site metadata and branding in `apps/web/`
- replace the placeholder landing page in `apps/web/app/pages/`
- add app-specific routes, tables, and tests

## Secrets And Environment

Vault is the single source of truth for secrets. Do not create `.env` or
`.env.example` files.

Secrets are resolved by Vault and synced to GitHub repository secrets by the
platform. For local development, secrets are injected via the Vault CLI or set
in `.dev.vars` for Wrangler-based workflows.

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

## Central Secret Organization

Deployed app config lands in Cloudflare as runtime vars/secrets and, when
needed, Workers Builds vars/secrets.

Doppler-managed secrets centralize in exactly two Doppler projects:

- **`narduk/prd`** — shared platform secrets (auth, analytics, Turnstile, AI,
  workflow tokens). These are synced downstream to Cloudflare and GitHub
  targets.
- **`command/prd`** — command operator bootstrap secrets (`COMMAND_*` keys,
  `SITE_URL`, `NUXT_SESSION_PASSWORD`).

No other Doppler projects should be created. Per-app Doppler projects are
eliminated; app-specific runtime values live in Cloudflare directly, while
app-issued `AGENT_ADMIN_API_KEY` values stay in each app database. Generated
secrets such as `NUXT_OG_IMAGE_SECRET` also remain outside Doppler.

Public app-specific analytics/config values such as GA measurement ids, GA
property ids, PostHog browser values, and similar non-secret identifiers should
end up as Cloudflare vars. When migrating an older app and those values are not
yet represented anywhere canonical, recover them from the latest historical
export under `~/iCloud/narduk-platform`, then write them into Cloudflare.

Important keys:

| Key                        | Owner                                                  |
| -------------------------- | ------------------------------------------------------ |
| `CLOUDFLARE_API_TOKEN`     | Infrastructure hub                                     |
| `CLOUDFLARE_ACCOUNT_ID`    | Infrastructure hub                                     |
| `POSTHOG_PERSONAL_API_KEY` | Doppler `narduk/prd`                                   |
| `GSC_SERVICE_ACCOUNT_JSON` | Command bootstrap (`COMMAND_GSC_SERVICE_ACCOUNT_JSON`) |
| `TURNSTILE_SECRET_KEY`     | Doppler `narduk/prd`                                   |
| `SITE_URL`                 | Cloudflare app vars                                    |
| `NUXT_OG_IMAGE_SECRET`     | Cloudflare app runtime secret; Workers Builds secret   |
| `POSTHOG_PUBLIC_KEY`       | Cloudflare app vars                                    |
| `POSTHOG_PROJECT_ID`       | Cloudflare app vars                                    |
| `POSTHOG_HOST`             | Cloudflare app vars                                    |
| `GA_MEASUREMENT_ID`        | Cloudflare app vars                                    |
| `GA_PROPERTY_ID`           | Cloudflare app vars                                    |
| `INDEXNOW_KEY`             | Cloudflare app vars                                    |
| `AGENT_ADMIN_API_KEY`      | App D1 `api_keys` table                                |

Important config notes:

- `command` is the operator hub for shared env syncing into Cloudflare.
- `narduk/prd` is the single central Doppler bucket for shared API keys and
  other secret credentials that are synced to Cloudflare and GitHub.
- Missing public app vars should be fixed at the Cloudflare target, not by
  creating a per-app Doppler project.
- Bootstrap/materialize now writes `provision.json.analytics.env` for
  `GA_MEASUREMENT_ID`, `GA_PROPERTY_ID`, and `GSC_SITE_URL`. It always derives
  the default `GSC_SITE_URL` from `SITE_URL`, and when
  `GOOGLE_SERVICE_ACCOUNT_JSON` or the more specific Google service account env
  vars are available it will attach or create the matching GSC and GA4
  resources. Set `GOOGLE_ANALYTICS_ACCOUNT_ID` when the provisioning account can
  see multiple GA accounts and a new property may need to be created.

## Agent Admin API Access

For deployed apps, prefer `SITE_URL` plus `AGENT_ADMIN_API_KEY` over browser
automation for admin APIs.

The token must be the raw `nk_...` key minted by the app, not a random value.
The canonical record lives in the app's D1 `api_keys` table, not in Doppler.

Preferred mint and store flow:

1. Use the signed-in UI at `/settings/api-keys` to mint a scoped key for the
   current app.
2. Export the raw token temporarily while you verify it, then copy that same
   value into the automation secret store you are bootstrapping. Because only
   the hash is stored in D1, mint a replacement instead of trying to recover an
   old key later:
   ```bash
   export AGENT_ADMIN_API_KEY='<raw nk_... token>'
   ```
3. Verify it before handing it to automation:
   ```bash
   curl -sS "$SITE_URL/api/users" \
     -H "Authorization: Bearer $AGENT_ADMIN_API_KEY"
   ```
4. Use it for the scoped admin routes the automation actually needs:
   ```bash
   curl -sS "$SITE_URL/api/admin/users" \
     -H "Authorization: Bearer $AGENT_ADMIN_API_KEY"
   ```

UI fallback flow:

1. Login as an existing admin, or use the signed-in UI at `/settings/api-keys`
   and choose the operator profile that matches the app:
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
     --data '{
       "name":"agents-admin",
       "scopes":["users:read"],
       "expiresInDays":30
     }'
   ```
3. Export the returned raw key temporarily while you verify it, then copy that
   same value into the automation secret store you are bootstrapping:
   ```bash
   export AGENT_ADMIN_API_KEY='<raw nk_... token>'
   ```
   The raw token is not recoverable from D1 later.

- Use the UI token profile that matches the automation surface instead of
  minting an unscoped long-lived key.
- `command` is special: its registry control plane is driven by platform-owned
  workflows and verifies tokens against `/api/admin/registry/apps`.
- Keep the token scoped only to the routes the agent needs.
- Prefer a 30-day expiry unless the automation truly needs a longer-lived
  credential.
- Rotate by minting a replacement first, updating the automation secret store,
  then revoking the old key from `/settings/api-keys`.

## Template Reusable Workflow Access

Generated starter repos call reusable workflows from the private
`narduk-enterprises/narduk-template` repository.

That template repo must allow reusable workflow access from repositories in the
organization:

1. Open `narduk-enterprises/narduk-template`
2. Go to `Settings -> Actions -> General`
3. Set reusable workflow access to organization repositories

If this is left at `none`, app deploy workflows fail with
`workflow was not found` even when the reusable workflow file exists on `main`.

Older fleet apps can be backfilled from the app UI or through the platform
workflow that manages the repo’s admin credentials.

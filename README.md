# BeenSoberFor

A simple site where users can register, upload a photo, set the date of their
last drink, and share their sobriety progress.

## First Run

```bash
export NARDUK_PLATFORM_GH_PACKAGES_READ=...
pnpm run package-registry:auth && NPM_CONFIG_USERCONFIG="$PWD/.npmrc.auth" NPM_CONFIG_GLOBALCONFIG=/dev/null pnpm install
pnpm run db:migrate
# Local app secrets should come from Doppler
pnpm run dev
```

`pnpm run package-registry:auth` prefers `NARDUK_PLATFORM_GH_PACKAGES_READ` and
falls back to `NARDUK_PLATFORM_GH_PACKAGES_RW` during migration. The generated
`.npmrc.auth` file stays local and gitignored.

## Workspace Shape

- `apps/web/` contains the shipped app.
- `deploy/preview/` contains the repo-managed preview assets.
- `tools/` and `scripts/` contain local automation and helper commands.
- `.template-reference/` contains synced reference baselines for local diffing.

## Template Sync

Use the local sync tools to refresh starter-managed infrastructure from a clean
`narduk-template` checkout:

```bash
pnpm run sync-template -- --from /path/to/narduk-template
```

## Deployment

Cloudflare Workers Builds should use:

- `root_directory`: `/apps/web`
- `build_command`: `pnpm run cf:build:production`
- `deploy_command`: `pnpm run cf:deploy`

For D1 schema changes, run remote migrations before pushing the branch that
should deploy:

```bash
doppler run --project been-sober-for --config prd -- pnpm --filter web run db:migrate -- --remote
```

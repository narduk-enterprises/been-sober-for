# **DISPLAY_NAME**

Starter generated from `narduk-nuxt-template`.

## First Run

```bash
pnpm install
pnpm run validate
pnpm run db:migrate
doppler setup --project been-sober-for --config dev
doppler run -- pnpm run dev
```

## Workspace Shape

- `apps/web/` is the application you ship.
- `layers/narduk-nuxt-layer/` is the shared Nuxt layer.
- `packages/eslint-config/` contains the shared lint plugins.
- `tools/` and `scripts/` contain local automation and helper commands.

## Ongoing Template Updates

Use the local sync tools to pull newer template infrastructure into this app:

```bash
pnpm run sync-template -- --from ~/new-code/narduk-nuxt-template
pnpm run update-layer -- --from ~/new-code/narduk-nuxt-template
```

## Deployment

Deployment is local-only:

```bash
cd apps/web && pnpm run db:migrate -- --remote
cd ../..
pnpm run ship
```

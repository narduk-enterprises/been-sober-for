# Workspace Guide

## Repository Identity

This repository is a downstream app generated from `narduk-template`. Treat
`apps/web/` as the shipped product surface and the rest of the workspace as
shared infrastructure that supports it.

The generated starter keeps:

- `apps/web/` as the main application
- starter-managed helper commands as `package.json` scripts backed by the shared
  starter toolkit
- `scripts/` as shell helpers such as `dev-kill.sh`
- `deploy/preview/` as the repo-managed PR preview surface

## Glossary

| Term        | Meaning                                                                     |
| ----------- | --------------------------------------------------------------------------- |
| Bundle      | Published Narduk layer package selected by the starter export               |
| Isolate     | Cloudflare Worker V8 isolate with no shared in-memory state across requests |
| Per-isolate | State that exists only inside one Worker isolate instance                   |

## Where Code Goes

| Area                   | Use it for                                 | Avoid                      |
| ---------------------- | ------------------------------------------ | -------------------------- |
| `apps/web/`            | Product-specific app work                  | Rebuilding bundle features |
| `deploy/preview/`      | Repo-managed Docker assets for PR previews | Host manifests or secrets  |
| `package.json` scripts | Starter helper commands via the toolkit    | Edge runtime code          |
| `scripts/`             | Shell convenience scripts                  | TypeScript automation      |

## Bundle Inventory

Before adding a new file in `apps/web/`, check whether the selected published
bundle already provides it.

If the feature belongs in every app, it should live in the published bundle
packages. If it belongs only to the current application, keep it in `apps/web/`.

## Repo-Managed PR Preview Assets

Starter export includes the repo-owned preview surface:

- root `.dockerignore`
- `deploy/preview/Dockerfile`
- `deploy/preview/docker-compose.yml`

## Build Pipeline

The monorepo uses Turborepo for orchestration.

```text
quality <- lint + typecheck
build   <- ^build
deploy  <- build
```

Common commands:

- `pnpm run quality`
- `pnpm run dev`

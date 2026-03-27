---
name: narduk-infrastructure
description: Orientation for the /Users/narduk/new-code/narduk-infrastructure repo. Use when working in this repository, answering what infrastructure it contains, or changing host bootstrap, deployment assets, migration runbooks, Caddy snippets, or homelab tooling.
---

# Narduk Infrastructure

This repository is the source of truth for infrastructure that lives on the
`narduk` Linode host and in the private homelab. Treat it as operational
infrastructure: optimize for repeatability, idempotency, and rollback clarity.

## When to use

- Working anywhere under `/Users/narduk/new-code/narduk-infrastructure`
- Figuring out whether a change belongs in `deploy/`, `docs/`, `scripts/`, or
  `homelab/`
- Updating host bootstrap, self-hosted service assets, migration or cutover
  docs, Caddy config, or homelab runbooks
- Answering "what is included in narduk-infrastructure?"

## First reads

- `/Users/narduk/new-code/narduk-infrastructure/AGENTS.md`
- `/Users/narduk/new-code/narduk-infrastructure/README.md`
- `/Users/narduk/new-code/narduk-infrastructure/docs/current-state.md`
- The most relevant runbook under
  `/Users/narduk/new-code/narduk-infrastructure/docs/` or
  `/Users/narduk/new-code/narduk-infrastructure/homelab/docs/runbooks/`

## What the repo includes

### Root infrastructure for the `narduk` host

- `deploy/linode/bootstrap-host.sh`: idempotent bootstrap for packages, runtime
  directories, repo-managed assets under `/opt/narduk`, and service startup
  when secrets are present
- `deploy/caddy/sites/`: repo-managed site snippets for `code.nard.uk`,
  `auth.nard.uk`, `vps.nard.uk`, and `svstellablue.nard.uk`

### Self-hosted services on `narduk`

- `deploy/tx-spends-postgres/`: Docker Compose, PostgreSQL config, `pg_hba`,
  and initdb role creation for the self-managed `tx-spends` database
- `deploy/supabase-auth/`: auth-only Supabase deployment assets plus
  `reconcile-db.sh`
- `deploy/forgejo/`: Forgejo compose assets for `code.nard.uk`
- `deploy/svstellablue-wordpress/`: preview WordPress stack for Stella Blue
- `deploy/runpod/`: Runpod helper docs and setup scripts for remote AI compute

### Root docs and runbooks

- `docs/current-state.md`: current host facts, live services, target
  directories, and operating constraints
- `docs/tx-spends-postgres.md`: Neon to self-managed PostgreSQL migration and
  cutover plan
- `docs/supabase-auth.md`: auth-only Supabase topology, deployment, and
  rollback notes
- `docs/forgejo.md`: Forgejo deployment and operations
- `docs/svstellablue-wordpress.md`: Stella Blue preview environment notes
- `docs/cloudflare-domain-inventory.md` and
  `docs/cloudflare-domain-inventory.json`: exported domain inventory
- `docs/posthog-owner-tagging.md`: PostHog internal-user tagging runbook

### Operator scripts

- `scripts/sync-and-bootstrap-host.sh`: rsync this repo to `narduk` and run the
  bootstrap script remotely
- `scripts/restore-tx-spends-from-neon.sh`: stream the current Neon database
  into the self-managed target
- `scripts/watch-tx-spends-restore.sh`: watch restore progress
- `scripts/export-cloudflare-domain-inventory.sh`: regenerate Cloudflare
  inventory docs and data
- `scripts/tag-posthog-owner-distinct-ids.sh`: apply owner tagging in PostHog

### `homelab/` subtree

- `homelab/docs/runbooks/`: runbooks for Proxmox, Caddy edge, AI lab,
  AI-lab web, OpenClaw, and Mattermost
- `homelab/scripts/`: bootstrap, apply, deploy, and inventory scripts for the
  private lab
- `homelab/deploy/caddy-edge/`: Docker and Caddy assets for the private/public
  edge proxy
- `homelab/apps/ai-lab-web/`: Nuxt UI app for the local AI lab
- `homelab/files/openclaw-shared-memory/` and
  `homelab/files/openclaw-workspace/`: OpenClaw plugin assets, shared-memory
  sync tooling, and bundled workspace material
- `homelab/docs/inventory/`: dated inventory snapshots
- `homelab/README.md`: entry point for homelab-specific workflows

## Repo boundaries

- Root `deploy/`, `docs/`, and `scripts/` are for the Linode host `narduk`.
- `homelab/` is a separate operator subtree for Proxmox and private-lab
  workflows. It is not part of the normal
  `scripts/sync-and-bootstrap-host.sh` flow unless a task explicitly says
  otherwise.
- This repo holds infrastructure code, deployment assets, runbooks, inventory
  snapshots, and operator tooling. It is not a general application monorepo.

## Working rules

- Keep changes small and focused.
- Update the matching doc or runbook when behavior changes.
- Prefer repo-managed automation over one-off manual steps.
- Never commit secrets, `.env` files, dumps, generated certificates, or host
  credentials.
- Preserve idempotency in bootstrap and deploy scripts.
- Prefer
  `[$narduk-tool](/Users/narduk/.agents/skills/narduk-tool/SKILL.md)` for
  secrets lookup, DNS changes, fleet checks, or Worker deploys before falling
  back to ad hoc shell work.

## Validation

- Run `git status --short` before and after work in the repo.
- For shell changes: run `bash -n` and `shellcheck` when available.
- For Markdown changes: run `npx markdownlint-cli "**/*.md"` or target the
  changed Markdown files directly.
- Call out any validation gap explicitly if a required check cannot run.

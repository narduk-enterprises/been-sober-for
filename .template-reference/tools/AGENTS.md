# AGENTS.md — tools/

These are **Node.js automation scripts** that run locally or in CI. They are
**NOT** deployed to Cloudflare Workers.

## Scripts

| Script                 | Purpose                                                       | Usage                                    |
| ---------------------- | ------------------------------------------------------------- | ---------------------------------------- |
| `check-drift-ci.ts`    | Compares starter-managed files against the pinned template    | `pnpm exec tsx tools/check-drift-ci.ts`  |
| `check-sync-health.ts` | Verifies the synced starter surface is internally consistent  | `pnpm run check:sync-health`             |
| `generate-favicons.ts` | Generates favicon variants from a source SVG                  | `pnpm run generate:favicons`             |
| `sync-template.ts`     | Refreshes starter-managed files from a local template checkout | `pnpm run sync-template`                 |

## vs. `scripts/`

The `scripts/` directory at the repo root contains shell helper scripts. The
`tools/` directory contains TypeScript automation for validation and supporting
scripts.

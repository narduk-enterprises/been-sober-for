# AGENTS.md — tools/

These are **Node.js automation scripts** that run locally or in CI. They are
**NOT** deployed to Cloudflare Workers.

## Scripts

| Script                 | Purpose                                                    | Usage                     |
| ---------------------- | ---------------------------------------------------------- | ------------------------- |
| `validate.ts`          | Confirms infrastructure is correctly provisioned           | `pnpm run validate`       |
| `generate-favicons.ts` | Generates favicon variants from a source SVG               | `pnpm generate:favicons`  |
| `gsc-verify.ts`        | Finalizes Search Console ownership and submits the sitemap | `pnpm exec tsx tools/...` |

## vs. `scripts/`

The `scripts/` directory at the repo root contains shell helper scripts. The
`tools/` directory contains TypeScript automation for validation and supporting
scripts.

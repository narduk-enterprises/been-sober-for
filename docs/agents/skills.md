# Skills Guide

This repo uses `@narduk-enterprises/narduk-skills` plus `skills.config.json` to
materialize local skill output.

## Repo Contract

- `skills.config.json` selects the skill profile set for this repo.
- `pnpm run sync:skills` regenerates local skill output under `.agents/skills/`.
- `.agents/skills/` and `.agents/.narduk-skills.generated.json` are generated
  local artifacts and must stay untracked.
- Starter sync and package install flows should not recreate retired GitHub
  skill mirror paths.

## Updating Skills

1. Update the upstream skill package or repo-level `skills.config.json`.
2. Run `pnpm run sync:skills`.
3. Verify the generated `.agents/` output remains ignored.

## Local Additions

Any extra workstation-only skills should stay outside this repo or in ignored
local directories. Do not commit generated skill payloads.

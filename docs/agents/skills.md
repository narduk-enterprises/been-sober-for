# Skills Guide

This repository no longer manages skill syncing.

## Repo Contract

- Keep any GitHub-visible repo skills under `.github/skills/`.
- Local agent skill setup is workstation-owned and outside the template.
- `sync-template`, starter export, git hooks, and package scripts do not link,
  publish, vendor, or mirror skills.

## Editing Repo Skills

If you want a skill to ship with the repository, edit `.github/skills/` directly
and commit the result.

Recommended layout:

```text
.github/skills/
└── my-skill/
    ├── SKILL.md
    ├── scripts/      # optional
    ├── examples/     # optional
    ├── references/   # optional
    └── resources/    # optional
```

Minimal frontmatter:

```yaml
---
name: my-skill
description: Brief trigger-oriented summary
---
```

## Local-Only Skills

If you want additional skills for Codex, Cursor, Claude, or other local tools,
manage them outside this template repo or in your own ignored directories. The
template will not repair symlinks or copy local skills into committed paths.

## Installing New Skills

```bash
# From a GitHub repo (open standard)
npx skills add https://github.com/<owner>/<repo> --skill <name>

# Interactive scaffolding via agent workflow
/skill-create
```

Use those commands only when you intentionally want to update your local skill
environment or manually curate `.github/skills/`.

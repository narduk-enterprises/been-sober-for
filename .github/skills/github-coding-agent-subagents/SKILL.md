---
name: github-coding-agent-subagents
description: >-
  Use GitHub Copilot coding agents as external subagents from Codex via
  `gh agent-task`. Trigger when the user wants to delegate repo-scoped work to
  GitHub coding agents, run background PR work, or use `gh agent-task`,
  Copilot coding agent, or GitHub coding agents from Codex.
---

# GitHub Coding Agent Subagents

Use this skill when the right execution surface is GitHub's remote coding
agent, not the current local workspace.

Treat GitHub coding agents as external workers that produce pull requests in a
remote repository. They are a good fit for parallel, PR-shaped work. They are a
bad fit for tight critical-path work or anything that depends on unpublished
local changes.

## Good fit

- A repo-scoped task can be described clearly and completed in its own PR.
- The task can start from a pushed base branch on GitHub.
- Codex can continue other work while the GitHub agent runs.
- The user explicitly wants GitHub coding agents or has spare GitHub agent
  credits.

## Not a good fit

- The next local step is blocked on the result right now.
- The task depends on uncommitted or unpushed local changes.
- The user wants direct edits in the current Codex workspace instead of a
  remote PR.
- The task is too small to justify spending GitHub coding-agent credits.

## Preconditions

- `gh` is installed and authenticated.
- The target repository is accessible to `gh`.
- The base branch and any prerequisite commits are already pushed.
- If you want a custom GitHub agent, it already exists in one of these
  locations:
  - `~/.copilot/agents/<name>.md`
  - `.github/agents/<name>.md`

`gh agent-task` is currently preview functionality. Prefer the bundled wrapper
instead of reassembling ad hoc CLI calls every time.

## Preferred wrapper

Use the bundled script for structured output:

```bash
cd ~/.agents/skills/github-coding-agent-subagents
python3 scripts/gh_coding_agent_subagent.py create \
  --repo OWNER/REPO \
  --base main \
  --from-file task.md
```

Use `--from-file` when the task brief is more than a short paragraph.

Common follow-up commands:

```bash
cd ~/.agents/skills/github-coding-agent-subagents
python3 scripts/gh_coding_agent_subagent.py list --repo OWNER/REPO
python3 scripts/gh_coding_agent_subagent.py view <session-id> --repo OWNER/REPO
python3 scripts/gh_coding_agent_subagent.py wait <session-id> --repo OWNER/REPO
```

## Workflow

1. Decide whether the task belongs on GitHub's remote agent or should stay
   local. If the work is urgent, tightly coupled to local edits, or blocks the
   next step, keep it local or use Codex `spawn_agent` instead.
2. Write a self-contained task brief. Include scope, constraints, validation,
   and acceptance criteria. Use
   [task-briefs.md](references/task-briefs.md).
3. Start the task with the wrapper script.
4. Continue non-overlapping local work while the GitHub agent runs.
5. Re-check with `view` or `wait`.
6. Review the resulting PR, tests, and comments before merging or asking for
   follow-up work.

## Task framing rules

- State the exact repository and base branch.
- Name the files, packages, or directories that are in scope.
- State what must not be touched.
- Include the exact validation commands to run.
- Include the acceptance criteria in plain language.
- Tell the agent how to report blockers, partial completion, or skipped
  validation.

For recurring patterns, pass `--custom-agent <name>` so GitHub uses a
repo-level or user-level custom agent profile.

## Wrapper behavior

- `create` creates a GitHub agent task, discovers the new session ID, and
  prints structured JSON.
- `list` shows recent sessions and can filter by repo or state client-side.
- `view` returns the session metadata as JSON.
- `wait` polls until the session reaches a terminal state and returns the final
  metadata as JSON.

The wrapper is intentionally thin. It does not try to merge PRs or summarize
diffs for you. After the remote agent finishes, review the PR with the normal
GitHub or local-review tools.

## Operating rules

- Prefer GitHub coding agents for work that should result in a remote PR and
  can run in parallel.
- Prefer Codex local work for tasks that need immediate iteration inside the
  current workspace.
- Do not assume the remote agent can see local-only files, unstaged changes, or
  unpublished branches.
- Keep prompts explicit. Vague tasks waste credits.
- If a remote agent task fails, inspect the session logs and PR state first
  before retrying with a broader prompt.

## Validation

After creating or updating this skill:

```bash
cd ~/.agents/skills/github-coding-agent-subagents
python3 -m py_compile scripts/gh_coding_agent_subagent.py
python3 scripts/gh_coding_agent_subagent.py --help
npx markdownlint-cli "**/*.md"
```

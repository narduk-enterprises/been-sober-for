# Task Briefs For GitHub Coding Agents

Use a task brief that is explicit enough for a remote agent to work without
extra context.

## Template

```text
Goal
- One sentence describing the user-visible outcome.

Repository
- OWNER/REPO

Base branch
- main

In scope
- Exact files or directories the agent may change.

Out of scope
- Files, systems, or behaviors the agent must not touch.

Constraints
- Required libraries, patterns, or style rules.
- Any rollout or backward-compatibility constraints.

Validation
- Exact commands to run.

Acceptance criteria
- Bullet list of what must be true when the PR is ready.

Report back
- If blocked, explain the blocker clearly in the PR.
- If validation cannot run, say exactly why.
```

## Good example

```text
Goal
- Fix the flaky login E2E test without changing signup behavior.

Repository
- acme/web

Base branch
- main

In scope
- tests/e2e/login.spec.ts
- src/features/auth/**

Out of scope
- billing code
- package upgrades
- unrelated lint cleanup

Constraints
- Keep the existing Playwright test structure.
- Do not weaken assertions to hide real failures.

Validation
- pnpm lint
- pnpm test:e2e -- login

Acceptance criteria
- The login test passes locally in the agent environment.
- Signup tests still pass.
- The PR description explains the root cause and fix.

Report back
- If the agent cannot reproduce the flake, it should document that and stop
  instead of guessing.
```

## Weak brief to avoid

```text
Fix auth bugs and clean things up.
```

That wastes credits because the scope, constraints, and definition of done are
missing.

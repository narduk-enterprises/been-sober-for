<!-- Shared review baseline for inherited gh-aw workflows. -->

# Review Baseline

Apply these rules before you produce any output:

1. Read the closest `AGENTS.md`, `package.json`, `pnpm-workspace.yaml`, and the
   repo-level Copilot instructions when present. Respect repository-specific
   guardrails before suggesting fixes.
2. Focus on the highest-signal findings only: bugs, regressions, dangerous
   anti-patterns, architecture drift, security issues, missing validation, and
   test gaps. Ignore cosmetic nits unless they materially affect consistency,
   accessibility, performance, or maintainability.
3. Prefer concrete evidence over vague advice. Quote exact files, symbols, and
   line ranges when you can verify them from the repository or PR diff.
4. Do not create duplicate noise. Search open issues and pull requests for the
   same problem before creating a new issue or PR.
5. If there is no meaningful action to take, exit silently. Do not create
   "everything looks fine" issues, comments, or pull requests.
6. Treat generated files, lockfiles, snapshots, and vendored artifacts as
   secondary evidence only. Focus your reasoning on the authored source files.
7. Never leak secrets, recommend `.env` files when the repo forbids them, or
   suggest bypassing the repository's quality gates to get work merged.

## Review heuristics

- Start with the changed files when the workflow is PR-driven.
- For scheduled audits, inspect recent activity first, then widen to the most
  risk-heavy surfaces if recent changes are inconclusive.
- Prefer one cohesive result over many small ones. A single clear comment, PR,
  or issue is better than fragmenting the same diagnosis.

---
name: gh-copilot-pr-loop
description: Run a GitHub CLI loop that requests Copilot reviews, waits for feedback, posts fix directives, and merges PRs when they become clean. Use when the user wants an unattended GitHub/Copilot review-fix-merge loop or asks to babysit PRs with gh.
---

# GH Copilot PR Loop

Use this skill when the user wants GitHub/Copilot to handle most of the PR churn instead of doing manual review requests and follow-up comments one by one.

## Preconditions

- `gh` must be installed and authenticated.
- The current directory should be a GitHub repo clone, or you must pass `--repo owner/name`.
- The PRs must already exist.

## Preferred Action

Run the bundled script instead of retyping the loop logic:

```bash
python3 ~/.agents/skills/gh-copilot-pr-loop/scripts/gh_copilot_pr_loop.py --duration-minutes=60 --poll-seconds=300
```

Useful flags:

- `--prs=2,3,5` limits the loop to specific PR numbers.
- `--repo=owner/name` targets a repo outside the current clone.
- `--once` runs a single pass.
- `--dry-run` prints intended actions without mutating GitHub state.
- `--require-check-pattern='UI Quality,visual audit'` blocks merge until a matching check exists and passes.

## What The Loop Does

1. Lists target open PRs.
2. Requests Copilot review whenever a PR head commit changes.
3. Reads Copilot review feedback from pull reviews and inline review comments.
4. Posts a steering comment when new actionable Copilot feedback appears:

```text
@copilot fix all open review issues on this PR. Resolve every actionable point from the latest Copilot feedback before marking this ready.
```

5. Resolves outdated Copilot-authored review threads so superseded feedback does not keep cluttering the GitHub UI.

Safety rule:
- Only outdated threads are auto-resolved.
- Only Copilot-authored threads are auto-resolved.
- Human review threads and current-head threads are left alone.

6. Merges a PR only when all of these are true:
- not draft
- `mergeStateStatus == CLEAN`
- no failing checks
- no pending checks
- any `--require-check-pattern` check exists and is passing
- no `CHANGES_REQUESTED`
- Copilot has actually reviewed the current head commit
- latest commit is newer than the latest actionable Copilot feedback

7. Repeats until the deadline or until `--once` is used.

## Operating Rules

- Prefer an explicit PR list when the user names the PRs.
- If draft PRs are blocking progress, undraft them before running the loop; otherwise the loop will keep waiting.
- If `gh pr merge` fails because GitHub still requires a human action, stop and tell the user exactly what GitHub is blocking on.
- Do not post extra summary comments on every cycle. Let the script handle review requests and the single steering comment pattern.

## Monitoring A Virgin Loop

For the first run on a repo, prefer a quick verification pass before the long loop:

```bash
python3 ~/.agents/skills/gh-copilot-pr-loop/scripts/gh_copilot_pr_loop.py --prs=1 --poll-seconds=60 --once
```

Then inspect GitHub directly with `gh` so you can distinguish script issues from ordinary CI/review latency:

```bash
gh pr view 1 --json statusCheckRollup,reviews,url
gh run list --branch <head-branch> --limit 10 --json workflowName,status,conclusion,url,createdAt,updatedAt
gh api repos/<owner>/<repo>/pulls/1/requested_reviewers
```

Observed gotcha from live use:

- `gh pr view --json reviewRequests` may not reliably show Copilot even when `gh pr edit --add-reviewer @copilot` succeeded.
- The authoritative check for whether Copilot is attached is `gh api repos/<owner>/<repo>/pulls/<pr>/requested_reviewers`.
- A failing workflow such as `audit` can keep `mergeStateStatus=UNSTABLE` even after Copilot review lands, so always check both reviews and Actions.
- If Copilot resolves review comments but the PR is still red, inspect the failing workflow logs with `gh run view <run-id> --log-failed` and consider a targeted follow-up `@copilot` comment for the remaining CI blocker.
- If you restart the loop after Copilot feedback already exists, make sure the script suppresses duplicate steering comments; the updated script now checks existing `@copilot fix all open review issues...` comments before reposting.
- Likewise, a restart should not blindly re-request review for the same head commit once Copilot is already attached or has already reviewed that commit; the updated script now treats that as already covered.
- GitHub can leave superseded Copilot threads visibly unresolved even after a newer fix commit lands. The updated script now auto-resolves outdated Copilot-authored threads to keep the review UI readable.
- A green PR is not enough if Copilot review on the latest head is still in flight. The updated script now blocks merge until the current head commit has an actual Copilot review, which closes the race where checks pass before the requested review arrives.
- For UI-heavy repos, add a dedicated check such as `UI Quality` and run the loop with `--require-check-pattern='UI Quality,visual audit'` so the watcher refuses to merge PRs that never produced a real visual-quality signal.

## Validation

After creating or updating the skill, validate the script entrypoint:

```bash
python3 -m py_compile ~/.agents/skills/gh-copilot-pr-loop/scripts/gh_copilot_pr_loop.py
python3 ~/.agents/skills/gh-copilot-pr-loop/scripts/gh_copilot_pr_loop.py --help
```

#!/usr/bin/env python3

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from typing import Any

DEFAULT_DURATION_MINUTES = 60
DEFAULT_POLL_SECONDS = 300
SUCCESSFUL_CHECK_CONCLUSIONS = {"SUCCESS", "SKIPPED", "NEUTRAL"}
COPILOT_STEER_COMMENT = (
    "@copilot fix all open review issues on this PR. Resolve every actionable point from the "
    "latest Copilot feedback before marking this ready."
)
REVIEW_THREADS_QUERY = (
    "query($owner:String!,$repo:String!,$number:Int!){"
    "repository(owner:$owner,name:$repo){"
    "pullRequest(number:$number){"
    "reviewThreads(first:100){"
    "nodes{"
    "id "
    "isResolved "
    "isOutdated "
    "path "
    "comments(first:20){nodes{author{login}}}"
    "}"
    "}"
    "}"
    "}"
    "}"
)
RESOLVE_REVIEW_THREAD_MUTATION = (
    "mutation($id:ID!){"
    "resolveReviewThread(input:{threadId:$id}){thread{id isResolved}}"
    "}"
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def log(message: str) -> None:
    print(f"[{now_iso()}] {message}")


def run_command(args: list[str], capture: bool = True) -> str:
    completed = subprocess.run(
        args,
        check=True,
        text=True,
        capture_output=capture,
    )
    return completed.stdout if capture else ""


def try_command(args: list[str], capture: bool = True) -> str | None:
    try:
        return run_command(args, capture=capture)
    except subprocess.CalledProcessError:
        return None


def gh_json(args: list[str]) -> Any:
    output = run_command(["gh", *args])
    return json.loads(output)


def hash_text(value: str) -> str:
    return hashlib.sha1(value.encode("utf-8")).hexdigest()


def is_copilot_actor(login: str | None) -> bool:
    return bool(login and "copilot" in login.lower())


def is_actionable_copilot_pull_review(review: dict[str, Any]) -> bool:
    if not is_copilot_actor(review.get("user", {}).get("login")):
        return False
    state = str(review.get("state") or "").upper()
    return state in {"CHANGES_REQUESTED", "COMMENTED"}


def is_actionable_copilot_issue_comment(_comment: dict[str, Any]) -> bool:
    return False


def build_pull_reviews_by_id(pull_reviews: list[dict[str, Any]]) -> dict[int, dict[str, Any]]:
    return {
        int(review["id"]): review
        for review in pull_reviews
        if review.get("id") is not None
    }


def is_actionable_copilot_review_comment(
    comment: dict[str, Any],
    reviews_by_id: dict[int, dict[str, Any]],
) -> bool:
    if not is_copilot_actor(comment.get("user", {}).get("login")):
        return False

    review_id = comment.get("pull_request_review_id")
    if review_id is None:
        return False

    review = reviews_by_id.get(int(review_id))
    return review is not None and is_actionable_copilot_pull_review(review)


def get_repo(explicit_repo: str | None) -> str:
    if explicit_repo:
        return explicit_repo
    repo = gh_json(["repo", "view", "--json", "nameWithOwner"])
    return str(repo["nameWithOwner"])


def list_open_pull_requests(repo: str) -> list[dict[str, Any]]:
    pulls = gh_json(
        [
            "pr",
            "list",
            "--repo",
            repo,
            "--state",
            "open",
            "--json",
            "number,title,url,isDraft,headRefName,updatedAt",
        ]
    )
    return sorted(pulls, key=lambda pull: int(pull["number"]))


def get_pull_request_details(repo: str, pr_number: int) -> dict[str, Any]:
    return gh_json(
        [
            "pr",
            "view",
            str(pr_number),
            "--repo",
            repo,
            "--json",
            "number,title,url,isDraft,mergeStateStatus,reviewDecision,reviewRequests,latestReviews,statusCheckRollup,commits",
        ]
    )


def get_issue_comments(repo: str, pr_number: int) -> list[dict[str, Any]]:
    return gh_json(["api", f"repos/{repo}/issues/{pr_number}/comments"])


def get_pull_reviews(repo: str, pr_number: int) -> list[dict[str, Any]]:
    return gh_json(["api", f"repos/{repo}/pulls/{pr_number}/reviews"])


def get_pull_review_comments(repo: str, pr_number: int) -> list[dict[str, Any]]:
    return gh_json(["api", f"repos/{repo}/pulls/{pr_number}/comments"])


def get_requested_reviewers(repo: str, pr_number: int) -> dict[str, Any]:
    return gh_json(["api", f"repos/{repo}/pulls/{pr_number}/requested_reviewers"])


def split_repo(repo: str) -> tuple[str, str]:
    if "/" not in repo:
        raise ValueError(f"invalid repo identifier: {repo}")
    owner, name = repo.split("/", 1)
    return owner, name


def get_review_threads(repo: str, pr_number: int) -> list[dict[str, Any]]:
    owner, name = split_repo(repo)
    response = gh_json(
        [
            "api",
            "graphql",
            "-f",
            f"query={REVIEW_THREADS_QUERY}",
            "-F",
            f"owner={owner}",
            "-F",
            f"repo={name}",
            "-F",
            f"number={pr_number}",
        ]
    )
    pull_request = (
        response.get("data", {})
        .get("repository", {})
        .get("pullRequest", {})
    )
    return pull_request.get("reviewThreads", {}).get("nodes", [])


def has_copilot_requested(requested_reviewers: dict[str, Any]) -> bool:
    users = requested_reviewers.get("users") or []
    return any(is_copilot_actor(user.get("login")) for user in users)


def is_copilot_review_thread(thread: dict[str, Any]) -> bool:
    comments = (thread.get("comments") or {}).get("nodes") or []
    author_logins = [
        comment.get("author", {}).get("login")
        for comment in comments
        if comment.get("author")
    ]
    return bool(author_logins) and all(is_copilot_actor(login) for login in author_logins)


def resolve_review_thread(thread_id: str, dry_run: bool) -> None:
    if dry_run:
        log(f"[dry-run] would resolve review thread {thread_id}")
        return

    gh_json(
        [
            "api",
            "graphql",
            "-f",
            f"query={RESOLVE_REVIEW_THREAD_MUTATION}",
            "-F",
            f"id={thread_id}",
        ]
    )


def resolve_outdated_copilot_threads(repo: str, pr_number: int, dry_run: bool) -> None:
    threads = get_review_threads(repo, pr_number)
    targets = [
        thread
        for thread in threads
        if not thread.get("isResolved")
        and thread.get("isOutdated")
        and is_copilot_review_thread(thread)
    ]
    if not targets:
        return

    paths = ", ".join(sorted({str(thread.get("path") or "unknown") for thread in targets}))
    if dry_run:
        log(
            f"[dry-run] would resolve {len(targets)} outdated Copilot review thread(s) "
            f"on PR #{pr_number}: {paths}"
        )
        return

    for thread in targets:
        resolve_review_thread(str(thread["id"]), dry_run=False)

    log(
        f"Resolved {len(targets)} outdated Copilot review thread(s) "
        f"on PR #{pr_number}: {paths}"
    )


def request_copilot_review(repo: str, pr_number: int, dry_run: bool) -> None:
    if dry_run:
        log(f"[dry-run] would request Copilot review on PR #{pr_number}")
        return

    result = try_command(
        [
            "gh",
            "pr",
            "edit",
            str(pr_number),
            "--repo",
            repo,
            "--add-reviewer",
            "@copilot",
        ]
    )
    if result is None:
        log(f"Copilot review request on PR #{pr_number} may already exist or could not be added")
        return

    requested_reviewers = get_requested_reviewers(repo, pr_number)
    if has_copilot_requested(requested_reviewers):
        log(f"Requested Copilot review on PR #{pr_number} (Copilot is attached as a reviewer)")
    else:
        log(
            f"Requested Copilot review on PR #{pr_number} "
            f"(gh accepted the request, but Copilot is not visible in requested_reviewers yet)"
        )


def post_fix_comment(repo: str, pr_number: int, dry_run: bool) -> None:
    if dry_run:
        log(f"[dry-run] would comment on PR #{pr_number}: {COPILOT_STEER_COMMENT}")
        return

    run_command(
        [
            "gh",
            "pr",
            "comment",
            str(pr_number),
            "--repo",
            repo,
            "--body",
            COPILOT_STEER_COMMENT,
        ]
    )
    log(f"Posted Copilot fix request on PR #{pr_number}")


def merge_pull_request(repo: str, pr_number: int, dry_run: bool) -> None:
    if dry_run:
        log(f"[dry-run] would merge PR #{pr_number} with squash + branch deletion")
        return

    subprocess.run(
        [
            "gh",
            "pr",
            "merge",
            str(pr_number),
            "--repo",
            repo,
            "--squash",
            "--delete-branch",
        ],
        check=True,
        text=True,
    )


def get_latest_commit(details: dict[str, Any]) -> dict[str, Any] | None:
    commits = details.get("commits") or []
    return commits[-1] if commits else None


def has_copilot_review_for_commit(
    pull_reviews: list[dict[str, Any]],
    commit_oid: str | None,
) -> bool:
    if not commit_oid:
        return False
    for review in pull_reviews:
        if not is_copilot_actor(review.get("user", {}).get("login")):
            continue
        commit = review.get("commit") or {}
        if str(commit.get("oid") or "") == commit_oid:
            return True
    return False


def has_any_copilot_review(pull_reviews: list[dict[str, Any]]) -> bool:
    return any(is_copilot_actor(review.get("user", {}).get("login")) for review in pull_reviews)


def get_latest_copilot_feedback_at(
    issue_comments: list[dict[str, Any]],
    pull_reviews: list[dict[str, Any]],
    review_comments: list[dict[str, Any]],
) -> str | None:
    reviews_by_id = build_pull_reviews_by_id(pull_reviews)
    timestamps: list[str] = []

    for comment in issue_comments:
        if is_actionable_copilot_issue_comment(comment):
            created_at = comment.get("created_at")
            if created_at:
                timestamps.append(str(created_at))

    for review in pull_reviews:
        if is_actionable_copilot_pull_review(review):
            submitted_at = review.get("submitted_at")
            if submitted_at:
                timestamps.append(str(submitted_at))

    for comment in review_comments:
        if is_actionable_copilot_review_comment(comment, reviews_by_id):
            created_at = comment.get("created_at")
            if created_at:
                timestamps.append(str(created_at))

    return sorted(timestamps)[-1] if timestamps else None


def build_copilot_steer_signature(
    issue_comments: list[dict[str, Any]],
    pull_reviews: list[dict[str, Any]],
    review_comments: list[dict[str, Any]],
) -> str | None:
    reviews_by_id = build_pull_reviews_by_id(pull_reviews)
    bodies: list[str] = []

    for comment in issue_comments:
        if is_actionable_copilot_issue_comment(comment):
            body = str(comment.get("body") or "").strip()
            if body:
                bodies.append(body)

    for review in pull_reviews:
        if is_actionable_copilot_pull_review(review):
            body = str(review.get("body") or "").strip()
            if body:
                bodies.append(body)

    for comment in review_comments:
        if is_actionable_copilot_review_comment(comment, reviews_by_id):
            body = str(comment.get("body") or "").strip()
            if body:
                bodies.append(body)

    if not bodies:
        return None

    return hash_text("\n---\n".join(bodies))


def has_recent_fix_comment(
    issue_comments: list[dict[str, Any]],
    latest_copilot_feedback_at: str | None,
) -> bool:
    matching_times = [
        str(comment.get("created_at"))
        for comment in issue_comments
        if str(comment.get("body") or "").strip() == COPILOT_STEER_COMMENT
        and comment.get("created_at")
    ]
    if not matching_times:
        return False
    latest_fix_comment_at = sorted(matching_times)[-1]
    if latest_copilot_feedback_at is None:
        return True
    return latest_fix_comment_at >= latest_copilot_feedback_at


def has_pending_checks(details: dict[str, Any]) -> bool:
    checks = details.get("statusCheckRollup") or []
    return any(check.get("status") and check.get("status") != "COMPLETED" for check in checks)


def pending_check_names(details: dict[str, Any]) -> list[str]:
    checks = details.get("statusCheckRollup") or []
    return [
        str(check.get("name") or check.get("workflowName") or "unknown")
        for check in checks
        if check.get("status") and check.get("status") != "COMPLETED"
    ]


def has_failing_checks(details: dict[str, Any]) -> bool:
    checks = details.get("statusCheckRollup") or []
    for check in checks:
        if check.get("status") != "COMPLETED":
            continue
        conclusion = check.get("conclusion")
        if conclusion and conclusion not in SUCCESSFUL_CHECK_CONCLUSIONS:
            return True
    return False


def check_name(check: dict[str, Any]) -> str:
    return str(check.get("name") or check.get("workflowName") or "unknown")


def failing_check_names(details: dict[str, Any]) -> list[str]:
    checks = details.get("statusCheckRollup") or []
    failing: list[str] = []
    for check in checks:
        if check.get("status") != "COMPLETED":
            continue
        conclusion = check.get("conclusion")
        if conclusion and conclusion not in SUCCESSFUL_CHECK_CONCLUSIONS:
            failing.append(check_name(check))
    return failing


def compile_check_patterns(value: str | None) -> list[re.Pattern[str]]:
    if not value:
        return []

    patterns: list[re.Pattern[str]] = []
    for item in value.split(","):
        token = item.strip()
        if not token:
            continue
        try:
            patterns.append(re.compile(token, re.IGNORECASE))
        except re.error as error:
            raise SystemExit(f"invalid --require-check-pattern regex {token!r}: {error}") from error
    return patterns


def required_check_status(
    details: dict[str, Any],
    patterns: list[re.Pattern[str]],
) -> dict[str, Any]:
    if not patterns:
        return {
            "status": "not-configured",
            "matched": [],
            "passed": [],
            "pending": [],
            "failing": [],
        }

    checks = details.get("statusCheckRollup") or []
    matched = [
        check
        for check in checks
        if any(pattern.search(check_name(check)) for pattern in patterns)
    ]

    if not matched:
        return {
            "status": "missing",
            "matched": [],
            "passed": [],
            "pending": [],
            "failing": [],
        }

    passed: list[str] = []
    pending: list[str] = []
    failing: list[str] = []

    for check in matched:
        name = check_name(check)
        if check.get("status") != "COMPLETED":
            pending.append(name)
            continue

        conclusion = check.get("conclusion")
        if conclusion in SUCCESSFUL_CHECK_CONCLUSIONS:
            passed.append(name)
        else:
            failing.append(name)

    if pending:
        status = "pending"
    elif failing:
        status = "failing"
    elif passed:
        status = "passed"
    else:
        status = "missing"

    return {
        "status": status,
        "matched": [check_name(check) for check in matched],
        "passed": passed,
        "pending": pending,
        "failing": failing,
    }


def should_merge(
    details: dict[str, Any],
    latest_commit: dict[str, Any] | None,
    latest_copilot_feedback_at: str | None,
    requested_reviewers: dict[str, Any],
    pull_reviews: list[dict[str, Any]],
    required_check_patterns: list[re.Pattern[str]],
) -> bool:
    if details.get("isDraft"):
        return False
    if not latest_commit:
        return False
    if details.get("reviewDecision") == "CHANGES_REQUESTED":
        return False
    if details.get("mergeStateStatus") != "CLEAN":
        return False
    if has_pending_checks(details) or has_failing_checks(details):
        return False
    if required_check_status(details, required_check_patterns)["status"] != "passed":
        return False

    latest_oid = str(latest_commit.get("oid") or "")
    head_has_copilot_review = has_copilot_review_for_commit(pull_reviews, latest_oid)
    if (
        latest_oid
        and (has_copilot_requested(requested_reviewers) or has_any_copilot_review(pull_reviews))
        and not head_has_copilot_review
    ):
        return False

    if not latest_copilot_feedback_at:
        return True

    latest_commit_time = datetime.fromisoformat(
        str(latest_commit["committedDate"]).replace("Z", "+00:00")
    )
    latest_feedback_time = datetime.fromisoformat(
        latest_copilot_feedback_at.replace("Z", "+00:00")
    )
    return latest_commit_time >= latest_feedback_time


def parse_prs(value: str | None) -> list[int] | None:
    if not value:
        return None
    parsed: list[int] = []
    for item in value.split(","):
        item = item.strip()
        if not item:
            continue
        number = int(item)
        if number <= 0:
            raise argparse.ArgumentTypeError(f"invalid PR number: {item}")
        parsed.append(number)
    return parsed


def main() -> int:
    parser = argparse.ArgumentParser(
        description="GitHub Copilot PR review/fix/merge loop using gh."
    )
    parser.add_argument("--repo", help="owner/name; defaults to current gh repo")
    parser.add_argument("--prs", help="comma-separated PR numbers to watch")
    parser.add_argument(
        "--duration-minutes",
        type=float,
        default=DEFAULT_DURATION_MINUTES,
        help=f"how long to run the loop (default: {DEFAULT_DURATION_MINUTES})",
    )
    parser.add_argument(
        "--poll-seconds",
        type=float,
        default=DEFAULT_POLL_SECONDS,
        help=f"seconds between loop iterations (default: {DEFAULT_POLL_SECONDS})",
    )
    parser.add_argument("--dry-run", action="store_true", help="print actions without mutating GitHub")
    parser.add_argument("--once", action="store_true", help="run a single pass and exit")
    parser.add_argument(
        "--require-check-pattern",
        help="comma-separated regex patterns for checks that must be present and passing before merge",
    )
    args = parser.parse_args()

    if args.duration_minutes <= 0:
        raise SystemExit("--duration-minutes must be positive")
    if args.poll_seconds <= 0:
        raise SystemExit("--poll-seconds must be positive")

    repo = get_repo(args.repo)
    prs = parse_prs(args.prs)
    required_check_patterns = compile_check_patterns(args.require_check_pattern)
    deadline = time.time() + (args.duration_minutes * 60)
    state: dict[int, dict[str, str]] = {}

    mode = "single cycle" if args.once else f"{args.duration_minutes} minutes"
    suffix = ", dry-run" if args.dry_run else ""
    log(f"Starting Copilot PR loop for {repo} ({mode}, poll {args.poll_seconds}s{suffix})")

    while True:
        all_open_prs = list_open_pull_requests(repo)
        target_prs = (
            [pull for pull in all_open_prs if int(pull["number"]) in set(prs or [])]
            if prs
            else all_open_prs
        )

        if not target_prs:
            log("No target PRs are open")

        for pull in target_prs:
            pr_number = int(pull["number"])
            details = get_pull_request_details(repo, pr_number)
            latest_commit = get_latest_commit(details)
            entry = state.get(pr_number, {})

            log(f"Inspecting PR #{pr_number}: {details.get('title')}")

            requested_reviewers = get_requested_reviewers(repo, pr_number)
            issue_comments = get_issue_comments(repo, pr_number)
            pull_reviews = get_pull_reviews(repo, pr_number)
            review_comments = get_pull_review_comments(repo, pr_number)
            resolve_outdated_copilot_threads(repo, pr_number, args.dry_run)

            latest_oid = str(latest_commit.get("oid")) if latest_commit else None
            copilot_already_covering_head = (
                has_copilot_requested(requested_reviewers)
                or has_copilot_review_for_commit(pull_reviews, latest_oid)
            )
            if (
                latest_oid
                and latest_oid != entry.get("lastReviewRequestedCommit")
                and not copilot_already_covering_head
            ):
                request_copilot_review(repo, pr_number, args.dry_run)
                entry["lastReviewRequestedCommit"] = latest_oid
                requested_reviewers = get_requested_reviewers(repo, pr_number)
            elif latest_oid and copilot_already_covering_head:
                entry["lastReviewRequestedCommit"] = latest_oid

            latest_feedback_at = get_latest_copilot_feedback_at(
                issue_comments,
                pull_reviews,
                review_comments,
            )
            steer_signature = build_copilot_steer_signature(
                issue_comments,
                pull_reviews,
                review_comments,
            )
            has_fix_comment = has_recent_fix_comment(issue_comments, latest_feedback_at)

            if (
                steer_signature
                and steer_signature != entry.get("lastSteerSignature")
                and not has_fix_comment
            ):
                post_fix_comment(repo, pr_number, args.dry_run)
                entry["lastSteerSignature"] = steer_signature
            elif steer_signature and has_fix_comment:
                entry["lastSteerSignature"] = steer_signature

            head_has_copilot_review = has_copilot_review_for_commit(pull_reviews, latest_oid)

            if should_merge(
                details,
                latest_commit,
                latest_feedback_at,
                requested_reviewers,
                pull_reviews,
                required_check_patterns,
            ):
                log(f"PR #{pr_number} meets merge criteria")
                try:
                    merge_pull_request(repo, pr_number, args.dry_run)
                    log(f"Merged PR #{pr_number}")
                except subprocess.CalledProcessError as error:
                    log(f"Failed to merge PR #{pr_number}: {error}")
            else:
                pending_checks = pending_check_names(details)
                failing_checks = failing_check_names(details)
                required_checks = required_check_status(details, required_check_patterns)
                required_summary = (
                    f"{required_checks['status']}:{','.join(required_checks['matched']) or 'none'}"
                    if required_check_patterns
                    else "not-configured"
                )
                log(
                    f"PR #{pr_number} not mergeable yet "
                    f"(draft={details.get('isDraft')}, "
                    f"mergeState={details.get('mergeStateStatus')}, "
                    f"reviewDecision={details.get('reviewDecision') or 'none'}, "
                    f"copilotRequested={has_copilot_requested(requested_reviewers)}, "
                    f"copilotReviewedHead={head_has_copilot_review}, "
                    f"requiredChecks={required_summary}, "
                    f"pendingChecks={','.join(pending_checks) or 'none'}, "
                    f"failingChecks={','.join(failing_checks) or 'none'})"
                )

            if latest_oid:
                entry["lastSeenCommit"] = latest_oid
            state[pr_number] = entry

        if args.once or time.time() >= deadline:
            break

        time.sleep(args.poll_seconds)

    log("Copilot PR loop finished")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        log("Interrupted")
        raise SystemExit(130)

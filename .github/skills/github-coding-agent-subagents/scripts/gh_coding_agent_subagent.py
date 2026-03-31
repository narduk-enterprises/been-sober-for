#!/usr/bin/env python3
"""Thin wrapper around `gh agent-task` for Codex-friendly delegation."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from typing import Any

TASK_FIELDS = ",".join(
    [
        "completedAt",
        "createdAt",
        "id",
        "name",
        "pullRequestNumber",
        "pullRequestState",
        "pullRequestTitle",
        "pullRequestUrl",
        "repository",
        "state",
        "updatedAt",
        "user",
    ]
)

TERMINAL_STATES = {"completed", "failed", "cancelled", "canceled"}
UUID_RE = re.compile(
    r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b"
)


def die(message: str, *, code: int = 1) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(code)


def run_capture(args: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(args, text=True, capture_output=True)
    if check and result.returncode != 0:
        message = result.stderr.strip() or result.stdout.strip() or "command failed"
        die(f"{' '.join(args)}: {message}", code=result.returncode)
    return result


def run_stream(args: list[str]) -> int:
    proc = subprocess.run(args, text=True)
    return proc.returncode


def parse_json(text: str) -> Any:
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        die(f"failed to parse JSON output: {exc}")


def print_json(value: Any) -> None:
    json.dump(value, sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")


def resolve_repo_name(repo: str | None) -> str | None:
    cmd = ["gh", "repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]
    if repo:
        cmd.extend(["-R", repo])
    result = run_capture(cmd, check=False)
    if result.returncode != 0:
        return repo
    name = result.stdout.strip()
    return name or repo


def list_tasks(limit: int) -> list[dict[str, Any]]:
    result = run_capture(
        ["gh", "agent-task", "list", "--limit", str(limit), "--json", TASK_FIELDS]
    )
    data = parse_json(result.stdout)
    if not isinstance(data, list):
        die("unexpected response from gh agent-task list")
    return data


def view_task(task: str, *, repo: str | None) -> dict[str, Any]:
    cmd = ["gh", "agent-task", "view", task, "--json", TASK_FIELDS]
    if repo:
        cmd.extend(["-R", repo])
    result = run_capture(cmd)
    data = parse_json(result.stdout)
    if not isinstance(data, dict):
        die("unexpected response from gh agent-task view")
    return data


def parse_timestamp(value: str | None) -> datetime:
    if not value:
        return datetime.fromtimestamp(0, tz=timezone.utc)
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def filter_tasks(
    tasks: list[dict[str, Any]],
    *,
    repo: str | None = None,
    state: str | None = None,
) -> list[dict[str, Any]]:
    filtered = tasks
    if repo:
        filtered = [task for task in filtered if task.get("repository") == repo]
    if state:
        wanted = state.lower()
        filtered = [task for task in filtered if str(task.get("state", "")).lower() == wanted]
    return filtered


def task_is_terminal(task: dict[str, Any]) -> bool:
    state = str(task.get("state", "")).lower()
    return bool(task.get("completedAt")) or state in TERMINAL_STATES


def extract_session_id(text: str) -> str | None:
    match = UUID_RE.search(text)
    return match.group(0) if match else None


def discover_created_task(
    *,
    before_ids: set[str],
    repo: str | None,
    limit: int,
    timeout_seconds: float,
    poll_seconds: float,
    stdout_hint: str,
) -> dict[str, Any]:
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        candidates = [task for task in list_tasks(limit) if task.get("id") not in before_ids]
        candidates = filter_tasks(candidates, repo=repo)
        if candidates:
            candidates.sort(key=lambda task: parse_timestamp(task.get("createdAt")), reverse=True)
            return candidates[0]
        time.sleep(poll_seconds)

    session_id = extract_session_id(stdout_hint)
    if session_id:
        return view_task(session_id, repo=repo)

    die("created agent task but could not discover the new session id")


def command_create(args: argparse.Namespace) -> int:
    repo = resolve_repo_name(args.repo)
    before = filter_tasks(list_tasks(args.limit), repo=repo)
    before_ids = {str(task["id"]) for task in before if task.get("id")}

    cmd = ["gh", "agent-task", "create"]
    if args.base:
        cmd.extend(["--base", args.base])
    if args.custom_agent:
        cmd.extend(["--custom-agent", args.custom_agent])
    if args.repo:
        cmd.extend(["--repo", args.repo])
    if args.from_file:
        cmd.extend(["--from-file", args.from_file])
    elif args.description:
        cmd.append(args.description)

    result = run_capture(cmd)
    created = discover_created_task(
        before_ids=before_ids,
        repo=repo,
        limit=args.limit,
        timeout_seconds=args.discovery_timeout,
        poll_seconds=args.poll_seconds,
        stdout_hint=result.stdout,
    )

    payload: dict[str, Any] = {
        "action": "create",
        "repo": repo,
        "session": created,
    }
    stdout_text = result.stdout.strip()
    if stdout_text:
        payload["create_stdout"] = stdout_text

    if args.wait:
        created = wait_for_task(
            task=str(created["id"]),
            repo=repo,
            timeout_seconds=args.timeout_seconds,
            poll_seconds=args.poll_seconds,
        )
        payload["session"] = created

    print_json(payload)

    if args.follow:
        follow_cmd = ["gh", "agent-task", "view", str(payload["session"]["id"]), "--follow"]
        if args.repo:
            follow_cmd.extend(["-R", args.repo])
        return run_stream(follow_cmd)

    return 0


def command_list(args: argparse.Namespace) -> int:
    repo = resolve_repo_name(args.repo) if args.repo else None
    tasks = filter_tasks(list_tasks(args.limit), repo=repo, state=args.state)
    print_json(
        {
            "action": "list",
            "count": len(tasks),
            "repo": repo,
            "state_filter": args.state,
            "tasks": tasks,
        }
    )
    return 0


def command_view(args: argparse.Namespace) -> int:
    if args.log or args.follow:
        cmd = ["gh", "agent-task", "view", args.task]
        if args.repo:
            cmd.extend(["-R", args.repo])
        if args.log:
            cmd.append("--log")
        if args.follow:
            cmd.append("--follow")
        return run_stream(cmd)

    repo = resolve_repo_name(args.repo) if args.repo else None
    print_json(
        {
            "action": "view",
            "repo": repo,
            "session": view_task(args.task, repo=repo),
        }
    )
    return 0


def wait_for_task(
    *,
    task: str,
    repo: str | None,
    timeout_seconds: float,
    poll_seconds: float,
) -> dict[str, Any]:
    deadline = time.monotonic() + timeout_seconds
    while True:
        session = view_task(task, repo=repo)
        if task_is_terminal(session):
            return session
        if time.monotonic() >= deadline:
            die(f"timed out waiting for agent task {task}")
        time.sleep(poll_seconds)


def command_wait(args: argparse.Namespace) -> int:
    repo = resolve_repo_name(args.repo) if args.repo else None
    session = wait_for_task(
        task=args.task,
        repo=repo,
        timeout_seconds=args.timeout_seconds,
        poll_seconds=args.poll_seconds,
    )
    print_json(
        {
            "action": "wait",
            "repo": repo,
            "session": session,
        }
    )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Codex-friendly wrapper around gh agent-task for GitHub coding agents."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    create_parser = subparsers.add_parser("create", help="Create a GitHub coding-agent task")
    create_parser.add_argument("description", nargs="?", help="Inline task description")
    create_parser.add_argument("--from-file", help="Read the task description from a file")
    create_parser.add_argument("--repo", help="Target repository in OWNER/REPO form")
    create_parser.add_argument("--base", help="Base branch for the generated PR")
    create_parser.add_argument(
        "--custom-agent", help="Custom GitHub agent name from .github/agents or ~/.copilot/agents"
    )
    create_parser.add_argument(
        "--limit",
        type=int,
        default=50,
        help="How many recent sessions to inspect while discovering a new task",
    )
    create_parser.add_argument(
        "--poll-seconds", type=float, default=5.0, help="Polling interval for discovery and wait"
    )
    create_parser.add_argument(
        "--discovery-timeout",
        type=float,
        default=30.0,
        help="Seconds to wait while discovering the new session id",
    )
    create_parser.add_argument(
        "--wait",
        action="store_true",
        help="Wait for the created task to reach a terminal state before returning JSON",
    )
    create_parser.add_argument(
        "--timeout-seconds",
        type=float,
        default=1800.0,
        help="Timeout used by --wait and the wait subcommand",
    )
    create_parser.add_argument(
        "--follow",
        action="store_true",
        help="After printing JSON, stream the session logs using gh agent-task view --follow",
    )
    create_parser.set_defaults(func=command_create)

    list_parser = subparsers.add_parser("list", help="List recent GitHub coding-agent tasks")
    list_parser.add_argument("--repo", help="Filter to a repository in OWNER/REPO form")
    list_parser.add_argument("--state", help="Filter by session state")
    list_parser.add_argument("--limit", type=int, default=30, help="Maximum sessions to fetch")
    list_parser.set_defaults(func=command_list)

    view_parser = subparsers.add_parser("view", help="View a session")
    view_parser.add_argument("task", help="Session id, PR number, PR URL, or OWNER/REPO#PR")
    view_parser.add_argument("--repo", help="Target repository in OWNER/REPO form")
    view_parser.add_argument("--log", action="store_true", help="Show the session logs")
    view_parser.add_argument("--follow", action="store_true", help="Follow the session logs")
    view_parser.set_defaults(func=command_view)

    wait_parser = subparsers.add_parser("wait", help="Wait for a session to finish")
    wait_parser.add_argument("task", help="Session id, PR number, PR URL, or OWNER/REPO#PR")
    wait_parser.add_argument("--repo", help="Target repository in OWNER/REPO form")
    wait_parser.add_argument(
        "--poll-seconds", type=float, default=10.0, help="Polling interval while waiting"
    )
    wait_parser.add_argument(
        "--timeout-seconds",
        type=float,
        default=1800.0,
        help="Maximum number of seconds to wait",
    )
    wait_parser.set_defaults(func=command_wait)

    return parser


def validate_create_args(args: argparse.Namespace) -> None:
    if args.command != "create":
        return
    if args.description and args.from_file:
        die("pass either an inline description or --from-file, not both")
    if not args.description and not args.from_file:
        die("create requires an inline description or --from-file")


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    validate_create_args(args)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env sh
# Best-effort cleanup of leaked local dev subprocesses (Cloudflare workerd, Playwright MCP/browsers).
# When REPO_ROOT is set (e.g. dev-kill.sh exports it), also kills workerd whose argv references that path.
#
# Usage:
#   sh scripts/cleanup-node-leaks.sh
#   sh scripts/cleanup-node-leaks.sh workerd-only   # skip Playwright MCP (e.g. fleet / CI-adjacent)

MODE=${1:-all}

STAT_CLEAN_WR_REPO=0
STAT_CLEAN_WR_ORPHAN=0
STAT_CLEAN_PW_MCP=0
STAT_CLEAN_PW_ORPHAN=0

count_words() {
  n=0
  for _ in $1; do
    n=$((n + 1))
  done
  echo "$n"
}

# workerd whose argv references this checkout (wrangler/nitro often passes absolute config paths).
kill_workerd_for_repo() {
  [ -n "${REPO_ROOT:-}" ] || return 0
  w=$(
    ps -ax -ww -o pid= -o command= 2>/dev/null | awk -v root="$REPO_ROOT" '
    {
      pid = $1
      $1 = ""
      sub(/^[[:space:]]+/, "")
      cmd = $0
      if (index(cmd, root) == 0) next
      if (cmd ~ /[[:space:]\/]workerd/) print pid
    }'
  )
  STAT_CLEAN_WR_REPO=$(count_words "$w")
  if [ "$STAT_CLEAN_WR_REPO" -gt 0 ]; then
    # shellcheck disable=SC2086
    kill -TERM $w 2>/dev/null || true
    sleep 1
    # shellcheck disable=SC2086
    kill -KILL $w 2>/dev/null || true
  fi
}

# Orphan workerd: PPID 1 means the parent exited (launchd/init reparented the child).
# Typical source: nitro-cloudflare-dev / wrangler getPlatformProxy without a graceful Nitro close.
kill_orphan_workerd() {
  orphans=$(ps -axo ppid=,pid=,command= 2>/dev/null | awk '($1+0)==1 && /workerd/ { print $2 }')
  STAT_CLEAN_WR_ORPHAN=$(count_words "$orphans")
  if [ -n "$orphans" ]; then
    echo "$orphans" | xargs kill -TERM 2>/dev/null || true
    sleep 1
    orphans=$(ps -axo ppid=,pid=,command= 2>/dev/null | awk '($1+0)==1 && /workerd/ { print $2 }')
    if [ -n "$orphans" ]; then
      echo "$orphans" | xargs kill -KILL 2>/dev/null || true
    fi
  fi
}

# Reparented Playwright browser/driver leftovers (PPID 1 + ms-playwright cache path).
kill_orphan_playwright_browsers() {
  orphans=$(
    ps -axo ppid=,pid=,command= 2>/dev/null | awk '($1 + 0) == 1 && /ms-playwright/ { print $2 }'
  )
  STAT_CLEAN_PW_ORPHAN=$(count_words "$orphans")
  if [ -n "$orphans" ]; then
    # shellcheck disable=SC2086
    kill -TERM $orphans 2>/dev/null || true
    sleep 1
    orphans=$(
      ps -axo ppid=,pid=,command= 2>/dev/null | awk '($1 + 0) == 1 && /ms-playwright/ { print $2 }'
    )
    if [ -n "$orphans" ]; then
      # shellcheck disable=SC2086
      kill -KILL $orphans 2>/dev/null || true
    fi
  fi
}

# Leaked Playwright MCP: Cursor may spawn many copies of the same binary over reconnects.
# E2E uses @playwright/test/cli.js — not this path.
kill_leaked_playwright_mcp() {
  if ! command -v pgrep >/dev/null 2>&1; then
    return 0
  fi
  mcp_pids=$(pgrep -f '[/]node_modules/\.bin/playwright-mcp' 2>/dev/null || true)
  STAT_CLEAN_PW_MCP=$(count_words "$mcp_pids")
  if [ "$STAT_CLEAN_PW_MCP" -gt 0 ] && command -v pkill >/dev/null 2>&1; then
    pkill -TERM -f '[/]node_modules/\.bin/playwright-mcp' 2>/dev/null || true
    sleep 1
    pkill -KILL -f '[/]node_modules/\.bin/playwright-mcp' 2>/dev/null || true
  fi
}

print_cleanup_summary() {
  echo ""
  echo "--- cleanup-node-leaks ---"
  if [ -n "${REPO_ROOT:-}" ]; then
    echo "workerd (workspace argv): ${STAT_CLEAN_WR_REPO} PIDs signaled"
  else
    echo "workerd (workspace argv): skipped (REPO_ROOT unset)"
  fi
  echo "workerd (orphan PPID 1): ${STAT_CLEAN_WR_ORPHAN} PIDs signaled"
  case "$MODE" in
  workerd-only)
    echo "playwright-mcp: skipped (workerd-only mode)"
    echo "playwright browsers (orphan ms-playwright): skipped (workerd-only mode)"
    ;;
  *)
    echo "playwright-mcp: ${STAT_CLEAN_PW_MCP} PIDs signaled"
    echo "playwright browsers (orphan ms-playwright): ${STAT_CLEAN_PW_ORPHAN} PIDs signaled"
    ;;
  esac
  echo "---"
}

kill_workerd_for_repo
kill_orphan_workerd

case "$MODE" in
workerd-only) ;;
*)
  kill_leaked_playwright_mcp
  kill_orphan_playwright_browsers
  ;;
esac

print_cleanup_summary

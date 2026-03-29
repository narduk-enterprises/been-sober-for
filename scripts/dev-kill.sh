#!/usr/bin/env sh
# Stop dev surfaces for this workspace: Nuxt/Vite/Wrangler/Playwright/workerd, plus
# fixed ports. Anchors on REPO_ROOT (parent of scripts/) so derived apps only kill
# processes whose argv contains that checkout path.
#
# Optional: NUXT_PORT — included in the port sweep (deduped with 3000).
# Optional: DEV_KILL_SKIP_PLAYWRIGHT_TREE=1 — do not walk Playwright child PIDs.
set -e
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
seeds=

STAT_PORTS_CLEARED=0
STAT_PORT_LINES=''
STAT_REPO_KILL=0
STAT_PW_BROWSER_TERM=0
STAT_PW_BROWSER_KILL=0
STAT_REPO_BY_CAT=''

# shellcheck disable=SC2086
dedupe_ports() {
  seen=''
  out=''
  for p in "$@"; do
    case " $seen " in *" $p "*) ;; *)
      seen="$seen $p"
      out="$out $p"
      ;;
    esac
  done
  echo "$out"
}

# Sets STAT_PORTS_CLEARED and STAT_PORT_LINES (newline-separated "port<TAB>pid").
kill_port_listeners() {
  STAT_PORTS_CLEARED=0
  STAT_PORT_LINES=''
  for port in $1; do
    pid=$(lsof -ti :"$port" 2>/dev/null) || true
    if [ -n "$pid" ]; then
      if kill "$pid" 2>/dev/null; then
        STAT_PORTS_CLEARED=$((STAT_PORTS_CLEARED + 1))
        STAT_PORT_LINES="${STAT_PORT_LINES}${port}	${pid}
"
      fi
    fi
  done
}

# Print "pid<TAB>category" (one category per process; first match wins).
# Excludes this script, cleanup-node-leaks, quality-only tools, and pnpm dev:kill.
collect_repo_dev_pid_categories() {
  ps -ax -ww -o pid= -o command= 2>/dev/null | awk -v root="$REPO_ROOT" -v me="$$" '
  function excl(cmd) {
    if (index(cmd, "dev-kill.sh") > 0) return 1
    if (index(cmd, "cleanup-node-leaks.sh") > 0) return 1
    if (cmd ~ /pnpm[^[:space:]]*[[:space:]]+run[[:space:]]+dev:kill/) return 1
    if (cmd ~ /[[:space:]\/]vitest([[:space:]]|$)/) return 1
    if (cmd ~ /eslint|prettier|tsc[[:space:]]|typecheck|jest|mocha/) return 1
    if (cmd ~ /[[:space:]\/]nuxi[[:space:]]+build/) return 1
    if (cmd ~ /[[:space:]\/]nuxt[[:space:]]+build/) return 1
    return 0
  }
  {
    pid = $1
    $1 = ""
    sub(/^[[:space:]]+/, "")
    cmd = $0
    if (pid == me) next
    if (index(cmd, root) == 0) next
    if (excl(cmd)) next
    cat = ""
    if (cmd ~ /[[:space:]\/]nuxi[[:space:]]+dev/ || cmd ~ /[[:space:]\/]nuxt[[:space:]]+dev/) cat = "nuxt"
    else if (cmd ~ /[[:space:]]wrangler[[:space:]]+dev/ || cmd ~ /wrangler\.js[[:space:]]+dev/) cat = "wrangler"
    else if (cmd ~ /[[:space:]\/]miniflare/) cat = "miniflare"
    else if (cmd ~ /@playwright\/test/ || cmd ~ /[[:space:]]playwright[[:space:]]+test/ ||
        cmd ~ /[\/]playwright-mcp/ || cmd ~ /node_modules\/\.bin\/playwright([[:space:]]|$)/ ||
        cmd ~ /node_modules\/playwright\/cli/ || cmd ~ /node_modules\/playwright-core/) cat = "playwright"
    else if (cmd ~ /concurrently/ && cmd ~ /--filter/ && cmd ~ /dev/) cat = "concurrently"
    else if (cmd ~ /turbo[[:space:]]+run[[:space:]]+dev/) cat = "turbo"
    else if (cmd ~ /\/vite\// && cmd ~ /vite\.js/ && cmd !~ /[[:space:]]build([[:space:]]|$)/) cat = "vite"
    else if (cmd ~ /[[:space:]\/]listhen/) cat = "listhen"
    else if (cmd ~ /[[:space:]\/]workerd/) cat = "workerd"
    if (cat != "") print pid "\t" cat
  }'
}

dedupe_pid_tab_lines() {
  awk -F'	' 'NF >= 2 && !seen[$1]++ { print }'
}

paired_to_pids() {
  awk -F'	' '{ print $1 }'
}

summarize_categories() {
  awk -F'	' '
    NF >= 2 { c[$2]++ }
    END {
      n = 0
      for (k in c) n += c[k]
      if (n == 0) { print "0"; exit }
      out = ""
      for (k in c) {
        out = out (out ? ", " : "") k ": " c[k]
      }
      print n "\t" out
    }'
}

# Seeds: Playwright driver / test processes for this repo (used to tear down browsers).
collect_repo_playwright_seeds() {
  ps -ax -ww -o pid= -o command= 2>/dev/null | awk -v root="$REPO_ROOT" -v me="$$" '
  {
    pid = $1
    $1 = ""
    sub(/^[[:space:]]+/, "")
    cmd = $0
    if (pid == me) next
    if (index(cmd, root) == 0) next
    if (index(cmd, "dev-kill.sh") > 0) next
    if (cmd ~ /@playwright\/test/ || cmd ~ /[[:space:]]playwright[[:space:]]+test/ ||
        cmd ~ /[\/]playwright-mcp/ || cmd ~ /node_modules\/\.bin\/playwright([[:space:]]|$)/ ||
        cmd ~ /node_modules\/playwright\/cli/ || cmd ~ /node_modules\/playwright-core/) print pid
  }'
}

# BFS descendants (macOS pgrep -P); cap iterations to avoid runaway loops.
expand_descendants() {
  seeds=$1
  depth=0
  frontier=$seeds
  all=$seeds
  while [ -n "$frontier" ] && [ "$depth" -lt 12 ]; do
    next=''
    for p in $frontier; do
      for c in $(pgrep -P "$p" 2>/dev/null || true); do
        case " $all " in *" $c "*) ;; *)
          all="$all $c"
          next="$next $c"
          ;;
        esac
      done
    done
    frontier=$next
    depth=$((depth + 1))
  done
  echo "$all"
}

# Keep only PIDs whose command looks like a browser / driver helper (not arbitrary children).
filter_browserish_pids() {
  for p in $1; do
    cmd=$(ps -p "$p" -ww -o command= 2>/dev/null || true)
    case "$cmd" in
      *ms-playwright*) echo "$p" ;;
      *playwright*) echo "$p" ;;
      *Chromium*) echo "$p" ;;
      *chromium*) echo "$p" ;;
      *Chrome*for*Testing*) echo "$p" ;;
      *headless_shell*) echo "$p" ;;
      *WebKit*) echo "$p" ;;
      *) ;;
    esac
  done
}

dedupe_pids() {
  for p in $1; do
    [ -n "$p" ] || continue
    echo "$p"
  done | awk 'NF { if (!seen[$1]++) print $1 }'
}

count_pid_list() {
  n=0
  for _ in $1; do
    n=$((n + 1))
  done
  echo "$n"
}

signal_pids() {
  sig=$1
  shift
  for p in "$@"; do
    [ -n "$p" ] || continue
    kill "-$sig" "$p" 2>/dev/null || true
  done
}

print_summary() {
  echo ""
  echo "--- dev:kill summary ---"
  echo "Workspace: $REPO_ROOT"
  if [ "$STAT_PORTS_CLEARED" -gt 0 ]; then
    echo "Ports cleared: $STAT_PORTS_CLEARED"
    echo "$STAT_PORT_LINES" | while IFS= read -r line; do
      [ -z "$line" ] && continue
      port=${line%%	*}
      pid=${line#*	}
      echo "  port $port -> PID $pid"
    done
  else
    echo "Ports cleared: 0 (no listeners on scanned ports)"
  fi

  case "$STAT_REPO_BY_CAT" in
  0 | '')
    echo "Repo-anchored processes: 0"
    ;;
  *)
    total=${STAT_REPO_BY_CAT%%	*}
    rest=${STAT_REPO_BY_CAT#*	}
    echo "Repo-anchored processes: $total (by kind: $rest)"
    ;;
  esac
  echo "  SIGKILL after SIGTERM (repo dev): $STAT_REPO_KILL"

  if [ -z "${DEV_KILL_SKIP_PLAYWRIGHT_TREE:-}" ]; then
    echo "Playwright browser-related PIDs: SIGTERM $STAT_PW_BROWSER_TERM, SIGKILL $STAT_PW_BROWSER_KILL"
  else
    echo "Playwright browser tree walk: skipped (DEV_KILL_SKIP_PLAYWRIGHT_TREE)"
  fi
  echo "---"
}

# --- ports (web, showcase stack, common Vite HMR offsets) ---
ports=$(dedupe_ports "${NUXT_PORT:-3000}" 3000 3010 3011 3012 3013 3014 3015 3016 \
  24610 24611 24612 24613 24614 24615 24616 24617 24618 24619 24620 \
  24678 24679 24680 5173 5174 5175 8787 8788)
kill_port_listeners "$ports"

# --- repo-anchored processes ---
paired=$(collect_repo_dev_pid_categories | dedupe_pid_tab_lines)
pids=$(echo "$paired" | paired_to_pids)
STAT_REPO_BY_CAT=$(echo "$paired" | summarize_categories)

if [ -n "$pids" ]; then
  # shellcheck disable=SC2086
  signal_pids TERM $pids
fi

if [ -z "${DEV_KILL_SKIP_PLAYWRIGHT_TREE:-}" ]; then
  seeds=$(collect_repo_playwright_seeds)
  if [ -n "$seeds" ]; then
    tree=$(expand_descendants "$seeds")
    browserish=$(filter_browserish_pids "$tree")
    bp=$(dedupe_pids "$browserish")
    if [ -n "$bp" ]; then
      STAT_PW_BROWSER_TERM=$(count_pid_list "$bp")
      # shellcheck disable=SC2086
      signal_pids TERM $bp
    fi
  fi
fi

sleep 2

if [ -n "$pids" ]; then
  survivors=''
  for p in $pids; do
    if kill -0 "$p" 2>/dev/null; then
      survivors="$survivors $p"
    fi
  done
  if [ -n "$survivors" ]; then
    STAT_REPO_KILL=$(count_pid_list "$survivors")
    # shellcheck disable=SC2086
    signal_pids KILL $survivors
  fi
fi

if [ -z "${DEV_KILL_SKIP_PLAYWRIGHT_TREE:-}" ] && [ -n "$seeds" ]; then
  tree=$(expand_descendants "$seeds")
  browserish=$(filter_browserish_pids "$tree")
  bp=$(dedupe_pids "$browserish")
  bk=0
  for p in $bp; do
    if kill -0 "$p" 2>/dev/null; then
      signal_pids KILL "$p"
      bk=$((bk + 1))
    fi
  done
  STAT_PW_BROWSER_KILL=$bk
fi

print_summary

export REPO_ROOT
sh "$SCRIPT_DIR/cleanup-node-leaks.sh" || true

echo "Done."

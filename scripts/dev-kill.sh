#!/usr/bin/env sh
# Kill local dev servers for this app and clean up leaked Node processes.
set -e
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)

for port in "${NUXT_PORT:-3000}" 3000; do
  pid=$(lsof -ti :"$port" 2>/dev/null) || true
  if [ -n "$pid" ]; then
    kill $pid 2>/dev/null && echo "Killed process on port $port (PID $pid)" || true
  fi
done

sh "$SCRIPT_DIR/cleanup-node-leaks.sh" || true

echo "Done."

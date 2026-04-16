#!/usr/bin/env sh
# Kill local dev servers for this app and clean up leaked Node processes.
set -e
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
PROVISIONED_NUXT_PORT=''

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

if [ -z "${NUXT_PORT:-}" ] && [ -f "$REPO_ROOT/provision.json" ]; then
  PROVISIONED_NUXT_PORT=$(
    node -e "const fs=require('node:fs'); try { const parsed=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); const port=parsed?.localDev?.nuxtPort; if (Number.isInteger(port) && port >= 1 && port <= 65535) process.stdout.write(String(port)); } catch {}" \
      "$REPO_ROOT/provision.json"
  )
fi

primary_port="${NUXT_PORT:-${PROVISIONED_NUXT_PORT:-3000}}"
for port in $(dedupe_ports "$primary_port" ${PROVISIONED_NUXT_PORT:+$PROVISIONED_NUXT_PORT} 3000); do
  pid=$(lsof -ti :"$port" 2>/dev/null) || true
  if [ -n "$pid" ]; then
    kill $pid 2>/dev/null && echo "Killed process on port $port (PID $pid)" || true
  fi
done

sh "$SCRIPT_DIR/cleanup-node-leaks.sh" || true

echo "Done."

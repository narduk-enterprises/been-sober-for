#!/usr/bin/env bash
set -euo pipefail

DB_NAME="been-sober-for-db"
IS_REMOTE=false

for arg in "$@"; do
  if [[ "$arg" == "--remote" ]]; then
    IS_REMOTE=true
    break
  fi
done

if [[ "$IS_REMOTE" == false ]]; then
  wrangler d1 execute "$DB_NAME" "$@" --file=node_modules/@narduk-enterprises/narduk-nuxt-template-layer/drizzle/seed.sql
fi

if [[ -f drizzle/seed.sql ]]; then
  wrangler d1 execute "$DB_NAME" "$@" --file=drizzle/seed.sql
fi

#!/usr/bin/env bash
set -euo pipefail

# Create Doppler config prd_copilot (-e prd) on each active fleet project that
# lacks it, then upload minimal Copilot/GitHub Packages keys copied from a
# template project (default: been-sober-for / prd_copilot).

TEMPLATE_PROJECT="${TEMPLATE_PROJECT:-been-sober-for}"
TEMPLATE_CONFIG="${TEMPLATE_CONFIG:-prd_copilot}"

TMP="$(mktemp)"
cleanup() { rm -f "$TMP"; }
trap cleanup EXIT

doppler secrets download --no-file --format json -p "$TEMPLATE_PROJECT" -c "$TEMPLATE_CONFIG" \
  | jq 'with_entries(select(.key as $k | ["CLOUDFLARE_ACCOUNT_ID","CLOUDFLARE_API_TOKEN","COPILOT_GITHUB_TOKEN","GITHUB_TOKEN_PACKAGES_READ"] | index($k))) | with_entries(select(.value != null and .value != ""))' \
  > "$TMP"

KEYCOUNT="$(jq 'length' "$TMP")"
if [[ "$KEYCOUNT" -lt 1 ]]; then
  echo "Template minimal JSON empty; check $TEMPLATE_PROJECT / $TEMPLATE_CONFIG"
  exit 1
fi
echo "Template keys ($KEYCOUNT): $(jq -r 'keys | join(", ")' "$TMP")"

ok=0
skip=0
fail=0
failed=()

while read -r proj; do
  echo ""
  echo "======== $proj ========"
  if doppler secrets download --no-file --format json -p "$proj" -c prd_copilot >/dev/null 2>&1; then
    echo "skip: prd_copilot already exists"
    skip=$((skip + 1))
    continue
  fi

  set +e
  create_out="$(doppler configs create prd_copilot -p "$proj" -e prd 2>&1)"
  create_st=$?
  set -e
  if [[ $create_st -ne 0 ]]; then
    if doppler configs -p "$proj" 2>/dev/null | grep -q prd_copilot; then
      echo "create skipped (config already present)"
    else
      echo "FAIL create: $create_out"
      fail=$((fail + 1))
      failed+=("$proj")
      continue
    fi
  fi

  set +e
  upload_out="$(doppler --silent secrets upload "$TMP" -p "$proj" -c prd_copilot 2>&1)"
  upload_st=$?
  set -e
  if [[ $upload_st -eq 0 ]]; then
    echo "OK: secrets uploaded"
    ok=$((ok + 1))
  else
    echo "FAIL upload: $upload_out"
    fail=$((fail + 1))
    failed+=("$proj")
  fi
done < <(narduk fleet apps --format json | jq -r '.[] | select(.is_active == true) | .doppler_project' | sort -u)

echo ""
echo "======== SUMMARY ========"
echo "uploaded/new: $ok  skipped: $skip  fail: $fail"
if [[ ${#failed[@]} -gt 0 ]]; then
  echo "Failed projects: ${failed[*]}"
fi

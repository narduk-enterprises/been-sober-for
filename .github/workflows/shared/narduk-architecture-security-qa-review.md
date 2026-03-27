<!-- Architecture, security, and QA guidance for inherited workflows. -->

# Architecture, Security, and QA Review

Use this guidance as the final high-signal pass after the stack-specific checks.

## Architecture and anti-pattern checks

- Look for logic in the wrong layer, duplicated abstractions, broken module
  boundaries, or "thin wrapper over thin wrapper" patterns that add indirection
  without value.
- Prefer findings that can explain real maintenance cost, defect risk, or
  coupling problems. Do not report abstract architecture opinions.

## Security checks

- In JavaScript or TypeScript server code, flag insecure defaults such as
  missing input validation, direct trust of client data, unsafe auth flows,
  secrets in code, or permissive cross-origin behavior.
- Be careful with generic advice. Only report concrete vulnerabilities or clear
  departures from the repository's documented security posture.

## QA and E2E checks

- When behavior changes, check whether tests cover the affected path. Flag
  missing or stale tests only when the risk is meaningful.
- Prioritize user-journey gaps: auth, critical forms, content routing, checkout
  or provisioning flows, and regressions that would have been caught by a
  focused E2E or integration test.
- Suggest validation commands that match the repo, but do not block on
  heavyweight installs if the environment is clearly missing the required
  credentials or packages.

## Output expectations

- Rank findings by severity and confidence.
- Pair every finding with the smallest credible next step.
- If you cannot verify a suspected issue, downgrade it to a validation gap
  instead of presenting it as a confirmed bug.

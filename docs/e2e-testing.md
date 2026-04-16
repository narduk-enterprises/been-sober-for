# E2E Testing

## Shared Baseline

The starter uses a shared Playwright baseline:

- shared fixtures and auth contracts live in the published Narduk bundle
- `apps/web/tests/e2e/` keeps the app's thin local specs
- local `fixtures.ts` files re-export the bundle fixtures instead of duplicating
  readiness and auth helpers

The split is intentional:

- the bundle owns reusable fixtures, auth contracts, and stable selectors
- the app owns wrapper specs, app-specific flows, and custom assertions

## Current Starter Layout

- root `playwright.config.ts` defines a single Playwright project for `apps/web`
- `apps/web/tests/e2e/` is the baseline for local smoke and auth coverage
- `.template-reference/playwright.config.ts` mirrors the same baseline for sync
  and drift checks

## How To Extend Coverage

1. Import fixtures from the local `tests/e2e/fixtures.ts`.
2. Keep the shared smoke and auth baseline unless the app intentionally replaces
   it.
3. Add local specs for product-specific flows such as onboarding, billing,
   dashboards, or admin tools.
4. Promote reusable readiness or auth helpers back into the bundle instead of
   copying them across apps.

## Running Tests

- Full starter suite: `pnpm test:e2e`
- App-only entrypoint: `pnpm test:e2e:web`

## Agent Expectations

When adding or changing features:

- add unit tests for core logic where appropriate
- add E2E coverage for critical user-visible flows
- keep tests robust enough to run against both local and deployed environments
  when practical

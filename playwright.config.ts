import { defineConfig, devices } from '@playwright/test'

const testPort = Number(process.env.PLAYWRIGHT_PORT || 4173)
const resolvedPort = Number.isFinite(testPort) ? testPort : 4173
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${resolvedPort}`
const configuredWorkers = Number(process.env.PLAYWRIGHT_WORKERS || 1)
const workerCount =
  Number.isFinite(configuredWorkers) && configuredWorkers > 0 ? configuredWorkers : 1

/**
 * Derived-app baseline for Playwright config.
 * Downstream apps can customize this file, but this version is the template
 * reference for a single-app monorepo with tests under apps/web/tests/e2e.
 */
export default defineConfig({
  fullyParallel: workerCount > 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  maxFailures: process.env.CI ? undefined : 1,
  workers: workerCount,
  reporter: 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    trace: 'on-first-retry',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  webServer: {
    command:
      `NUXT_PORT=${resolvedPort} NITRO_PORT=${resolvedPort} ` +
      `pnpm --filter web run db:ready && ` +
      `pnpm --filter web exec nuxt dev --port ${resolvedPort} --host localhost`,
    url: baseURL,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === 'true',
    timeout: 120_000,
  },
  projects: [
    {
      name: 'web',
      testDir: 'apps/web/tests/e2e',
      use: { ...devices['Desktop Chrome'], baseURL },
    },
  ],
})

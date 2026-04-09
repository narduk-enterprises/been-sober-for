import { existsSync, lstatSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { listLayerBundleDefinitions } from './layer-bundle-manifest'
import { getProvisionDisplayName, readProvisionMetadata } from './provision-metadata'

export const VERBATIM_SYNC_FILES = [
  '.dockerignore',
  '.githooks/pre-commit',
  '.githooks/post-checkout',
  '.githooks/post-merge',
  'tools/install-git-hooks.cjs',
  'tools/command.ts',
  'tools/layer-bundle-manifest.ts',
  'tools/provision-metadata.ts',
  'tools/template-layer-selection.ts',
  'tools/theme-manifest.ts',
  'tools/app-template-manifest.ts',
  'tools/starter-composition.ts',
  'tools/check-guardrails.ts',
  'tools/sync-template.ts',
  'tools/sync-core.ts',
  'tools/package-registry.ts',
  'tools/sync-manifest.ts',
  'tools/check-drift-ci.ts',
  'tools/check-sync-health.ts',
  'tools/generate-favicons.ts',
  'tools/configure-package-registry-auth.mjs',
  'tools/db-migrate.sh',
  'tools/check-setup.cjs',
  'scripts/dev-kill.sh',
  'scripts/cleanup-node-leaks.sh',
  'turbo.json',
  'pnpm-workspace.yaml',
  'renovate.json',
  '.cursor/rules/user-global-skills.mdc',
  'apps/web/.nuxtrc',
  'apps/web/.npmrc',
  'apps/web/eslint.config.mjs',
  'prettier.config.mjs',
  '.prettierignore',
  '.editorconfig',
] as const

export const AUTH_BRIDGE_SYNC_FILES = [
  'apps/web/auth-environment.ts',
  'apps/web/app/components/AuthExchangePanel.vue',
  'apps/web/app/components/AuthLoginCard.vue',
  'apps/web/app/components/AuthRegisterCard.vue',
  'apps/web/app/composables/useAuth.ts',
  'apps/web/app/composables/useAuthApi.ts',
  'apps/web/app/composables/useManagedSupabase.ts',
  'apps/web/app/middleware/auth.ts',
  'apps/web/app/middleware/guest.ts',
  'apps/web/app/layouts/auth.vue',
  'apps/web/app/layouts/blank.vue',
  'apps/web/app/pages/auth/callback.vue',
  'apps/web/app/pages/auth/confirm.vue',
  'apps/web/app/pages/logout.vue',
  'apps/web/app/pages/reset-password.vue',
  'apps/web/app/types/auth.d.ts',
  'apps/web/app/types/runtime-config.d.ts',
  'apps/web/server/api/auth/change-password.post.ts',
  'apps/web/server/api/auth/account/delete.post.ts',
  'apps/web/server/api/auth/login.post.ts',
  'apps/web/server/api/auth/logout.post.ts',
  'apps/web/server/api/auth/me.get.ts',
  'apps/web/server/api/auth/me.patch.ts',
  'apps/web/server/api/auth/mfa/enroll.post.ts',
  'apps/web/server/api/auth/mfa/verify.post.ts',
  'apps/web/server/api/auth/oauth/start.post.ts',
  'apps/web/server/api/auth/password/reset.post.ts',
  'apps/web/server/api/auth/register.post.ts',
  'apps/web/server/api/auth/session/exchange.get.ts',
  'apps/web/server/api/auth/session/exchange.post.ts',
  'apps/web/server/middleware/00-canonical-host.ts',
  'apps/web/server/middleware/auth-session-refresh.ts',
  'apps/web/server/database/auth-bridge-pg-schema.ts',
  'apps/web/server/database/auth-bridge-schema.ts',
  'apps/web/server/database/pg-app-schema.ts',
  'apps/web/server/database/pg-schema.ts',
  'apps/web/server/utils/auth-callback.ts',
  'apps/web/server/utils/app-auth.ts',
  'apps/web/server/utils/accountDeletionBridge.ts',
  'apps/web/server/utils/auth-session-stability.ts',
  'apps/web/server/utils/session-user.ts',
  'apps/web/server/utils/supabase.ts',
  'apps/web/drizzle/0001_auth_bridge.sql',
] as const

export const BOOTSTRAP_SYNC_FILES = ['guardrail-exceptions.json'] as const

// `.template-reference` is reserved for baselines that are intentionally
// allowed to diverge in downstream apps while still keeping a template copy to
// diff against locally.
export const REFERENCE_BASELINE_FILES = [
  '.template-reference/README.md',
  '.template-reference/AGENTS.md',
  '.template-reference/apps/web/AGENTS.md',
  '.template-reference/tools/AGENTS.md',
  '.template-reference/CONTRIBUTING.md',
  '.template-reference/playwright.config.ts',
] as const

export const RECURSIVE_SYNC_DIRECTORIES = [
  'deploy/preview',
  'patches',
  'vendor',
  'tools/guardrails',
  '.agents/workflows',
] as const

export const STALE_SYNC_PATHS = [
  '.agents/skills',
  '.agents/.DS_Store',
  '.github/aw',
  '.github/skills',
  '.github/copilot-instructions.md',
  '.github/prompts/ui-ux-pro-max',
  '.github/workflows/gh-aw-compile.yml',
  '.github/workflows/provisioned-app-build.lock.yml',
  '.github/workflows/provisioned-app-build.md',
  '.github/workflows/pr-guardrails-review.lock.yml',
  '.github/workflows/pr-guardrails-review.md',
  '.github/workflows/repo-bug-finder.lock.yml',
  '.github/workflows/repo-bug-finder.md',
  '.github/workflows/nuxt-consistency-sweep.lock.yml',
  '.github/workflows/nuxt-consistency-sweep.md',
  '.github/workflows/seo-content-sweep.lock.yml',
  '.github/workflows/seo-content-sweep.md',
  '.github/workflows/shared',
  '.github/workflows/publish-layer.yml',
  '.github/workflows/deploy-showcase.yml',
  'apps/showcase',
  '.github/workflows/deploy.yml',
  '.github/workflows/version-bump.yml',
  '.github/workflows/template-sync-bot.yml',
  '.github/workflows/template-sync-reconcile.yml',
  '.github/workflows/sync-fleet.yml',
  'config/fleet-sync-repos.json',
  'config/fleet-app-dir-overrides.json',
  'tools/migrate-to-monorepo.ts',
  'tools/check-setup.js',
  'tools/agentic-workflow-manifest.ts',
  'tools/fleet-git.ts',
  'tools/fleet-projects.ts',
  'tools/fleet-runner.ts',
  'tools/gsc-verify.ts',
  'tools/reconcile-template-sync-prs.ts',
  'tools/run-remote-d1-migrate.mjs',
  'tools/report-app-operation.mjs',
  'tools/web-deploy.cjs',
  'tools/tail.ts',
  'tools/ship.ts',
  'tools/sync-copilot-secrets.ts',
  'tools/sync-github-skills.ts',
  'tools/template-sync-bot.ts',
  'tools/validate.ts',
  'tools/validate-production-env.mjs',
  'packages/eslint-config',
  'scripts/fleet-quality.sh',
  'scripts/fleet-status.sh',
  '.cursor/.DS_Store',
  '.cursor/rules/nuxt-v4-template.mdc',
  '.env',
  '.env.local',
  '.env.example',
  '.template-reference/.DS_Store',
  '.template-reference/build-visibility.md',
  '.template-reference/ui-ux-pro-max',
  'layers/narduk-nuxt-layer',
] as const

export const GENERATED_SYNC_FILES = ['.github/workflows/ci.yml'] as const

const STARTER_APP_NAME_PLACEHOLDER = '__APP_NAME__'
const STARTER_DISPLAY_NAME_PLACEHOLDER = '__DISPLAY_NAME__'
const STARTER_SITE_URL_PLACEHOLDER = '__SITE_URL__'

const DEPLOY_REPO_SECRET_KEYS = [
  'APP_BACKEND_PRESET',
  'AUTH_AUTHORITY_URL',
  'AUTH_BACKEND',
  'AUTH_ENFORCE_CANONICAL_HOST',
  'AUTH_PROVIDERS',
  'AUTH_PUBLIC_SIGNUP',
  'AUTH_REQUIRE_MFA',
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_API_TOKEN',
  'SECRETS_KEYRING',
  'SECRETS_MASTER_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_AUTH_ANON_KEY',
  'SUPABASE_AUTH_SERVICE_ROLE_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_URL',
  'TURNSTILE_SECRET_KEY',
  'TURNSTILE_SITE_KEY',
  ...listLayerBundleDefinitions().flatMap((bundle) => bundle.requiredEnvKeys),
] as const

const UNIQUE_DEPLOY_REPO_SECRET_KEYS = [...new Set(DEPLOY_REPO_SECRET_KEYS)]
const REQUIRED_DEPLOY_SECRET_KEYS = [
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
  'NARDUK_PLATFORM_GH_PACKAGES_RW',
] as const

export interface GeneratedSyncContext {
  appDisplayName: string
  appName: string
  siteUrl: string
}

function quoteYamlString(value: string): string {
  return JSON.stringify(value)
}

function buildDeployRepoSecretEnvLines(indent = '      '): string {
  return UNIQUE_DEPLOY_REPO_SECRET_KEYS.map(
    (key) => `${indent}${key}: \${{ secrets.${key} }}`,
  ).join('\n')
}

export function getDefaultGeneratedSyncContext(): GeneratedSyncContext {
  return {
    appName: STARTER_APP_NAME_PLACEHOLDER,
    appDisplayName: STARTER_DISPLAY_NAME_PLACEHOLDER,
    siteUrl: STARTER_SITE_URL_PLACEHOLDER,
  }
}

export function resolveGeneratedSyncContext(rootDir: string): GeneratedSyncContext {
  const provision = readProvisionMetadata(rootDir)
  const defaults = getDefaultGeneratedSyncContext()

  return {
    appName: provision.name || defaults.appName,
    appDisplayName: getProvisionDisplayName(provision, defaults.appDisplayName),
    siteUrl: provision.url || defaults.siteUrl,
  }
}

// These are the root package.json keys that the starter owns downstream.
export const FLEET_ROOT_SCRIPT_PATCHES: Readonly<Record<string, string>> = {
  postinstall:
    "node -e \"if(!require('fs').existsSync('.setup-complete'))console.log('\\n⚠️  This repo is incomplete until project setup finishes (writes .setup-complete). See AGENTS.md and local setup docs.\\n')\"",
  predev: 'node tools/check-setup.cjs',
  dev: 'pnpm --filter web dev',
  prebuild: 'node tools/check-setup.cjs',
  build: 'pnpm -r build',
  'package-registry:auth': 'node tools/configure-package-registry-auth.mjs',
  preship:
    'node tools/check-setup.cjs && if [ -n "${NARDUK_PLATFORM_GH_PACKAGES_RW:-}" ]; then pnpm run package-registry:auth && NPM_CONFIG_USERCONFIG="$PWD/.npmrc.auth" NPM_CONFIG_GLOBALCONFIG=/dev/null pnpm install; else pnpm install; fi && pnpm audit --audit-level=critical && pnpm exec tsx tools/check-drift-ci.ts && pnpm exec tsx tools/check-sync-health.ts && pnpm run quality:check && pnpm -r --if-present test:unit',
  'sync-template': 'pnpm exec tsx tools/sync-template.ts .',
  lint: 'turbo run lint',
  typecheck: 'turbo run typecheck',
  'check:sync-health': 'pnpm exec tsx tools/check-sync-health.ts',
  'hooks:install': 'node tools/install-git-hooks.cjs',
  'guardrails:repo': 'pnpm exec tsx tools/check-guardrails.ts',
  quality: 'pnpm run quality:fix && pnpm run quality:check',
  'quality:check': "pnpm run guardrails:repo && turbo run quality --filter='./apps/*'",
  'quality:fix': 'turbo run lint --force -- --fix && pnpm run format',
  check: 'pnpm run quality:check',
  clean:
    "find . -type d \\( -name node_modules -o -name .nuxt -o -name .output -o -name .nitro -o -name .wrangler -o -name .turbo -o -name .data -o -name dist \\) -not -path './.git/*' -prune -exec rm -rf {} +",
  'clean:install':
    'pnpm run clean && if [ -n "${NARDUK_PLATFORM_GH_PACKAGES_RW:-}" ]; then pnpm run package-registry:auth && NPM_CONFIG_USERCONFIG="$PWD/.npmrc.auth" NPM_CONFIG_GLOBALCONFIG=/dev/null pnpm install; else pnpm install; fi && pnpm --filter web run db:ready',
  'db:migrate': 'pnpm --filter web run db:migrate',
  'dev:kill': 'sh scripts/dev-kill.sh',
  'cleanup:node-leaks': 'sh scripts/cleanup-node-leaks.sh',
  'test:e2e': 'playwright test',
  'test:e2e:web': 'pnpm --filter web test:e2e',
  'generate:favicons': 'pnpm exec tsx tools/generate-favicons.ts',
  format: 'prettier --write "**/*.{ts,mts,vue,js,mjs,json,yaml,yml,css,md}"',
  'format:check': 'prettier --check "**/*.{ts,mts,vue,js,mjs,json,yaml,yml,css,md}"',
}

export const FLEET_WEB_SCRIPT_PATCHES: Readonly<Record<string, string>> = {
  predev: 'pnpm run db:ready',
  dev: 'nuxt dev',
  build: 'nuxt build',
  deploy: 'pnpm exec wrangler deploy --env=""',
  lint: 'eslint . --max-warnings 0',
  quality: "echo 'Turbo dependsOn handles lint + typecheck + format:check'",
}

const TRANSIENT_DIRECTORY_PATTERN =
  /(^|\/)(node_modules|coverage|dist|\.turbo|\.nuxt|\.output|\.nitro|\.wrangler|\.data|__pycache__)(\/|$)/

export function isIgnoredManagedPath(fullPath: string): boolean {
  return TRANSIENT_DIRECTORY_PATTERN.test(fullPath) || basename(fullPath) === '.DS_Store'
}

export function getCanonicalCiContent(): string {
  return `name: CI

on:
  workflow_dispatch:

concurrency:
  group: ci-\${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

# CI is disabled (workflow_dispatch only) to conserve GitHub Actions minutes.
# Deploy is app-local via \`pnpm --filter web run deploy\`.
# See .agents/workflows/deploy.md for the local deploy workflow.

jobs:
  quality:
    uses: narduk-enterprises/narduk-template/.github/workflows/reusable-quality.yml@main
    secrets:
      NARDUK_PLATFORM_GH_PACKAGES_RW: \${{ secrets.NARDUK_PLATFORM_GH_PACKAGES_RW }}
`
}

export function getCanonicalDeployMainContent(context: Partial<GeneratedSyncContext> = {}): string {
  const resolvedContext = {
    ...getDefaultGeneratedSyncContext(),
    ...context,
  }
  const deployRepoSecretEnvLines = buildDeployRepoSecretEnvLines()
  const requiredDeployKeys = REQUIRED_DEPLOY_SECRET_KEYS.join(' ')

  return `name: Production Deploy

on:
  push:
    branches:
      - main
  workflow_dispatch:
    inputs:
      run_migrate:
        description: >
          Run remote D1 migrations before deploying.
          Set to "true" only when this deployment includes schema changes.
        required: false
        default: "false"
        type: choice
        options:
          - "false"
          - "true"

concurrency:
  group: deploy-main-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  deploy:
    name: Production Deploy
    runs-on: deploy
    timeout-minutes: 45

    permissions:
      contents: read

    env:
      APP_NAME: ${quoteYamlString(resolvedContext.appDisplayName)}
      CI: "true"
      NARDUK_PLATFORM_GH_PACKAGES_RW: \${{ secrets.NARDUK_PLATFORM_GH_PACKAGES_RW }}
      NUXT_TELEMETRY_DISABLED: "1"
      SITE_URL: ${quoteYamlString(resolvedContext.siteUrl)}
${deployRepoSecretEnvLines}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up pnpm
        uses: pnpm/action-setup@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: pnpm

      - name: Validate deploy environment
        run: |
          set -euo pipefail

          for key in ${requiredDeployKeys}; do
            if [[ -z "\${!key:-}" ]]; then
              echo "::error::Missing $key for deploy."
              exit 1
            fi
          done

          echo "Using repository-managed deploy secrets."
        working-directory: .

      - name: Configure package registry auth
        run: |
          node ./tools/configure-package-registry-auth.mjs

      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        env:
          NPM_CONFIG_USERCONFIG: \${{ github.workspace }}/.npmrc.auth
          NPM_CONFIG_GLOBALCONFIG: /dev/null

      - name: Build
        working-directory: apps/web
        run: pnpm run build
        env:
          NODE_OPTIONS: --max-old-space-size=3072

      - name: Migrate (remote D1)
        if: \${{ inputs.run_migrate == 'true' }}
        working-directory: apps/web
        run: |
          set -euo pipefail
          cmd=$(node -e "const fs=require('node:fs'); const pkg=JSON.parse(fs.readFileSync('package.json','utf8')); const value=(pkg.scripts?.['db:migrate'] || '').replaceAll('--local', '--remote'); process.stdout.write(value)")
          if [[ -z "$cmd" ]]; then
            echo "No db:migrate script found, skipping."
            exit 0
          fi
          bash -lc "$cmd"

      - name: Deploy
        working-directory: apps/web
        run: pnpm run deploy
`
}

export function getGeneratedSyncFileContent(
  relativePath: string,
  context: Partial<GeneratedSyncContext> = {},
): string | null {
  if (relativePath === '.github/workflows/ci.yml') {
    return getCanonicalCiContent()
  }

  return null
}

function shouldIgnoreEntry(fullPath: string): boolean {
  return isIgnoredManagedPath(fullPath)
}

function collectFilesUnderDirectory(rootDir: string, relativeDir: string): string[] {
  const start = join(rootDir, relativeDir)
  if (!existsSync(start)) return []

  const files: string[] = []

  const visit = (fullPath: string, relativePath: string) => {
    if (shouldIgnoreEntry(fullPath)) return

    const stat = lstatSync(fullPath)
    if (stat.isSymbolicLink()) {
      files.push(relativePath)
      return
    }

    if (stat.isDirectory()) {
      for (const entry of readdirSync(fullPath)) {
        const entryFullPath = join(fullPath, entry)
        const entryRelativePath = join(relativePath, entry)
        visit(entryFullPath, entryRelativePath)
      }
      return
    }

    files.push(relativePath)
  }

  visit(start, relativeDir)
  return files
}

export function collectManagedTemplateFiles(templateRoot: string): string[] {
  const tracked = new Set<string>()

  for (const file of VERBATIM_SYNC_FILES) {
    if (existsSync(join(templateRoot, file))) {
      tracked.add(file)
    }
  }

  for (const file of AUTH_BRIDGE_SYNC_FILES) {
    if (existsSync(join(templateRoot, file))) {
      tracked.add(file)
    }
  }

  for (const file of REFERENCE_BASELINE_FILES) {
    if (existsSync(join(templateRoot, file))) {
      tracked.add(file)
    }
  }

  for (const directory of RECURSIVE_SYNC_DIRECTORIES) {
    for (const file of collectFilesUnderDirectory(templateRoot, directory)) {
      tracked.add(file)
    }
  }

  for (const file of GENERATED_SYNC_FILES) {
    tracked.add(file)
  }

  return [...tracked].sort()
}

export function normalizeManagedContent(relativePath: string, content: string): string {
  return content
}

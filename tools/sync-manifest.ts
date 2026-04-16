import { existsSync, lstatSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { listLayerBundleDefinitions } from './layer-bundle-manifest'
import { getProvisionDisplayName, readProvisionMetadata } from './provision-metadata'

export const VERBATIM_SYNC_FILES = [
  'AGENTS.md',
  '.dockerignore',
  '.githooks/pre-commit',
  '.githooks/post-checkout',
  '.githooks/post-merge',
  'tools/ensure-worktree-install.cjs',
  'tools/format-staged-files.cjs',
  'tools/install-git-hooks.cjs',
  'tools/postinstall.cjs',
  'tools/command.ts',
  'tools/env-input-catalog.ts',
  'tools/layer-bundle-manifest.ts',
  'tools/provision-metadata.ts',
  'tools/wrangler-deploy.ts',
  'tools/template-layer-selection.ts',
  'tools/theme-manifest.ts',
  'tools/app-template-manifest.ts',
  'tools/starter-composition.ts',
  'tools/check-guardrails.ts',
  'tools/sync-template.ts',
  'tools/sync-core.ts',
  'tools/sync-files.ts',
  'tools/sync-root-package.ts',
  'tools/sync-web-package.ts',
  'tools/sync-nuxt-config.ts',
  'tools/sync-wrangler.ts',
  'tools/sync-database.ts',
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
  'docs/e2e-testing.md',
] as const

export const AUTH_BRIDGE_SYNC_FILES = [
  'apps/web/auth-environment.ts',
  'apps/web/app/composables/useAuth.ts',
  'apps/web/app/composables/useManagedSupabase.ts',
  'apps/web/app/composables/useManagedSupabaseClient.ts',
  'apps/web/app/composables/useManagedSupabaseConfig.ts',
  'apps/web/app/composables/useManagedSupabaseRpc.ts',
  'apps/web/app/composables/useManagedSupabaseStorage.ts',
  'apps/web/app/layouts/auth.vue',
  'apps/web/app/layouts/blank.vue',
  'apps/web/app/utils/managedSupabase.ts',
  'apps/web/app/types/runtime-config.d.ts',
  'apps/web/server/middleware/00-canonical-host.ts',
  'apps/web/server/middleware/auth-session-refresh.ts',
  'apps/web/server/database/auth-bridge-pg-schema.ts',
  'apps/web/server/database/auth-bridge-schema.ts',
  'apps/web/server/database/pg-schema.ts',
  'apps/web/server/utils/supabase.ts',
  'apps/web/drizzle/0001_auth_bridge.sql',
] as const

export const SEEDED_APP_OWNED_FILES = [
  'apps/web/app/composables/useAuthApi.ts',
  'apps/web/server/database/pg-app-schema.ts',
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
  'docs/agents',
  'vendor',
  'tools/guardrails',
  '.agents/workflows',
] as const

export const STALE_SYNC_PATHS = [
  'patches/@nuxt__image@2.0.0.patch',
  'patches/@narduk-enterprises__narduk-nuxt-template-layer-core@1.2.18.patch',
  '.agents/.DS_Store',
  '.forgejo',
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

export const GENERATED_SYNC_FILES = [
  '.github/workflows/ci.yml',
  '.github/workflows/copilot-setup-steps.yml',
  'skills.config.json',
] as const

const SYNC_OWNERSHIP_PATH_GROUPS = {
  'verbatim sync files': VERBATIM_SYNC_FILES,
  'auth bridge sync files': AUTH_BRIDGE_SYNC_FILES,
  'seeded app-owned files': SEEDED_APP_OWNED_FILES,
  'bootstrap sync files': BOOTSTRAP_SYNC_FILES,
  'reference baseline files': REFERENCE_BASELINE_FILES,
  'recursive sync directories': RECURSIVE_SYNC_DIRECTORIES,
  'generated sync files': GENERATED_SYNC_FILES,
} as const

export interface SyncManifestOwnershipConflict {
  path: string
  groups: string[]
}

export function getSyncManifestOwnershipConflicts(): SyncManifestOwnershipConflict[] {
  const groupsByPath = new Map<string, string[]>()

  for (const [group, paths] of Object.entries(SYNC_OWNERSHIP_PATH_GROUPS)) {
    for (const path of paths) {
      const existing = groupsByPath.get(path) ?? []
      existing.push(group)
      groupsByPath.set(path, existing)
    }
  }

  return [...groupsByPath.entries()]
    .filter(([, groups]) => groups.length > 1)
    .map(([path, groups]) => ({ path, groups }))
    .sort((left, right) => left.path.localeCompare(right.path))
}

export function assertValidSyncManifestOwnership(): void {
  const conflicts = getSyncManifestOwnershipConflicts()
  if (conflicts.length === 0) return

  throw new Error(
    `Sync manifest ownership categories overlap:\n${conflicts
      .map(({ path, groups }) => `- ${path}: ${groups.join(', ')}`)
      .join('\n')}`,
  )
}

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
  postinstall: 'node tools/postinstall.cjs',
  predev: 'node tools/check-setup.cjs',
  dev: 'pnpm --filter web dev',
  prebuild: 'node tools/check-setup.cjs',
  build: 'pnpm -r build',
  'package-registry:auth': 'node tools/configure-package-registry-auth.mjs',
  'sync:skills': 'narduk-skills sync --clean',
  preship:
    'node tools/check-setup.cjs && if [ -n "${NARDUK_PLATFORM_GH_PACKAGES_READ:-${NARDUK_PLATFORM_GH_PACKAGES_RW:-}}" ]; then pnpm run package-registry:auth && NPM_CONFIG_USERCONFIG="$PWD/.npmrc.auth" NPM_CONFIG_GLOBALCONFIG=/dev/null pnpm install; else pnpm install; fi && pnpm audit --audit-level=critical && pnpm exec tsx tools/check-drift-ci.ts && pnpm exec tsx tools/check-sync-health.ts && pnpm run quality:check && pnpm -r --if-present test:unit',
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
    'pnpm run clean && if [ -n "${NARDUK_PLATFORM_GH_PACKAGES_READ:-${NARDUK_PLATFORM_GH_PACKAGES_RW:-}}" ]; then pnpm run package-registry:auth && NPM_CONFIG_USERCONFIG="$PWD/.npmrc.auth" NPM_CONFIG_GLOBALCONFIG=/dev/null pnpm install; else pnpm install; fi && pnpm --filter web run db:ready',
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
  build:
    'export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=${NARDUK_BUILD_MAX_OLD_SPACE_SIZE:-4096}"; nuxt build',
  'cf:build':
    'if [ -n "${NARDUK_PLATFORM_GH_PACKAGES_READ:-${NARDUK_PLATFORM_GH_PACKAGES_RW:-}}" ]; then pnpm -C ../.. run package-registry:auth && NPM_CONFIG_USERCONFIG="$(cd ../.. && pwd)/.npmrc.auth" NPM_CONFIG_GLOBALCONFIG=/dev/null pnpm -C ../.. install --frozen-lockfile; else pnpm -C ../.. install --frozen-lockfile; fi && pnpm run build',
  'cf:build:production':
    'NARDUK_DEPLOY_TARGET=production NARDUK_PREVIEW_SAFE_MODE=false pnpm run cf:build',
  'cf:build:staging':
    'NARDUK_DEPLOY_TARGET=staging NARDUK_PREVIEW_SAFE_MODE=false pnpm run cf:build',
  'cf:build:preview':
    'NARDUK_DEPLOY_TARGET=preview NARDUK_PREVIEW_SAFE_MODE=true pnpm run cf:build',
  'cf:deploy': 'pnpm exec tsx ../../tools/wrangler-deploy.ts deploy production',
  'cf:deploy:staging': 'pnpm exec tsx ../../tools/wrangler-deploy.ts deploy staging',
  'cf:deploy:preview': 'pnpm exec tsx ../../tools/wrangler-deploy.ts versions-upload preview',
  deploy: 'pnpm run cf:deploy',
  lint: 'eslint .',
  'pretest:unit': 'test -f .nuxt/tsconfig.server.json || nuxt prepare',
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
      NARDUK_PLATFORM_GH_PACKAGES_READ: \${{ secrets.NARDUK_PLATFORM_GH_PACKAGES_READ || secrets.NARDUK_PLATFORM_GH_PACKAGES_RW || secrets.GH_PACKAGES_TOKEN }}
`
}

export function getCanonicalCopilotSetupStepsContent(): string {
  return `name: Copilot Setup Steps

on:
  workflow_dispatch:

jobs:
  copilot-setup-steps:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: read
    environment: copilot
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10.28.0

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Configure GitHub Packages auth
        env:
          NARDUK_PLATFORM_GH_PACKAGES_READ: \${{ secrets.NARDUK_PLATFORM_GH_PACKAGES_READ || secrets.NARDUK_PLATFORM_GH_PACKAGES_RW || secrets.GH_PACKAGES_TOKEN }}
        run: pnpm run package-registry:auth

      - name: Install dependencies
        env:
          NARDUK_PLATFORM_GH_PACKAGES_READ: \${{ secrets.NARDUK_PLATFORM_GH_PACKAGES_READ || secrets.NARDUK_PLATFORM_GH_PACKAGES_RW || secrets.GH_PACKAGES_TOKEN }}
        run: NPM_CONFIG_USERCONFIG="$PWD/.npmrc.auth" NPM_CONFIG_GLOBALCONFIG=/dev/null pnpm install --frozen-lockfile

      - name: Sync skills
        run: pnpm run sync:skills
`
}

export function getCanonicalSkillsConfigContent(): string {
  return `${JSON.stringify({ profiles: ['template-core'] }, null, 2)}\n`
}

export function getCanonicalDeployMainContent(context: Partial<GeneratedSyncContext> = {}): string {
  const resolvedContext = {
    ...getDefaultGeneratedSyncContext(),
    ...context,
  }
  const deployRepoSecretEnvLines = buildDeployRepoSecretEnvLines()

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
      packages: read

    env:
      APP_NAME: ${quoteYamlString(resolvedContext.appDisplayName)}
      CI: "true"
      NARDUK_PLATFORM_GH_PACKAGES_READ: \${{ secrets.NARDUK_PLATFORM_GH_PACKAGES_READ || secrets.NARDUK_PLATFORM_GH_PACKAGES_RW || secrets.GH_PACKAGES_TOKEN }}
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

          for key in CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID; do
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

  if (relativePath === '.github/workflows/copilot-setup-steps.yml') {
    return getCanonicalCopilotSetupStepsContent()
  }

  if (relativePath === 'skills.config.json') {
    return getCanonicalSkillsConfigContent()
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

  for (const file of SEEDED_APP_OWNED_FILES) {
    if (existsSync(join(templateRoot, file))) {
      tracked.add(file)
    }
  }

  for (const file of BOOTSTRAP_SYNC_FILES) {
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

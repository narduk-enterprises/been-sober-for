import { existsSync, lstatSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import {
  INHERITED_AGENTIC_WORKFLOW_DIRECTORIES,
  INHERITED_AGENTIC_WORKFLOW_FILES,
} from './agentic-workflow-manifest'

export const VERBATIM_SYNC_FILES = [
  '.dockerignore',
  '.githooks/pre-commit',
  '.githooks/post-checkout',
  '.githooks/post-merge',
  'tools/install-git-hooks.cjs',
  'tools/command.ts',
  'tools/gsc-verify.ts',
  'tools/layer-bundle-manifest.ts',
  'tools/provision-metadata.ts',
  'tools/template-layer-selection.ts',
  'tools/update-layer.ts',
  'tools/validate.ts',

  'tools/check-guardrails.ts',
  'tools/sync-template.ts',
  'tools/sync-core.ts',
  'tools/package-registry.ts',
  'tools/agentic-workflow-manifest.ts',
  'tools/sync-manifest.ts',
  'tools/check-drift-ci.ts',
  'tools/check-sync-health.ts',
  'tools/generate-favicons.ts',
  'tools/configure-package-registry-auth.mjs',
  'tools/run-with-platform-secrets.mjs',
  'tools/sync-github-skills.ts',
  'tools/db-migrate.sh',
  'tools/check-setup.cjs',
  'scripts/dev-kill.sh',
  'scripts/cleanup-node-leaks.sh',
  'turbo.json',
  'pnpm-workspace.yaml',
  'renovate.json',
  '.github/copilot-instructions.md',
  '.github/prompts/ui-ux-pro-max/PROMPT.md',
  ...INHERITED_AGENTIC_WORKFLOW_FILES,
  '.cursor/rules/user-global-skills.mdc',
  'apps/web/.nuxtrc',
  'apps/web/.npmrc',
  'apps/web/eslint.config.mjs',
  'prettier.config.mjs',
  '.prettierignore',
  '.editorconfig',
] as const

export const AUTH_BRIDGE_SYNC_FILES = [
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
  'apps/web/server/api/auth/session/exchange.post.ts',
  'apps/web/server/middleware/auth-session-refresh.ts',
  'apps/web/server/database/auth-bridge-pg-schema.ts',
  'apps/web/server/database/auth-bridge-schema.ts',
  'apps/web/server/database/pg-app-schema.ts',
  'apps/web/server/database/pg-schema.ts',
  'apps/web/server/utils/app-auth.ts',
  'apps/web/server/utils/accountDeletionBridge.ts',
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
  ...INHERITED_AGENTIC_WORKFLOW_DIRECTORIES,
  '.github/skills',
  'deploy/preview',
  'packages/eslint-config',
  'tools/guardrails',
  '.agents/workflows',
  'layers/narduk-nuxt-layer',
] as const

export const STALE_SYNC_PATHS = [
  '.agents/skills',
  '.agents/.DS_Store',
  '.github/workflows/publish-layer.yml',
  '.github/workflows/deploy-showcase.yml',
  'apps/showcase',
  '.github/workflows/deploy.yml',
  '.github/workflows/version-bump.yml',
  '.github/workflows/template-sync-bot.yml',
  '.github/workflows/sync-fleet.yml',
  'config/fleet-sync-repos.json',
  'config/fleet-app-dir-overrides.json',
  '.forgejo/workflows/web-canary.yml',
  'tools/migrate-to-monorepo.ts',
  'tools/check-setup.js',
  'tools/fleet-git.ts',
  'tools/mirror-fleet-to-forgejo.ts',
  'tools/run-remote-d1-migrate.mjs',
  'tools/repair-forgejo-lockfile.mjs',
  'tools/web-deploy.cjs',
  'tools/tail.ts',
  'tools/ship.ts',
  'tools/validate-production-env.mjs',
  'tools/verify-forgejo-package-source.mjs',
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
  'layers/narduk-nuxt-layer/coverage',
  'layers/narduk-nuxt-layer/app/utils/format.ts',
  'layers/narduk-nuxt-layer/app/utils/safeLinkTarget.ts',
  'layers/narduk-nuxt-layer/eslint.overrides.mjs',
] as const

export const GENERATED_SYNC_FILES = [
  '.github/workflows/ci.yml',
  '.forgejo/workflows/deploy-main.yml',
] as const

export const FLEET_ROOT_SCRIPT_PATCHES: Readonly<Record<string, string>> = {
  postinstall:
    "node -e \"if(!require('fs').existsSync('.setup-complete'))console.log('\\n⚠️  New apps: provision via platform.nard.uk (see AGENTS.md). Generated starters get .setup-complete from provisioning.\\n')\"",
  dev: 'pnpm --filter web dev',
  'build:plugins': 'pnpm --filter @narduk/eslint-config build',
  prelint: 'pnpm run build:plugins',
  predev: 'node tools/check-setup.cjs',
  prebuild: 'node tools/check-setup.cjs',
  preship:
    'node tools/check-setup.cjs && pnpm install --frozen-lockfile && pnpm audit --audit-level=critical && pnpm exec tsx tools/check-drift-ci.ts && pnpm exec tsx tools/check-sync-health.ts && pnpm run quality:check',
  'sync:github-skills': 'pnpm exec tsx tools/sync-github-skills.ts',
  validate: 'pnpm exec tsx tools/validate.ts',
  'sync-template': 'pnpm exec tsx tools/sync-template.ts .',
  'update-layer': 'pnpm exec tsx tools/update-layer.ts',
  'check:sync-health': 'pnpm exec tsx tools/check-sync-health.ts',
  'hooks:install': 'node tools/install-git-hooks.cjs',
  'guardrails:repo': 'pnpm exec tsx tools/check-guardrails.ts',
  clean:
    "find . -type d \\( -name node_modules -o -name .nuxt -o -name .output -o -name .nitro -o -name .wrangler -o -name .turbo -o -name .data -o -name dist \\) -not -path './.git/*' -prune -exec rm -rf {} +",
  'clean:install': 'pnpm run clean && pnpm install && pnpm --filter web run db:ready',
  'db:migrate': 'pnpm --filter web run db:migrate',
  'dev:kill': 'sh scripts/dev-kill.sh',
  'cleanup:node-leaks': 'sh scripts/cleanup-node-leaks.sh',
  'test:e2e': 'playwright test',
  'test:e2e:web': 'pnpm --filter web test:e2e',
  'generate:favicons': 'pnpm exec tsx tools/generate-favicons.ts',
  quality: 'pnpm run quality:fix && pnpm run quality:check',
  'quality:check': "pnpm run guardrails:repo && turbo run quality --filter='./apps/*'",
  'quality:fix': 'turbo run lint --force -- --fix && pnpm run format',
  check: 'pnpm run quality:check',
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
    uses: narduk-enterprises/narduk-nuxt-template/.github/workflows/reusable-quality.yml@main
    secrets:
      PLATFORM_SECRETS_TOKEN: \${{ secrets.PLATFORM_SECRETS_TOKEN }}
`
}

export function getCanonicalDeployMainContent(): string {
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
      PLATFORM_SECRETS_TOKEN: \${{ secrets.PLATFORM_SECRETS_TOKEN }}
      PLATFORM_SECRETS_BASE_URL: https://platform.nard.uk
      PLATFORM_SECRETS_APP_NAME: __APP_NAME__
      PLATFORM_SECRETS_ENVIRONMENT: prd
      PLATFORM_SECRETS_PROFILE: build
      NUXT_TELEMETRY_DISABLED: 1

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

          for key in PLATFORM_SECRETS_TOKEN PLATFORM_SECRETS_BASE_URL PLATFORM_SECRETS_APP_NAME PLATFORM_SECRETS_ENVIRONMENT PLATFORM_SECRETS_PROFILE; do
            if [[ -z "\${!key:-}" ]]; then
              echo "::error::Missing $key in the repository secrets contract for deploy."
              exit 1
            fi
          done

          if [[ "\${PLATFORM_SECRETS_ENVIRONMENT}" != "prd" ]]; then
            echo "::error::PLATFORM_SECRETS_ENVIRONMENT must be prd for deploy-main."
            exit 1
          fi

          if [[ "\${PLATFORM_SECRETS_PROFILE}" != "build" ]]; then
            echo "::error::PLATFORM_SECRETS_PROFILE must be build for deploy-main."
            exit 1
          fi

          echo "Using platform-managed build carrier for \${PLATFORM_SECRETS_APP_NAME}."
        working-directory: .

      - name: Configure package registry auth
        run: |
          node ./tools/run-with-platform-secrets.mjs --app "$PLATFORM_SECRETS_APP_NAME" --environment "$PLATFORM_SECRETS_ENVIRONMENT" --profile "$PLATFORM_SECRETS_PROFILE" -- node ./tools/configure-package-registry-auth.mjs

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        working-directory: apps/web
        run: |
          node ../../tools/run-with-platform-secrets.mjs --app "$PLATFORM_SECRETS_APP_NAME" --environment "$PLATFORM_SECRETS_ENVIRONMENT" --profile "$PLATFORM_SECRETS_PROFILE" -- pnpm run build
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
          node ../../tools/run-with-platform-secrets.mjs --app "$PLATFORM_SECRETS_APP_NAME" --environment "$PLATFORM_SECRETS_ENVIRONMENT" --profile "$PLATFORM_SECRETS_PROFILE" -- bash -lc "$cmd"

      - name: Deploy
        working-directory: apps/web
        run: |
          node ../../tools/run-with-platform-secrets.mjs --app "$PLATFORM_SECRETS_APP_NAME" --environment "$PLATFORM_SECRETS_ENVIRONMENT" --profile "$PLATFORM_SECRETS_PROFILE" -- pnpm run deploy
`
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

  tracked.add('.github/workflows/ci.yml')

  return [...tracked].sort()
}

export function normalizeManagedContent(relativePath: string, content: string): string {
  if (relativePath !== 'layers/narduk-nuxt-layer/package.json') {
    return content
  }

  try {
    const parsed = JSON.parse(content) as Record<string, any>
    if (parsed.repository) {
      parsed.repository = {
        ...parsed.repository,
        url: '__APP_ORIGIN__',
      }
    }

    return JSON.stringify(parsed, null, 2) + '\n'
  } catch {
    return content
  }
}

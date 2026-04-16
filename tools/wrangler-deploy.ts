#!/usr/bin/env -S pnpm exec tsx

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { runCommand } from './command'

type WranglerDeployTarget = 'production' | 'staging' | 'preview'
type WranglerDeployAction = 'deploy' | 'versions-upload'

interface WranglerConfig {
  env?: Record<string, unknown>
  [key: string]: unknown
}

const APP_DIR = resolve(process.cwd())
const WRANGLER_CONFIG_PATH = join(APP_DIR, 'wrangler.json')

function usage(): never {
  console.error(
    [
      'Usage:',
      '  pnpm exec tsx ../../tools/wrangler-deploy.ts <deploy|versions-upload> <production|staging|preview> [wrangler args...]',
    ].join('\n'),
  )
  process.exit(1)
}

export function parseArgs(argv: string[]): {
  action: WranglerDeployAction
  target: WranglerDeployTarget
  passthroughArgs: string[]
} {
  const [actionArg, targetArg, ...passthroughArgs] = argv
  if (actionArg !== 'deploy' && actionArg !== 'versions-upload') usage()
  if (targetArg !== 'production' && targetArg !== 'staging' && targetArg !== 'preview') usage()
  return { action: actionArg, target: targetArg, passthroughArgs }
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T
}

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', 'utf-8')
}

export function flattenWranglerDeployConfig(
  config: WranglerConfig,
  target: WranglerDeployTarget,
): WranglerConfig {
  const baseConfig = JSON.parse(JSON.stringify(config)) as WranglerConfig
  const env = baseConfig.env
  delete baseConfig.env

  const targetEnv =
    target === 'production'
      ? env && typeof env === 'object'
        ? env.production
        : undefined
      : target === 'staging'
        ? env && typeof env === 'object'
          ? env.staging
          : undefined
        : env && typeof env === 'object'
          ? env.preview
          : undefined

  if (target === 'staging' && (!targetEnv || typeof targetEnv !== 'object')) {
    throw new Error('Wrangler deploy config is missing env.staging for the staging deploy target.')
  }

  const flattenedConfig =
    targetEnv && typeof targetEnv === 'object'
      ? {
          ...baseConfig,
          ...(targetEnv as Record<string, unknown>),
        }
      : baseConfig

  if (target === 'preview') {
    delete flattenedConfig.routes
    flattenedConfig.workers_dev = true
  }

  return flattenedConfig
}

export function writeFlattenedWranglerDeployConfig(
  configPath: string,
  target: WranglerDeployTarget,
): string {
  if (!existsSync(configPath)) {
    throw new Error(`Wrangler config not found at ${configPath}`)
  }

  const appDir = dirname(configPath)
  const generatedWranglerDir = join(appDir, '.wrangler', 'deploy')
  const flattenedConfig = flattenWranglerDeployConfig(readJson<WranglerConfig>(configPath), target)
  const generatedConfigPath = join(appDir, `.wrangler.deploy.${target}.json`)
  const redirectPath = join(generatedWranglerDir, 'config.json')

  writeJson(generatedConfigPath, flattenedConfig)
  writeJson(redirectPath, { configPath: `../../.wrangler.deploy.${target}.json` })

  return generatedConfigPath
}

function main() {
  const { action, target, passthroughArgs } = parseArgs(process.argv.slice(2))
  writeFlattenedWranglerDeployConfig(WRANGLER_CONFIG_PATH, target)

  if (action === 'deploy') {
    runCommand('pnpm', ['exec', 'wrangler', 'deploy', ...passthroughArgs], {
      cwd: APP_DIR,
      stdio: 'inherit',
    })
    return
  }

  runCommand('pnpm', ['exec', 'wrangler', 'versions', 'upload', ...passthroughArgs], {
    cwd: APP_DIR,
    stdio: 'inherit',
  })
}

const isDirectRun = process.argv[1]?.endsWith('wrangler-deploy.ts')
if (isDirectRun) {
  main()
}

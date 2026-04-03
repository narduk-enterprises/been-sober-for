#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '')
}

function normalizeProvider(value) {
  return value === 'github' ? 'github' : 'forgejo'
}

function resolveRegistryConfig(env) {
  const provider = normalizeProvider(env.PACKAGE_REGISTRY_PROVIDER)

  if (provider === 'github') {
    return {
      provider,
      registryUrl: 'https://npm.pkg.github.com',
      token:
        env.GITHUB_TOKEN_PACKAGES_READ?.trim() ||
        env.GH_PACKAGES_TOKEN?.trim() ||
        env.NODE_AUTH_TOKEN?.trim() ||
        '',
    }
  }

  const baseUrl = stripTrailingSlash(env.FLEET_FORGEJO_BASE_URL || 'https://code.platform.nard.uk')
  const owner = (env.FLEET_FORGEJO_OWNER || 'narduk-enterprises').trim() || 'narduk-enterprises'

  return {
    provider,
    registryUrl: ensureTrailingSlash(`${baseUrl}/api/packages/${owner}/npm`),
    token: env.FORGEJO_TOKEN?.trim() || env.NODE_AUTH_TOKEN?.trim() || '',
  }
}

function stripManagedAuthLines(content) {
  return content
    .split('\n')
    .filter(
      (line) =>
        !line.includes('//npm.pkg.github.com/:_authToken=') &&
        !/\/\/[^/]+\/api\/packages\/.+\/npm\/:_authToken=/.test(line),
    )
    .join('\n')
    .trimEnd()
}

function main() {
  const targetPath = resolve(process.cwd(), process.env.PACKAGE_REGISTRY_NPMRC_PATH || '.npmrc')
  const config = resolveRegistryConfig(process.env)

  if (!config.token) {
    console.error(
      `[package-registry-auth] missing token for ${config.provider}; resolve platform secrets before running this step.`,
    )
    process.exit(1)
  }

  const url = new URL(config.registryUrl)
  const authHostPath = `${url.host}${ensureTrailingSlash(url.pathname)}`
  const registryLine = `@narduk-enterprises:registry=${config.registryUrl}`
  const authLine = `//${authHostPath}:_authToken=${config.token}`
  const existingContent = existsSync(targetPath) ? readFileSync(targetPath, 'utf8') : ''
  const strippedContent = stripManagedAuthLines(existingContent)
  const retainedLines = strippedContent
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) =>
      line.startsWith('@narduk-enterprises:registry=') || line.startsWith('@loganrenz:registry=')
        ? registryLine
        : line,
    )

  if (!retainedLines.some((line) => line.startsWith('@narduk-enterprises:registry='))) {
    retainedLines.unshift(registryLine)
  }

  retainedLines.push(authLine)
  writeFileSync(targetPath, `${retainedLines.join('\n').trimEnd()}\n`, 'utf8')
  console.log(`[package-registry-auth] configured ${config.provider} auth in ${targetPath}`)
}

main()

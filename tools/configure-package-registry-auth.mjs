#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const PACKAGE_SCOPE = '@narduk-enterprises'
const PACKAGE_REGISTRY_URL = 'https://npm.pkg.github.com'
const PACKAGE_REGISTRY_TOKEN_ENV_VAR = 'NARDUK_PLATFORM_GH_PACKAGES_RW'
const PACKAGE_REGISTRY_NPMRC_PATH = '.npmrc.auth'
const PACKAGE_REGISTRY_WRITE_LITERAL_TOKEN_ENV_VAR = 'PACKAGE_REGISTRY_WRITE_LITERAL_TOKEN'

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`
}

function resolveRegistryConfig(env) {
  return {
    registryUrl: PACKAGE_REGISTRY_URL,
    token: env[PACKAGE_REGISTRY_TOKEN_ENV_VAR]?.trim() || '',
    writeLiteralToken: env[PACKAGE_REGISTRY_WRITE_LITERAL_TOKEN_ENV_VAR] === 'true',
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
  const targetPath = resolve(
    process.cwd(),
    process.env.PACKAGE_REGISTRY_NPMRC_PATH || PACKAGE_REGISTRY_NPMRC_PATH,
  )
  const config = resolveRegistryConfig(process.env)

  if (!config.token) {
    console.error(`[package-registry-auth] missing ${PACKAGE_REGISTRY_TOKEN_ENV_VAR}`)
    process.exit(1)
  }

  const url = new URL(config.registryUrl)
  const authHostPath = `${url.host}${ensureTrailingSlash(url.pathname)}`
  const registryLine = `${PACKAGE_SCOPE}:registry=${config.registryUrl}`
  const authLine = config.writeLiteralToken
    ? `//${authHostPath}:_authToken=${config.token}`
    : `//${authHostPath}:_authToken=\${${PACKAGE_REGISTRY_TOKEN_ENV_VAR}}`
  const existingContent = existsSync(targetPath) ? readFileSync(targetPath, 'utf8') : ''
  const strippedContent = stripManagedAuthLines(existingContent)
  const retainedLines = strippedContent
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) =>
      line.startsWith(`${PACKAGE_SCOPE}:registry=`) || line.startsWith('@loganrenz:registry=')
        ? registryLine
        : line,
    )

  if (!retainedLines.some((line) => line.startsWith(`${PACKAGE_SCOPE}:registry=`))) {
    retainedLines.unshift(registryLine)
  }

  retainedLines.push(authLine)
  writeFileSync(targetPath, `${retainedLines.join('\n').trimEnd()}\n`, 'utf8')
  console.log(`[package-registry-auth] configured GitHub Packages auth in ${targetPath}`)
}

main()

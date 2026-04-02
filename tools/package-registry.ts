import { getFleetGitConfig } from './fleet-git'

export type PackageRegistryProvider = 'github' | 'forgejo'

export interface PackageRegistryConfig {
  provider: PackageRegistryProvider
  scope: string
  registryUrl: string
  authHostPath: string
}

export const DEFAULT_PACKAGE_REGISTRY_PROVIDER: PackageRegistryProvider = 'forgejo'
export const DEFAULT_PACKAGE_REGISTRY_SCOPE = '@narduk-enterprises'
export const GITHUB_PACKAGE_REGISTRY_URL = 'https://npm.pkg.github.com'

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

export function normalizePackageRegistryProvider(
  value: string | undefined,
): PackageRegistryProvider {
  return value === 'github' ? 'github' : 'forgejo'
}

export function getPackageRegistryConfig(
  env: NodeJS.ProcessEnv = process.env,
): PackageRegistryConfig {
  const provider = normalizePackageRegistryProvider(env.PACKAGE_REGISTRY_PROVIDER)
  const fleetGit = getFleetGitConfig(env)

  const registryUrl =
    provider === 'forgejo'
      ? ensureTrailingSlash(
          `${stripTrailingSlash(fleetGit.forgejoBaseUrl)}/api/packages/${fleetGit.forgejoOwner}/npm`,
        )
      : GITHUB_PACKAGE_REGISTRY_URL

  const url = new URL(registryUrl)

  return {
    provider,
    scope: DEFAULT_PACKAGE_REGISTRY_SCOPE,
    registryUrl,
    authHostPath: `${url.host}${ensureTrailingSlash(url.pathname)}`,
  }
}

export function buildPackageRegistryLine(config: PackageRegistryConfig): string {
  return `${config.scope}:registry=${config.registryUrl}`
}

function isManagedRegistryAuthLine(line: string): boolean {
  return (
    line.includes('//npm.pkg.github.com/:_authToken=') ||
    /\/\/code(?:\.platform)?\.nard\.uk\/api\/packages\/.+\/npm\/:_authToken=/.test(line)
  )
}

function normalizeBlankLines(lines: string[]): string[] {
  return lines.reduce<string[]>((accumulator, line) => {
    if (line === '' && accumulator[accumulator.length - 1] === '') {
      return accumulator
    }

    accumulator.push(line)
    return accumulator
  }, [])
}

export function patchPackageRegistryNpmrcContent(
  content: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const config = getPackageRegistryConfig(env)
  const registryLine = buildPackageRegistryLine(config)

  const retainedLines = content
    .split('\n')
    .filter((line) => !isManagedRegistryAuthLine(line))
    .filter((line) => !line.includes('Auth token injected via CI env'))
    .map((line) => {
      if (line.startsWith(`${config.scope}:registry=`) || line.startsWith('@loganrenz:registry=')) {
        return registryLine
      }

      return line
    })

  if (!retainedLines.some((line) => line.startsWith(`${config.scope}:registry=`))) {
    retainedLines.unshift(registryLine)
  }

  return `${normalizeBlankLines(retainedLines).join('\n').trimEnd()}\n`
}

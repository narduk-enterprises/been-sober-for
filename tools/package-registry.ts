export interface PackageRegistryConfig {
  scope: string
  registryUrl: string
  authHostPath: string
  authTokenEnvVar: string
}

export const DEFAULT_PACKAGE_REGISTRY_SCOPE = '@narduk-enterprises'
export const GITHUB_PACKAGE_REGISTRY_URL = 'https://npm.pkg.github.com'
export const GITHUB_PACKAGE_REGISTRY_AUTH_ENV_VAR = 'NARDUK_PLATFORM_GH_PACKAGES_RW'
export const GENERATED_PACKAGE_REGISTRY_AUTH_CONFIG_PATH = '.npmrc.auth'

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

export function getPackageRegistryConfig(
  _env: NodeJS.ProcessEnv = process.env,
): PackageRegistryConfig {
  const url = new URL(GITHUB_PACKAGE_REGISTRY_URL)

  return {
    scope: DEFAULT_PACKAGE_REGISTRY_SCOPE,
    registryUrl: GITHUB_PACKAGE_REGISTRY_URL,
    authHostPath: `${url.host}${ensureTrailingSlash(url.pathname)}`,
    authTokenEnvVar: GITHUB_PACKAGE_REGISTRY_AUTH_ENV_VAR,
  }
}

export function buildPackageRegistryLine(config: PackageRegistryConfig): string {
  return `${config.scope}:registry=${config.registryUrl}`
}

export function buildPackageRegistryAuthLine(config: PackageRegistryConfig): string {
  return `//${config.authHostPath}:_authToken=\${${config.authTokenEnvVar}}`
}

function isManagedRegistryAuthLine(line: string): boolean {
  return (
    line.includes('//npm.pkg.github.com/:_authToken=') ||
    /\/\/[^/]+\/api\/packages\/.+\/npm\/:_authToken=/.test(line)
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

  const finalLines = normalizeBlankLines(retainedLines)
  if (!finalLines.includes(registryLine)) {
    finalLines.unshift(registryLine)
  }

  return `${finalLines.join('\n').trimEnd()}\n`
}

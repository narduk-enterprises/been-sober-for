export type GitProvider = 'github' | 'forgejo'

export interface FleetGitConfig {
  primaryHost: GitProvider
  githubOwner: string
  forgejoBaseUrl: string
  forgejoOwner: string
}

export interface GitRemoteUrls {
  slug: string
  ssh: string
  https: string
}

export interface FleetRemoteTopologyEntry {
  name: 'origin' | 'github' | 'forgejo'
  provider: GitProvider
  urls: string[]
}

export const DEFAULT_FLEET_PRIMARY_GIT_HOST: GitProvider = 'forgejo'
export const DEFAULT_FLEET_GITHUB_OWNER = 'narduk-enterprises'
export const DEFAULT_FLEET_FORGEJO_BASE_URL = 'https://code.platform.nard.uk'
export const DEFAULT_FLEET_FORGEJO_SSH_PORT = 2222

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function normalizeRepoName(repoName: string): string {
  return repoName.trim().replace(/\.git$/, '')
}

export function normalizeGitProvider(value: string | undefined): GitProvider {
  return value === 'github' ? 'github' : 'forgejo'
}

export function getFleetGitConfig(env: NodeJS.ProcessEnv = process.env): FleetGitConfig {
  const githubOwner = env.FLEET_GIT_ORG?.trim() || DEFAULT_FLEET_GITHUB_OWNER

  return {
    primaryHost: normalizeGitProvider(env.FLEET_PRIMARY_GIT_HOST),
    githubOwner,
    forgejoBaseUrl: stripTrailingSlash(
      env.FLEET_FORGEJO_BASE_URL?.trim() || DEFAULT_FLEET_FORGEJO_BASE_URL,
    ),
    forgejoOwner: env.FLEET_FORGEJO_OWNER?.trim() || githubOwner,
  }
}

export function buildGitRemoteUrls(
  provider: GitProvider,
  repoName: string,
  env: NodeJS.ProcessEnv = process.env,
): GitRemoteUrls {
  const config = getFleetGitConfig(env)
  const normalizedRepoName = normalizeRepoName(repoName)

  if (provider === 'github') {
    const slug = `${config.githubOwner}/${normalizedRepoName}`

    return {
      slug,
      ssh: `git@github.com:${slug}.git`,
      https: `https://github.com/${slug}.git`,
    }
  }

  const slug = `${config.forgejoOwner}/${normalizedRepoName}`
  const forgejoUrl = new URL(config.forgejoBaseUrl)

  return {
    slug,
    ssh: `ssh://git@${forgejoUrl.hostname}:${DEFAULT_FLEET_FORGEJO_SSH_PORT}/${slug}.git`,
    https: `${config.forgejoBaseUrl}/${slug}.git`,
  }
}

export function buildProviderCloneSources(
  provider: GitProvider,
  repoName: string,
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const urls = buildGitRemoteUrls(provider, repoName, env)
  return [urls.ssh, urls.https]
}

export function buildPrimaryCloneSources(
  repoName: string,
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  return buildProviderCloneSources(getFleetGitConfig(env).primaryHost, repoName, env)
}

export function buildTemplateRemoteUrls(env: NodeJS.ProcessEnv = process.env): GitRemoteUrls {
  return buildGitRemoteUrls(getFleetGitConfig(env).primaryHost, 'narduk-nuxt-template', env)
}

export function buildFleetRemoteTopology(
  repoName: string,
  env: NodeJS.ProcessEnv = process.env,
): FleetRemoteTopologyEntry[] {
  const config = getFleetGitConfig(env)
  const githubUrls = buildGitRemoteUrls('github', repoName, env)
  const forgejoUrls = buildGitRemoteUrls('forgejo', repoName, env)

  if (config.primaryHost === 'forgejo') {
    return [
      { name: 'origin', provider: 'forgejo', urls: [forgejoUrls.ssh, forgejoUrls.https] },
      { name: 'github', provider: 'github', urls: [githubUrls.ssh, githubUrls.https] },
    ]
  }

  return [
    { name: 'origin', provider: 'github', urls: [githubUrls.ssh, githubUrls.https] },
    { name: 'forgejo', provider: 'forgejo', urls: [forgejoUrls.ssh, forgejoUrls.https] },
  ]
}

export function normalizeRemoteUrl(url: string): string {
  return stripTrailingSlash(url.trim())
}

export function isExpectedRemoteUrl(actualUrl: string, expectedUrls: readonly string[]): boolean {
  const normalizedActual = normalizeRemoteUrl(actualUrl)
  return expectedUrls.some((expectedUrl) => normalizeRemoteUrl(expectedUrl) === normalizedActual)
}

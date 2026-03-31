#!/usr/bin/env -S pnpm exec tsx

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runCommand } from './command'
import { buildGitRemoteUrls, buildProviderCloneSources, getFleetGitConfig } from './fleet-git'
import { fleetMain, type FleetRunnerOptions } from './fleet-runner'

type MirrorFleetOptions = FleetRunnerOptions

interface ForgejoRepoResponse {
  full_name?: string
  name?: string
}

interface ForgejoUserResponse {
  login?: string
}

interface EnsureForgejoRepoOptions {
  baseUrl: string
  owner: string
  token: string
  dryRun?: boolean
  fetchImpl?: typeof fetch
}

interface MirrorRepositoryOptions {
  dryRun?: boolean
  authHeader?: string
  log?: (message: string) => void
}

function buildGitEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
  }
}

function buildForgejoApiHeaders(token: string): HeadersInit {
  return {
    Accept: 'application/json',
    Authorization: `token ${token}`,
    'Content-Type': 'application/json',
  }
}

async function parseForgejoJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

export function buildGitBasicAuthHeader(username: string, token: string): string {
  const basicAuth = Buffer.from(`${username}:${token}`).toString('base64')
  return `Authorization: Basic ${basicAuth}`
}

export async function resolveForgejoUsername(
  baseUrl: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchImpl(`${baseUrl}/api/v1/user`, {
    headers: buildForgejoApiHeaders(token),
  })

  if (!response.ok) {
    throw new Error(`Forgejo user lookup failed: ${response.status} ${await response.text()}`)
  }

  const payload = await parseForgejoJson<ForgejoUserResponse>(response)
  if (!payload.login?.trim()) {
    throw new Error('Forgejo user lookup did not return a login name.')
  }

  return payload.login
}

export async function ensureForgejoRepoExists(
  repoName: string,
  options: EnsureForgejoRepoOptions,
): Promise<'exists' | 'created'> {
  const fetchImpl = options.fetchImpl ?? fetch
  const repoUrl = `${options.baseUrl}/api/v1/repos/${options.owner}/${repoName}`

  const existingResponse = await fetchImpl(repoUrl, {
    headers: buildForgejoApiHeaders(options.token),
  })

  if (existingResponse.ok) {
    return 'exists'
  }

  if (existingResponse.status !== 404) {
    throw new Error(
      `Forgejo repository lookup failed for ${options.owner}/${repoName}: ${existingResponse.status} ${await existingResponse.text()}`,
    )
  }

  if (options.dryRun) {
    return 'created'
  }

  const createResponse = await fetchImpl(`${options.baseUrl}/api/v1/orgs/${options.owner}/repos`, {
    method: 'POST',
    headers: buildForgejoApiHeaders(options.token),
    body: JSON.stringify({
      auto_init: false,
      default_branch: 'main',
      name: repoName,
      private: true,
    }),
  })

  if (!createResponse.ok) {
    throw new Error(
      `Forgejo repository create failed for ${options.owner}/${repoName}: ${createResponse.status} ${await createResponse.text()}`,
    )
  }

  const payload = await parseForgejoJson<ForgejoRepoResponse>(createResponse)
  if (!payload.full_name?.trim() && !payload.name?.trim()) {
    throw new Error(`Forgejo created ${options.owner}/${repoName} but returned an empty payload.`)
  }

  return 'created'
}

export function mirrorBareRepository(
  sourceUrl: string,
  targetUrl: string,
  options: MirrorRepositoryOptions = {},
): void {
  const log = options.log ?? console.log

  if (options.dryRun) {
    log(`[dry-run] git clone --mirror ${sourceUrl} <tmp>`)
    log(`[dry-run] git push --mirror ${targetUrl}`)
    return
  }

  const tempRoot = mkdtempSync(join(tmpdir(), 'forgejo-mirror-'))
  const mirrorDir = join(tempRoot, 'mirror.git')

  try {
    runCommand('git', ['clone', '--mirror', sourceUrl, mirrorDir], {
      env: buildGitEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const pushArgs = [
      ...(options.authHeader ? ['-c', `http.extraHeader=${options.authHeader}`] : []),
      '--git-dir',
      mirrorDir,
      'push',
      '--mirror',
      targetUrl,
    ]

    runCommand('git', pushArgs, {
      env: buildGitEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } finally {
    rmSync(tempRoot, { force: true, recursive: true })
  }
}

async function mirrorGithubRepoToForgejo(
  repoName: string,
  options: MirrorFleetOptions,
): Promise<number> {
  const gitConfig = getFleetGitConfig()
  const githubSources = buildProviderCloneSources('github', repoName)
  const forgejoRemote = buildGitRemoteUrls('forgejo', repoName)

  console.log(`[${repoName}] GitHub sources: ${githubSources.join(' | ')}`)
  console.log(`[${repoName}] Forgejo target: ${forgejoRemote.https}`)

  const token = process.env.FORGEJO_TOKEN?.trim()
  if (!token) {
    if (options.dryRun) {
      console.log(`[${repoName}] DRY RUN: FORGEJO_TOKEN missing, skipping API verification.`)
      return 0
    }

    console.error(`[${repoName}] FORGEJO_TOKEN is required for Forgejo mirroring.`)
    return 1
  }

  try {
    const repoState = await ensureForgejoRepoExists(repoName, {
      baseUrl: gitConfig.forgejoBaseUrl,
      owner: gitConfig.forgejoOwner,
      token,
      dryRun: options.dryRun,
    })

    if (repoState === 'created') {
      console.log(
        `[${repoName}] ${options.dryRun ? 'Would create' : 'Created'} Forgejo repo ${gitConfig.forgejoOwner}/${repoName}`,
      )
    }

    if (options.dryRun) {
      mirrorBareRepository(githubSources[0], forgejoRemote.https, { dryRun: true })
      return 0
    }

    const forgejoUsername = await resolveForgejoUsername(gitConfig.forgejoBaseUrl, token)
    const authHeader = buildGitBasicAuthHeader(forgejoUsername, token)

    let lastError: unknown = null
    for (const sourceUrl of githubSources) {
      try {
        mirrorBareRepository(sourceUrl, forgejoRemote.https, {
          authHeader,
          log: (message) => console.log(`[${repoName}] ${message}`),
        })
        console.log(`[${repoName}] Mirrored GitHub refs to Forgejo.`)
        return 0
      } catch (error) {
        lastError = error
        console.error(`[${repoName}] Mirror attempt failed from ${sourceUrl}: ${String(error)}`)
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError))
  } catch (error) {
    console.error(
      `[${repoName}] Mirror failed: ${error instanceof Error ? error.message : String(error)}`,
    )
    return 1
  }
}

export function runMirrorFleetToForgejoCli(): void {
  fleetMain<MirrorFleetOptions>({
    title: 'Fleet Forgejo Mirror',
    defaultConcurrency: 4,
    extraUsageLines: [
      '  Requires FORGEJO_TOKEN in the environment for create-and-push operations.',
    ],
    printExtraBanner: () => {
      const gitConfig = getFleetGitConfig()
      console.log(`Forgejo:  ${gitConfig.forgejoBaseUrl}/${gitConfig.forgejoOwner}`)
      console.log('Source:   GitHub remains authoritative in this phase')
    },
    handler: (repoName, _repoDir, options) => mirrorGithubRepoToForgejo(repoName, options),
  })
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runMirrorFleetToForgejoCli()
}

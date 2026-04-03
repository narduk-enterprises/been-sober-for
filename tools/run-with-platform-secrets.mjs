#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { spawn } from 'node:child_process'

function parseArgs(argv) {
  const separatorIndex = argv.indexOf('--')
  const args = separatorIndex === -1 ? argv : argv.slice(0, separatorIndex)
  const command = separatorIndex === -1 ? [] : argv.slice(separatorIndex + 1)
  const options = {
    app: process.env.PLATFORM_SECRETS_APP_NAME || '',
    environment: process.env.PLATFORM_SECRETS_ENVIRONMENT || '',
    profile: process.env.PLATFORM_SECRETS_PROFILE || '',
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    const next = args[index + 1]

    if (arg === '--app' && next) {
      options.app = next
      index += 1
      continue
    }
    if (arg === '--environment' && next) {
      options.environment = next
      index += 1
      continue
    }
    if (arg === '--profile' && next) {
      options.profile = next
      index += 1
      continue
    }
  }

  return { options, command }
}

function runCommand(command, env) {
  if (command.length === 0) {
    console.error('run-with-platform-secrets: missing command after --')
    process.exit(1)
  }

  const child = spawn(command[0], command.slice(1), {
    stdio: 'inherit',
    env,
    shell: false,
  })

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }

    process.exit(code ?? 0)
  })
}

function inferAppNameFromWrangler() {
  const candidates = new Set()
  let current = process.cwd()

  for (let depth = 0; depth < 8; depth += 1) {
    candidates.add(resolve(current, 'wrangler.json'))
    candidates.add(resolve(current, 'apps/web/wrangler.json'))

    const parent = dirname(current)
    if (parent === current) {
      break
    }
    current = parent
  }

  for (const candidate of candidates) {
    if (!existsSync(candidate)) {
      continue
    }

    try {
      const payload = JSON.parse(readFileSync(candidate, 'utf8'))
      const name = typeof payload?.name === 'string' ? payload.name.trim() : ''
      if (name) {
        return name
      }
    } catch {
      // Ignore malformed discovery candidates and keep looking.
    }
  }

  return ''
}

async function resolvePlatformSecrets({ app, environment, profile }) {
  const baseUrl = (
    process.env.PLATFORM_SECRETS_BASE_URL ||
    process.env.CONTROL_PLANE_URL ||
    process.env.SITE_URL ||
    ''
  ).trim()
  const token = (process.env.PLATFORM_SECRETS_TOKEN || '').trim()

  if (!baseUrl || !token || !app || !environment || !profile) {
    return null
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/secrets/resolve`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Platform-Secrets-Token': token,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({
      appName: app,
      environment,
      profile,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`resolve failed (${response.status}): ${body}`)
  }

  const payload = await response.json()
  if (!payload || typeof payload !== 'object' || typeof payload.values !== 'object') {
    throw new Error('resolve returned an invalid payload')
  }

  return payload.values
}

async function main() {
  const { options, command } = parseArgs(process.argv.slice(2))
  const resolvedOptions = {
    ...options,
    app: options.app || inferAppNameFromWrangler(),
  }

  try {
    const values = await resolvePlatformSecrets(resolvedOptions)
    if (!values) {
      throw new Error(
        'PLATFORM_SECRETS_TOKEN plus app, environment, and profile are required. The app name defaults to the nearest wrangler.json name when omitted, and PLATFORM_SECRETS_BASE_URL defaults to CONTROL_PLANE_URL or SITE_URL when available.',
      )
    }

    runCommand(command, {
      ...process.env,
      ...values,
    })
  } catch (error) {
    console.error(`[platform-secrets] ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

void main()

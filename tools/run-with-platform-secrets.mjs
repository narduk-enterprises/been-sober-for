#!/usr/bin/env node

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

function shouldFallback() {
  return process.env.PLATFORM_SECRETS_ALLOW_FALLBACK !== '0'
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

  try {
    const values = await resolvePlatformSecrets(options)
    if (!values) {
      if (!shouldFallback()) {
        throw new Error(
          'PLATFORM_SECRETS_TOKEN plus app, environment, and profile are required. PLATFORM_SECRETS_BASE_URL defaults to CONTROL_PLANE_URL or SITE_URL when available.',
        )
      }

      console.warn(
        '[platform-secrets] Missing platform secrets configuration; running command with existing environment.',
      )
      runCommand(command, process.env)
      return
    }

    runCommand(command, {
      ...process.env,
      ...values,
    })
  } catch (error) {
    if (!shouldFallback()) {
      console.error(`[platform-secrets] ${error instanceof Error ? error.message : String(error)}`)
      process.exit(1)
    }

    console.warn(
      `[platform-secrets] ${error instanceof Error ? error.message : String(error)}; falling back to existing environment.`,
    )
    runCommand(command, process.env)
  }
}

void main()

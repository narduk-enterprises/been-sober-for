#!/usr/bin/env node

import { spawn } from 'node:child_process'

function parseArgs(argv) {
  const separatorIndex = argv.indexOf('--')
  const command = separatorIndex === -1 ? [] : argv.slice(separatorIndex + 1)

  return { command }
}

function runCommand(command, env) {
  if (command.length === 0) {
    console.error('run-with-vault-secrets: missing command after --')
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

function parseResolvedSecrets(payload) {
  if (payload && typeof payload === 'object') {
    if (payload.secrets && typeof payload.secrets === 'object' && !Array.isArray(payload.secrets)) {
      return Object.fromEntries(
        Object.entries(payload.secrets)
          .filter(([key, value]) => key && value !== undefined && value !== null)
          .map(([key, value]) => [key, typeof value === 'string' ? value : String(value)]),
      )
    }

    const text =
      typeof payload.dotenv === 'string'
        ? payload.dotenv
        : typeof payload.value === 'string'
          ? payload.value
          : ''

    if (text) {
      const resolved = {}

      for (const rawLine of text.split(/\r?\n/)) {
        const trimmed = rawLine.trim()
        if (!trimmed || trimmed.startsWith('#')) {
          continue
        }

        const separatorIndex = rawLine.indexOf('=')
        if (separatorIndex === -1) {
          continue
        }

        const key = rawLine.slice(0, separatorIndex).trim()
        if (!key) {
          continue
        }

        let value = rawLine.slice(separatorIndex + 1)
        if (value.startsWith('"') && value.endsWith('"')) {
          try {
            value = JSON.parse(value)
          } catch {
            // Keep the raw value when it is not valid JSON string syntax.
          }
        }

        resolved[key] = value
      }

      if (Object.keys(resolved).length > 0) {
        return resolved
      }
    }
  }

  throw new Error('resolution returned an invalid payload')
}

async function resolveVaultSecrets({
  baseUrl,
  token,
  projectSlug,
  environmentSlug,
  configSetSlug,
}) {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/resolution`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({
      projectSlug,
      environmentSlug,
      ...(configSetSlug ? { configSetSlug } : {}),
      format: 'json',
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`resolve failed (${response.status}): ${body}`)
  }

  const payload = await response.json()
  return parseResolvedSecrets(payload)
}

async function main() {
  const { command } = parseArgs(process.argv.slice(2))
  const baseUrl = (process.env.VAULT_BASE_URL || '').trim()
  const token = (process.env.VAULT_TOKEN || '').trim()
  const projectSlug = (process.env.VAULT_PROJECT_SLUG || '').trim()
  const environmentSlug = (process.env.VAULT_ENVIRONMENT_SLUG || '').trim()
  const configSetSlug =
    (process.env.VAULT_CONFIG_SET || '').trim() || (process.env.VAULT_CONFIG_SET_SLUG || '').trim()

  if (!baseUrl || !token || !projectSlug || !environmentSlug) {
    console.error(
      'run-with-vault-secrets: VAULT_BASE_URL, VAULT_TOKEN, VAULT_PROJECT_SLUG, and VAULT_ENVIRONMENT_SLUG are required.',
    )
    process.exit(1)
  }

  try {
    const values = await resolveVaultSecrets({
      baseUrl,
      token,
      projectSlug,
      environmentSlug,
      configSetSlug,
    })

    runCommand(command, {
      ...process.env,
      ...values,
    })
  } catch (error) {
    console.error(`[vault-secrets] ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

void main()

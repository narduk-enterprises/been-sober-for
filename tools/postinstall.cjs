#!/usr/bin/env node

const { execFileSync } = require('node:child_process')
const { existsSync } = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const sentinelPath = path.join(root, '.setup-complete')
const hookInstallerPath = path.join(__dirname, 'install-git-hooks.cjs')
const skillsSyncBinPath = path.join(root, 'node_modules', '.bin', 'narduk-skills')
const skillsSyncWindowsBinPath = path.join(root, 'node_modules', '.bin', 'narduk-skills.cmd')

if (!existsSync(sentinelPath)) {
  console.log(
    '\n⚠️  This repo is incomplete until project setup finishes (writes .setup-complete). See AGENTS.md and local setup docs.\n',
  )
}

try {
  execFileSync(process.execPath, [hookInstallerPath], {
    cwd: root,
    stdio: 'inherit',
  })
} catch {
  // The hook installer already reports why it could not configure hooks.
}

const skillsSyncCommand = existsSync(skillsSyncWindowsBinPath)
  ? skillsSyncWindowsBinPath
  : existsSync(skillsSyncBinPath)
    ? skillsSyncBinPath
    : null

if (!skillsSyncCommand) {
  console.warn(
    '\n⚠️  Skipping skills sync because @narduk-enterprises/narduk-skills is not installed yet.\n',
  )
  process.exit(0)
}

try {
  execFileSync(skillsSyncCommand, ['sync', '--clean'], {
    cwd: root,
    stdio: 'inherit',
  })
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.warn(`[postinstall] Skipping narduk-skills sync: ${message}`)
}

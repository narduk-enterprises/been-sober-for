#!/usr/bin/env node

const { execFileSync } = require('node:child_process')
const { existsSync, mkdirSync, readFileSync, rmSync } = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const packageJsonPath = path.join(root, 'package.json')
const lockfilePath = path.join(root, 'pnpm-lock.yaml')
const nodeModulesPath = path.join(root, 'node_modules')
const installedLockfilePath = path.join(nodeModulesPath, '.pnpm', 'lock.yaml')

const hookName = process.argv[2] || ''

function getOutput(command, args) {
  try {
    return execFileSync(command, args, {
      cwd: root,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

function shouldSkip() {
  if (process.env.NARDUK_SKIP_AUTO_INSTALL === '1') return true
  if (process.env.CI && process.env.CI !== '0' && process.env.CI !== 'false') return true
  if (!existsSync(packageJsonPath)) return true

  if (hookName === 'post-checkout') {
    const isBranchCheckout = process.argv[5] === '1'
    if (!isBranchCheckout) return true
  }

  return false
}

function installStateMatchesLockfile() {
  if (!existsSync(lockfilePath) || !existsSync(installedLockfilePath)) return false
  return readFileSync(lockfilePath, 'utf-8') === readFileSync(installedLockfilePath, 'utf-8')
}

function installIsRequired() {
  if (!existsSync(nodeModulesPath)) return true
  if (!existsSync(installedLockfilePath)) return true
  return !installStateMatchesLockfile()
}

function withInstallLock(callback) {
  const gitDir = getOutput('git', ['rev-parse', '--git-dir'])
  if (!gitDir) {
    callback()
    return
  }

  const resolvedGitDir = path.isAbsolute(gitDir) ? gitDir : path.resolve(root, gitDir)
  const lockDir = path.join(resolvedGitDir, 'narduk-auto-install.lock')

  try {
    mkdirSync(lockDir)
  } catch {
    console.log('ℹ️ Auto-install already running for this worktree; skipping duplicate hook.')
    return
  }

  try {
    callback()
  } finally {
    rmSync(lockDir, { recursive: true, force: true })
  }
}

function runInstall() {
  console.log('📦 Fresh or stale worktree detected; running pnpm install...')

  const env = { ...process.env }

  if (process.env.NARDUK_PLATFORM_GH_PACKAGES_READ || process.env.NARDUK_PLATFORM_GH_PACKAGES_RW) {
    execFileSync('pnpm', ['run', 'package-registry:auth'], {
      cwd: root,
      stdio: 'inherit',
      env,
    })
    env.NPM_CONFIG_USERCONFIG = path.join(root, '.npmrc.auth')
    env.NPM_CONFIG_GLOBALCONFIG = '/dev/null'
  }

  execFileSync('pnpm', ['install'], {
    cwd: root,
    stdio: 'inherit',
    env,
  })
}

if (shouldSkip() || !installIsRequired()) {
  process.exit(0)
}

withInstallLock(() => {
  if (!installIsRequired()) return

  try {
    runInstall()
  } catch {
    console.warn('⚠️ Auto-install hook failed. Run `pnpm install` manually.')
  }
})

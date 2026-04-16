#!/usr/bin/env node

const { execFileSync } = require('node:child_process')
const { existsSync } = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const nodeModulesPath = path.join(root, 'node_modules')

if (!existsSync(nodeModulesPath)) {
  process.exit(0)
}

let staged
try {
  staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'], {
    cwd: root,
    encoding: 'buffer',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
} catch {
  process.exit(0)
}

const files = staged
  .toString('utf-8')
  .split('\0')
  .filter(Boolean)
  .filter((file) => existsSync(path.join(root, file)))

if (files.length === 0) {
  process.exit(0)
}

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

function stashUnstagedChanges(stagedFiles) {
  const unstagedFiles = getOutput('git', ['diff', '--name-only', '--', ...stagedFiles])
    .split('\n')
    .filter(Boolean)

  if (unstagedFiles.length === 0) {
    return null
  }

  const stashMessage = `format-staged-files:${process.pid}:${Date.now()}`
  execFileSync(
    'git',
    ['stash', 'push', '--keep-index', '--quiet', '--message', stashMessage, '--', ...unstagedFiles],
    {
      cwd: root,
      stdio: 'inherit',
    },
  )

  const stashRef = getOutput('git', ['stash', 'list', '--format=%gd:%gs'])
    .split('\n')
    .find((entry) => entry.endsWith(`:${stashMessage}`))
    ?.split(':')[0]

  return stashRef || null
}

function restoreUnstagedChanges(stashRef) {
  if (!stashRef) {
    return
  }

  execFileSync('git', ['stash', 'pop', '--quiet', stashRef], {
    cwd: root,
    stdio: 'inherit',
  })
}

let unstagedStashRef = null

try {
  unstagedStashRef = stashUnstagedChanges(files)
  execFileSync('pnpm', ['exec', 'prettier', '--write', '--ignore-unknown', '--', ...files], {
    cwd: root,
    stdio: 'inherit',
  })
  execFileSync('git', ['add', '--', ...files], {
    cwd: root,
    stdio: 'inherit',
  })
} catch {
  console.error()
  console.error('Prettier failed while formatting staged files.')
  process.exitCode = 1
} finally {
  try {
    restoreUnstagedChanges(unstagedStashRef)
  } catch {
    console.error()
    console.error('Failed to restore unstaged changes after formatting staged files.')
    process.exitCode = 1
  }
}

if (process.exitCode) {
  process.exit(process.exitCode)
}

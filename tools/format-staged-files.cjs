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

try {
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
  process.exit(1)
}

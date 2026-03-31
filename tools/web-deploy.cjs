#!/usr/bin/env node

const { spawnSync } = require('node:child_process')

const allowShip = process.env.NARDUK_SHIP_ACTIVE === '1'
const allowDirect = process.env.NARDUK_ALLOW_DIRECT_DEPLOY === '1'

if (!allowShip && !allowDirect) {
  console.error(
    [
      'Direct app deploys are blocked because they bypass the root ship checks.',
      'Run `pnpm ship` from the repo root instead.',
      'If you intentionally need a manual app-level deploy after `sync-template` or `update-layer`,',
      'run `pnpm install --frozen-lockfile` at the repo root first and then rerun with',
      '`NARDUK_ALLOW_DIRECT_DEPLOY=1 pnpm --filter web run deploy`.',
    ].join('\n'),
  )
  process.exit(1)
}

const result = spawnSync('pnpm', ['exec', 'wrangler', 'deploy', '--env='], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: process.env,
})

if (result.error) {
  throw result.error
}

process.exit(result.status ?? 1)

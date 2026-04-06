/**
 * check-setup.js — Bootstrap Guard
 * ─────────────────────────────────
 * Runs as a `pre*` hook before dev/build/deploy to ensure a `.setup-complete`
 * sentinel exists (written by bootstrap/setup flows for new apps, or
 * committed for authoring monorepos).
 */
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const SENTINEL = path.join(ROOT, '.setup-complete')

if (!fs.existsSync(SENTINEL)) {
  console.error()
  console.error('┌──────────────────────────────────────────────────────────────┐')
  console.error('│  🚨  PROJECT SETUP NOT COMPLETE                             │')
  console.error('│                                                              │')
  console.error('│  This repo is missing the .setup-complete sentinel.          │')
  console.error('│  Finish your setup/bootstrap flow or restore the sentinel    │')
  console.error('│  before running dev/build/deploy commands.                   │')
  console.error('│                                                              │')
  console.error('│  APP REPOS:                                                  │')
  console.error('│    Run the repo-specific setup/bootstrap process until       │')
  console.error('│    it writes .setup-complete.                                │')
  console.error('│                                                              │')
  console.error('│  AUTHORING WORKSPACES:                                       │')
  console.error('│    This clone should include a tracked .setup-complete.      │')
  console.error('│    If you removed it, restore from git or re-clone.          │')
  console.error('│                                                              │')
  console.error('│  See AGENTS.md and local setup docs.                          │')
  console.error('└──────────────────────────────────────────────────────────────┘')
  console.error()
  process.exit(1)
}

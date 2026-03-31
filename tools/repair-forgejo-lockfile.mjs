import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const lockfilePath = path.join(rootDir, 'pnpm-lock.yaml')
const registryBase = 'https://code.platform.nard.uk/api/packages/narduk-enterprises/npm/'
const registryMetadataBase = 'https://code.platform.nard.uk/api/packages/narduk-enterprises/npm'

function fail(message) {
  console.error(`❌ ${message}`)
  process.exit(1)
}

function normalizeVersion(rawVersion) {
  return rawVersion.split('(')[0]?.trim() ?? ''
}

async function getForgejoTarballUrl(packageName, version, forgejoToken) {
  const metadataUrl = `${registryMetadataBase}/${encodeURIComponent(packageName)}`
  const metadataResponse = await fetch(metadataUrl, {
    headers: {
      Accept: 'application/json',
      Authorization: `token ${forgejoToken}`,
    },
  })

  if (!metadataResponse.ok) {
    fail(`Package metadata request failed with ${metadataResponse.status} for ${packageName}.`)
  }

  const metadata = await metadataResponse.json()
  const tarballUrl = metadata?.versions?.[version]?.dist?.tarball
  if (typeof tarballUrl !== 'string' || !tarballUrl.startsWith(registryBase)) {
    fail(`Missing Forgejo tarball URL for ${packageName}@${version}.`)
  }

  return tarballUrl
}

const forgejoToken = process.env.FORGEJO_TOKEN?.trim()
if (!forgejoToken) {
  fail('FORGEJO_TOKEN is required for pnpm-lock.yaml repair.')
}

const original = fs.readFileSync(lockfilePath, 'utf8')
const lines = original.replace(/\r?\n$/, '').split(/\r?\n/)
let currentPackageName = null
let currentVersion = null
let replacements = 0
const tarballCache = new Map()

for (let index = 0; index < lines.length; index += 1) {
  const line = lines[index]
  const headerMatch = line.match(/^ {2}'(@narduk-enterprises\/[^@']+)@([^']+)'/)

  if (headerMatch) {
    currentPackageName = headerMatch[1]
    currentVersion = normalizeVersion(headerMatch[2] ?? '')
    continue
  }

  if (!line.startsWith('  ')) {
    currentPackageName = null
    currentVersion = null
    continue
  }

  if (!currentPackageName || !currentVersion) {
    continue
  }

  const tarballMatch = line.match(/^(.*?tarball:\s+)([^,\s}]+)(.*)$/)
  if (!tarballMatch) {
    continue
  }

  const currentTarballUrl = tarballMatch[2]
  if (!currentTarballUrl || currentTarballUrl.startsWith(registryBase)) {
    continue
  }

  const cacheKey = `${currentPackageName}@${currentVersion}`
  let forgejoTarballUrl = tarballCache.get(cacheKey)
  if (!forgejoTarballUrl) {
    forgejoTarballUrl = await getForgejoTarballUrl(currentPackageName, currentVersion, forgejoToken)
    tarballCache.set(cacheKey, forgejoTarballUrl)
  }

  lines[index] = `${tarballMatch[1]}${forgejoTarballUrl}${tarballMatch[3]}`
  replacements += 1
  console.log(`🔁 Rewrote ${currentPackageName}@${currentVersion} lockfile tarball to Forgejo.`)
}

if (replacements === 0) {
  console.log('ℹ️ pnpm-lock.yaml already points managed package tarballs at Forgejo.')
  process.exit(0)
}

fs.writeFileSync(lockfilePath, `${lines.join('\n')}\n`)
console.log(`✅ Updated ${replacements} managed package tarball entr${replacements === 1 ? 'y' : 'ies'} in pnpm-lock.yaml.`)

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
  const dist = metadata?.versions?.[version]?.dist
  const tarballUrl = dist?.tarball
  const integrity = dist?.integrity

  if (typeof tarballUrl !== 'string' || !tarballUrl.startsWith(registryBase)) {
    fail(`Missing Forgejo tarball URL for ${packageName}@${version}.`)
  }

  if (typeof integrity !== 'string' || !integrity.startsWith('sha512-')) {
    fail(`Missing Forgejo integrity for ${packageName}@${version}.`)
  }

  return {
    tarballUrl,
    integrity,
  }
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
  const integrityMatch = line.match(/^(.*?integrity:\s+)([^,\s}]+)(.*)$/)
  const currentIntegrity = integrityMatch?.[2] ?? null

  const cacheKey = `${currentPackageName}@${currentVersion}`
  let forgejoDist = tarballCache.get(cacheKey)
  if (!forgejoDist) {
    forgejoDist = await getForgejoTarballUrl(currentPackageName, currentVersion, forgejoToken)
    tarballCache.set(cacheKey, forgejoDist)
  }

  if (
    currentTarballUrl === forgejoDist.tarballUrl &&
    currentIntegrity === forgejoDist.integrity
  ) {
    continue
  }

  let updatedLine = `${tarballMatch[1]}${forgejoDist.tarballUrl}${tarballMatch[3]}`
  if (integrityMatch) {
    updatedLine = updatedLine.replace(
      /^(.*?integrity:\s+)([^,\s}]+)(.*)$/,
      `$1${forgejoDist.integrity}$3`,
    )
  }

  lines[index] = updatedLine
  replacements += 1
  console.log(`🔁 Rewrote ${currentPackageName}@${currentVersion} lockfile resolution to Forgejo.`)
}

if (replacements === 0) {
  console.log('ℹ️ pnpm-lock.yaml already points managed package tarballs at Forgejo.')
  process.exit(0)
}

fs.writeFileSync(lockfilePath, `${lines.join('\n')}\n`)
console.log(`✅ Updated ${replacements} managed package tarball entr${replacements === 1 ? 'y' : 'ies'} in pnpm-lock.yaml.`)

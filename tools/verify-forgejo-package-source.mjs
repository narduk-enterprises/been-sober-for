import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const npmrcPath = path.join(rootDir, '.npmrc')
const lockfilePath = path.join(rootDir, 'pnpm-lock.yaml')
const registryBase = 'https://code.platform.nard.uk/api/packages/narduk-enterprises/npm/'
const registryHostPrefix = '//code.platform.nard.uk/api/packages/narduk-enterprises/npm/'
const registryMetadataBase = 'https://code.platform.nard.uk/api/packages/narduk-enterprises/npm'

function fail(message) {
  console.error(`❌ ${message}`)
  process.exit(1)
}

function getManagedPackageVersions(lockfileContent) {
  const packages = new Map()
  const matcher = /'(@narduk-enterprises\/[^@']+)@([^']+)'/g

  for (const match of lockfileContent.matchAll(matcher)) {
    const packageName = match[1]
    const rawVersion = match[2]
    if (!packageName || !rawVersion) continue

    const version = rawVersion.split('(')[0]?.trim()
    if (!version || version.startsWith('workspace:')) continue

    const versions = packages.get(packageName) ?? new Set()
    versions.add(version)
    packages.set(packageName, versions)
  }

  return [...packages.entries()]
    .map(([packageName, versions]) => ({
      packageName,
      versions: [...versions].sort(),
    }))
    .sort((left, right) => left.packageName.localeCompare(right.packageName))
}

async function verifyPackage(packageName, version, forgejoToken) {
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

  if (!dist?.tarball || typeof dist.tarball !== 'string') {
    fail(`Package metadata for ${packageName}@${version} does not include a tarball URL.`)
  }

  if (!dist.tarball.startsWith(registryBase)) {
    fail(
      `Tarball URL for ${packageName}@${version} must come from ${registryBase}, received ${dist.tarball}.`,
    )
  }

  const tarballResponse = await fetch(dist.tarball, {
    headers: {
      Accept: 'application/octet-stream',
      Authorization: `token ${forgejoToken}`,
    },
  })

  if (!tarballResponse.ok) {
    fail(`Tarball fetch failed with ${tarballResponse.status} for ${packageName}@${version}.`)
  }

  await tarballResponse.body?.cancel?.()
  return dist.tarball
}

const npmrc = fs.readFileSync(npmrcPath, 'utf8')
const npmrcLines = npmrc
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)

if (!npmrc.includes(`@narduk-enterprises:registry=${registryBase}`)) {
  fail(`.npmrc must scope @narduk-enterprises to ${registryBase}.`)
}

for (const line of npmrcLines) {
  if (line === `registry=${registryBase}`) {
    fail(`.npmrc must not override the full npm registry to ${registryBase}.`)
  }

  if (line === '@narduk-enterprises:registry=https://npm.pkg.github.com') {
    fail('.npmrc must not route @narduk-enterprises packages through npm.pkg.github.com.')
  }

  if (line.startsWith('//npm.pkg.github.com/:_authToken=')) {
    fail('.npmrc must not commit a GitHub Packages auth token.')
  }
}

const npmTokenLine = `${registryHostPrefix}:_authToken=`
if (npmrc.includes(npmTokenLine)) {
  fail(`.npmrc must not commit ${npmTokenLine} entries.`)
}

const forgejoToken = process.env.FORGEJO_TOKEN?.trim()
if (!forgejoToken) {
  fail('FORGEJO_TOKEN is required for package verification.')
}

const lockfile = fs.readFileSync(lockfilePath, 'utf8')
const packages = getManagedPackageVersions(lockfile)

if (packages.length === 0) {
  console.log('ℹ️ No managed @narduk-enterprises packages were found in pnpm-lock.yaml.')
  process.exit(0)
}

for (const { packageName, versions } of packages) {
  for (const version of versions) {
    const tarballUrl = await verifyPackage(packageName, version, forgejoToken)
    console.log(`✅ ${packageName}@${version} via ${tarballUrl}`)
  }
}

const expectedAuthAuthorityUrl = 'https://auth.platform.nard.uk'

const requiredVariables = [
  'SITE_URL',
  'AUTH_AUTHORITY_URL',
  'SUPABASE_AUTH_ANON_KEY',
  'SUPABASE_AUTH_SERVICE_ROLE_KEY',
  'AUTH_PROVIDERS',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
  'FORGEJO_TOKEN',
]

function fail(message) {
  console.error(`❌ ${message}`)
  process.exit(1)
}

for (const name of requiredVariables) {
  if (!process.env[name]?.trim()) {
    fail(`Missing required environment variable ${name}.`)
  }
}

const siteUrl = process.env.SITE_URL?.trim() || ''
let parsedSiteUrl

try {
  parsedSiteUrl = new URL(siteUrl)
} catch {
  fail(`SITE_URL must be a valid absolute URL, received ${siteUrl}.`)
}

if (parsedSiteUrl.protocol !== 'https:') {
  fail(`SITE_URL must use https, received ${siteUrl}.`)
}

if (parsedSiteUrl.hostname === 'localhost' || parsedSiteUrl.hostname === '127.0.0.1') {
  fail(`SITE_URL must point at a deployed origin, received ${siteUrl}.`)
}

if (process.env.AUTH_AUTHORITY_URL !== expectedAuthAuthorityUrl) {
  fail(
    `AUTH_AUTHORITY_URL must be ${expectedAuthAuthorityUrl}, received ${process.env.AUTH_AUTHORITY_URL}.`,
  )
}

const providers = (process.env.AUTH_PROVIDERS || '')
  .split(',')
  .map((provider) => provider.trim().toLowerCase())
  .filter(Boolean)

if (!providers.includes('email')) {
  fail(`AUTH_PROVIDERS must include email, received ${process.env.AUTH_PROVIDERS}.`)
}

console.log(`✅ Production deploy env validated for ${siteUrl}.`)

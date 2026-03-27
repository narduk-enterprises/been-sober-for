import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const localNuxtPort = Number(process.env.NUXT_PORT || 3000)
const localAppUrl = `http://localhost:${Number.isFinite(localNuxtPort) ? localNuxtPort : 3000}`
const siteUrl = process.env.SITE_URL || ''

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // Extend the published Narduk Nuxt Layer
  extends: ['@narduk-enterprises/narduk-nuxt-template-layer'],

  // nitro-cloudflare-dev proxies D1 bindings to the local dev server
  modules: ['nitro-cloudflare-dev'],

  nitro: {
    cloudflareDev: {
      configPath: resolve(__dirname, 'wrangler.json'),
      ...(process.env.NUXT_WRANGLER_ENVIRONMENT
        ? { environment: process.env.NUXT_WRANGLER_ENVIRONMENT }
        : {}),
    },
  },

  future: {
    compatibilityVersion: 4,
  },

  devServer: {
    port: Number.isFinite(localNuxtPort) ? localNuxtPort : 3000,
  },

  runtimeConfig: {
    posthogOwnerDistinctId: process.env.POSTHOG_OWNER_DISTINCT_ID || '',
    // Server-only (admin API routes)
    googleServiceAccountKey: process.env.GSC_SERVICE_ACCOUNT_JSON || '',
    posthogApiKey: process.env.POSTHOG_PERSONAL_API_KEY || '',
    gaPropertyId: process.env.GA_PROPERTY_ID || '',
    posthogProjectId: process.env.POSTHOG_PROJECT_ID || '',
    public: {
      appUrl: process.env.SITE_URL || localAppUrl,
      appName: process.env.APP_NAME || 'Been Sober For.com',
      // Analytics (client-side tracking)
      posthogPublicKey: process.env.POSTHOG_PUBLIC_KEY || '',
      posthogHost: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
      gaMeasurementId: process.env.GA_MEASUREMENT_ID || '',
      // IndexNow
      indexNowKey: process.env.INDEXNOW_KEY || '',
    },
  },

  site: {
    ...(siteUrl ? { url: siteUrl } : {}),
    name: 'Been Sober For.com',
    description:
      'A simple site where users can register, upload a photo, and input the date of their last drink. Then share it with people. On their account profile page, they can click start again, if they have a drink.',
    defaultLocale: 'en',
  },

  schemaOrg: {
    identity: {
      type: 'Organization',
      name: 'Been Sober For.com',
      ...(siteUrl ? { url: siteUrl } : {}),
      logo: '/favicon.svg',
    },
  },

  image: {
    cloudflare: {
      ...(siteUrl ? { baseURL: siteUrl } : {}),
    },
  },
})

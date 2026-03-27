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

  css: [fileURLToPath(new URL('./app/assets/css/bsf-landing.css', import.meta.url))],

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
      appName: process.env.APP_NAME || 'BeenSoberFor',
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
    name: 'BeenSoberFor',
    description:
      'Track how long you have been sober with a simple personal counter. Create a shareable profile, upload your photo, and print a QR code for your progress page.',
    defaultLocale: 'en',
  },

  // Static marketing — prerender for fast first byte and stable SEO shell (Nitro + Workers)
  routeRules: {
    '/': { prerender: true },
    '/about': { prerender: true },
    '/faq': { prerender: true },
    '/privacy': { prerender: true },
    '/terms': { prerender: true },
    '/contact': { prerender: true },
    '/sobriety-calculator': { prerender: true },
    '/example': { prerender: true },
    '/print/example': { prerender: true },
    '/30-days-sober': { prerender: true },
    '/60-days-sober': { prerender: true },
    '/90-days-sober': { prerender: true },
    '/100-days-sober': { prerender: true },
    '/6-months-sober': { prerender: true },
    '/1-year-sober': { prerender: true },
    '/2-years-sober': { prerender: true },
  },

  schemaOrg: {
    identity: {
      type: 'Organization',
      name: 'BeenSoberFor',
      ...(siteUrl ? { url: siteUrl } : {}),
      logo: '/logo-mark.svg',
    },
  },

  image: {
    cloudflare: {
      ...(siteUrl ? { baseURL: siteUrl } : {}),
    },
  },
})

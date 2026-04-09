import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

import { resolveAuthEnvironment } from './auth-environment'

const __dirname = dirname(fileURLToPath(import.meta.url))
const localNuxtPort = Number(process.env.NUXT_PORT || 3000)
const localAppUrl = `http://localhost:${Number.isFinite(localNuxtPort) ? localNuxtPort : 3000}`
const siteUrl = process.env.SITE_URL || ''

const {
  appBackendPreset,
  authAuthorityUrl,
  authBackend,
  authProviders,
  supabasePublishableKey,
  supabaseServiceRoleKey,
  supabaseUrl,
} = resolveAuthEnvironment(process.env)
const appOrmTablesEntry =
  process.env.NUXT_DATABASE_BACKEND === 'postgres'
    ? './server/database/pg-app-schema.ts'
    : './server/database/app-schema.ts'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // Extend the published Narduk Nuxt Layer
  extends: [
    '@narduk-enterprises/narduk-nuxt-template-layer-theme-balanced',
    '@narduk-enterprises/narduk-nuxt-template-layer-core',
    '@narduk-enterprises/narduk-nuxt-template-layer-seo',
    '@narduk-enterprises/narduk-nuxt-template-layer-auth',
    '@narduk-enterprises/narduk-nuxt-template-layer-analytics',
    '@narduk-enterprises/narduk-nuxt-template-layer-uploads',
  ],

  alias: {
    '#server/app-orm-tables': fileURLToPath(new URL(appOrmTablesEntry, import.meta.url)),
  },

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
    appBackendPreset,
    authBackend,
    authAuthorityUrl,
    authAnonKey: supabasePublishableKey,
    authServiceRoleKey: supabaseServiceRoleKey,
    authStorageKey: process.env.AUTH_STORAGE_KEY || 'web-auth',
    turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY || '',
    supabaseUrl,
    supabasePublishableKey,
    supabaseServiceRoleKey,
    posthogOwnerDistinctId: process.env.POSTHOG_OWNER_DISTINCT_ID || '',
    // Server-only (admin API routes)
    googleServiceAccountKey: process.env.GSC_SERVICE_ACCOUNT_JSON || '',
    posthogApiKey: process.env.POSTHOG_PERSONAL_API_KEY || '',
    gaPropertyId: process.env.GA_PROPERTY_ID || '',
    posthogProjectId: process.env.POSTHOG_PROJECT_ID || '',
    public: {
      appBackendPreset,
      authBackend,
      authAuthorityUrl,
      authLoginPath: '/login',
      authRegisterPath: '/register',
      authCallbackPath: '/auth/callback',
      authConfirmPath: '/auth/confirm',
      authResetPath: '/reset-password',
      authLogoutPath: '/logout',
      authRedirectPath: '/dashboard/',
      authProviders,
      authEnforceCanonicalHost: process.env.AUTH_ENFORCE_CANONICAL_HOST === 'true',
      authPublicSignup: process.env.AUTH_PUBLIC_SIGNUP !== 'false',
      authRequireMfa: process.env.AUTH_REQUIRE_MFA === 'true',
      authTurnstileSiteKey: process.env.TURNSTILE_SITE_KEY || '',
      supabaseUrl,
      supabasePublishableKey,
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
    '/7-days-sober': { prerender: true },
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

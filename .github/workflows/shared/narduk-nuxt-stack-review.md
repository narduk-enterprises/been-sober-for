<!-- Nuxt stack guidance distilled from the repo skill set. -->

# Nuxt Stack Review

Apply this guidance when the repository contains Nuxt or Nitro files such as
`nuxt.config.*`, `app/`, `server/`, `content.config.*`, `modules/`, or
`defineNuxtModule(...)`.

## Nuxt core and runtime checks

- In pages and top-level route components, prefer `useAsyncData()` or
  `useFetch()` for reads that should hydrate from SSR. Flag raw top-level
  `$fetch()` in `script setup` as an anti-pattern unless it is clearly a
  user-triggered write.
- Keep the initial SSR render deterministic. Flag `Date.now()`, `Math.random()`,
  fragment-driven markup, browser globals, or storage reads that affect the
  first render without `onMounted()`, `ClientOnly`, or client-only guards.
- Prefer Nuxt primitives over framework bypasses when it matters: `useRoute()`
  from Nuxt, `NuxtLink` for internal navigation, `NuxtImg` and related
  components when the repo standard expects them.
- Check route rules, middleware, and plugins for obvious misuse, accidental
  client-only assumptions, or duplicated logic that should live in composables
  or server utilities.

## Server and Workers checks

- In Cloudflare/Nitro server code, flag Node.js built-ins, shared mutable module
  state, and patterns that are unsafe in Workers isolates.
- Mutation handlers should use the repository's validation wrappers when the
  repo documents them. Direct body reads without validation are high-value
  findings.
- Prefer repo-standard aliases such as `#server/` when long relative imports
  signal architectural drift.

## Modules and layering checks

- If the repo contains `modules/` or published Nuxt modules, check for
  `defineNuxtModule()` patterns, clear runtime boundaries, and avoided
  duplication between module runtime and app code.
- In layered repos, flag app code that recreates shared layer behavior instead
  of using the provided layer abstractions.

## What to report

Report only findings that are likely to cause:

- broken data fetching or request waterfalls
- hydration mismatches or SSR/client divergence
- incorrect routing or middleware behavior
- Workers runtime incompatibility
- duplicated architecture that will drift or regress

<script setup lang="ts">
/**
 * SPEC / UI_PLAN: `/profile` is the profile entry; dashboard holds the live counter UI.
 * Unauthenticated users hit auth middleware on `/dashboard` and are sent to `/login`.
 */
useSeo({
  title: 'Profile',
  description: 'Your sober counter dashboard.',
  robots: 'noindex, nofollow',
  ogImage: { title: 'Profile', description: 'Dashboard redirect', icon: '👤' },
})
useWebPageSchema({ name: 'Profile', description: 'Redirect to your dashboard.' })

definePageMeta({ layout: false })
await navigateTo('/dashboard', { replace: true, redirectCode: 307 })
</script>

<template>
  <div />
</template>

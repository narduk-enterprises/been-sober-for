<script setup lang="ts">
/** Alias for “my” home — same as `/profile`. */
useSeo({
  title: 'My dashboard',
  description: 'Your sober counter dashboard.',
  robots: 'noindex, nofollow',
  ogImage: { title: 'My dashboard', description: 'Dashboard redirect', icon: '👤' },
})
useWebPageSchema({ name: 'My dashboard', description: 'Redirect to your dashboard.' })

definePageMeta({ layout: false })
await navigateTo('/dashboard', { replace: true, redirectCode: 307 })
</script>

<template>
  <div />
</template>

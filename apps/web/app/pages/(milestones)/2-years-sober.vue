<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

const pageTitle = '2 Years Sober | BeenSoberFor'
const pageDescription =
  'Two years alcohol-free: steady progress, simple language, and tools to track or share your sober time respectfully.'

useSeo({
  title: pageTitle,
  description: pageDescription,
  ogImage: {
    title: pageTitle,
    description: pageDescription,
    icon: 'i-lucide-leaf',
  },
})

useWebPageSchema({
  name: pageTitle,
  description: pageDescription,
})
</script>

<template>
  <BsfMilestonePage
    headline="2 years sober"
    lead="Long-term sobriety is often less about drama and more about maintenance. A calm counter page matches that reality: proof of time, without turning life into a campaign."
    :sections="[
      {
        title: 'Long arcs, plain numbers',
        body: 'Years, months, and days from your start date tell the story without embellishment. Hide or show your start date on the public page based on what feels right.',
      },
      {
        title: 'Privacy stays in your hands',
        body: 'Keep the page private, share-only with noindex, or allow indexing if you want discoverability. The default errs toward not surfacing personal sobriety status in search.',
      },
    ]"
  />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

const pageTitle = '6 Months Sober | Been Sober For.com'
const pageDescription =
  'Half a year alcohol-free: context for the milestone and a simple way to track sober days with an optional shareable profile.'

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
    headline="6 months sober"
    lead="Half a year is a steady arc—enough seasons to prove you can navigate holidays, stress, and boredom differently. Celebrate in a tone that feels like you."
    :sections="[
      {
        title: 'What often changes by six months',
        body: 'Energy, relationships, and self-trust frequently shift in ways that are hard to see day to day but obvious on a calendar. This is encouragement, not a guarantee.',
      },
      {
        title: 'Shareable, not searchable by default',
        body: 'Public profile pages are not indexed by default. If you want search engines to see your page, that is an explicit choice in settings.',
      },
    ]"
  />
</template>

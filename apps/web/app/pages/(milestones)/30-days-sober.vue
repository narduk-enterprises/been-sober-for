<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

const pageTitle = '30 Days Sober | BeenSoberFor'
const pageDescription =
  'What one month alcohol-free can mean, plus a simple sober day counter and shareable page when you are ready.'

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
    headline="30 days sober"
    lead="A month is a real stretch of days—enough to notice sleep, mood, and routines shifting. However you mark it, the count is yours to own and share on your terms."
    :sections="[
      {
        title: 'What this milestone can mean',
        body: 'Many people notice the first month as a turning point: clearer mornings, fewer cravings spikes, more proof that change is possible. Your experience is individual; this page is context, not a verdict.',
      },
      {
        title: 'Share it your way',
        body: 'If you want a simple card, QR code, or link for someone who is cheering you on, BeenSoberFor is built for that—without turning your progress into a public feed.',
      },
    ]"
  />
</template>

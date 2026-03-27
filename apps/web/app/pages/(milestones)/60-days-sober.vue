<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

const pageTitle = '60 Days Sober | BeenSoberFor'
const pageDescription =
  'Two months alcohol-free: practical context and a gentle path to a personal sober counter and printable QR page.'

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
    headline="60 days sober"
    lead="Two months stacks evidence that new rhythms can stick. Whether you celebrate quietly or share a link, the goal here is clarity—not noise."
    :sections="[
      {
        title: 'Why people notice this window',
        body: 'Cravings often soften, confidence in social settings can grow, and the idea of “not drinking tonight” feels less like a battle. Milestones are personal; use language that fits you.',
      },
      {
        title: 'Print or share',
        body: 'A wallet card or fridge printout with a QR code to your page can be easier than re-explaining your story. You control visibility: private, unlisted, or public.',
      },
    ]"
  />
</template>

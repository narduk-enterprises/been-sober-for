<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

const pageTitle = '1 Year Sober | BeenSoberFor'
const pageDescription =
  'One year alcohol-free: what the anniversary can mean, plus a sober anniversary counter and printable QR ideas.'

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
    headline="1 year sober"
    lead="A full trip around the sun without alcohol is a serious milestone. Present it with quiet confidence—a clear count, optional message, and a QR if you want something tangible."
    :sections="[
      {
        title: 'Anniversary without the noise',
        body: 'Skip the pressure to perform gratitude. A plain counter, a short line you wrote yourself, and a link or printout can be enough.',
      },
      {
        title: 'Sober anniversary ideas that stay grounded',
        body: 'QR code on a card, a single share image, a framed print for your space—pick one format. BeenSoberFor keeps the layout clean so the number stays readable.',
      },
    ]"
  />
</template>

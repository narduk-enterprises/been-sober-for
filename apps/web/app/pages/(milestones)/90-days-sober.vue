<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

const pageTitle = '90 Days Sober | Been Sober For.com'
const pageDescription =
  'Three months sober: what it often represents, and tools to track and share your sober time with a simple counter page.'

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
    headline="90 days sober"
    lead="A quarter of a year is a strong, plain-language milestone. If you are marking it, you deserve a presentation that feels calm and dignified—not loud or performative."
    :sections="[
      {
        title: 'A quarter year, in everyday terms',
        body: 'Routines feel more automatic, triggers become easier to anticipate, and the benefits of steadier sleep and mood are easier to point to. None of this replaces professional support when you need it.',
      },
      {
        title: 'Ideas that stay tasteful',
        body: 'Some people like a printed QR on a card, a single link in a text, or a milestone post image. Keep it simple; skip the clichés if they are not your voice.',
      },
    ]"
  />
</template>

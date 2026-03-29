<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

const pageTitle = '7 Days Sober | BeenSoberFor'
const pageDescription =
  'Seven days alcohol-free: a simple first-week milestone guide and a sober counter you can keep private or share later.'

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
    headline="7 days sober"
    lead="A week is early, but it is real. If you are marking seven days, you do not need a speech. You need a clear count, a steady page, and a little room to keep going."
    :sections="[
      {
        title: 'The first week is usually uneven',
        body: 'Sleep, mood, energy, and cravings can shift quickly in the first seven days. Some people feel relieved; others feel raw. A simple counter helps you record the time without pretending the week has to look a certain way.',
      },
      {
        title: 'Keep the win low-pressure',
        body: 'You can leave your page private, share it with one person, or wait until later. BeenSoberFor is built for quiet accountability, not public performance.',
      },
    ]"
  />
</template>

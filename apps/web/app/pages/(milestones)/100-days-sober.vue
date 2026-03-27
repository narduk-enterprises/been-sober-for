<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

const pageTitle = '100 Days Sober | Been Sober For.com'
const pageDescription =
  'One hundred days alcohol-free: gentle guidance and a sober day counter with optional share page and QR code.'

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
    headline="100 days sober"
    lead="Triple digits is easy for anyone to understand at a glance. If you want a clear number to share—or keep completely private—this site is built around that simplicity."
    :sections="[
      {
        title: 'Why 100 days resonates',
        body: 'It is a round number that reads well on a card, a calendar, or a chat. The meaning is whatever you assign; the tool is just honest math from your start date.',
      },
      {
        title: 'Calculator and page',
        body: 'Use the sobriety calculator to check your count anytime. When you want a living page with photo, message, and QR, create an account and set your visibility.',
      },
    ]"
  />
</template>

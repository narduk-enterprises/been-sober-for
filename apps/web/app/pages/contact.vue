<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

const title = 'Contact | BeenSoberFor'
const description =
  'Reach the BeenSoberFor team for support, privacy requests, and account questions.'

useSeo({
  title,
  description,
  ogImage: { title, description, icon: 'i-lucide-mail' },
})

useWebPageSchema({
  name: title,
  description,
  type: 'ContactPage',
})
</script>

<template>
  <UContainer class="py-10 sm:py-14">
    <article class="mx-auto max-w-3xl">
      <h1 class="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Contact</h1>
      <p class="text-muted mt-4 text-sm leading-relaxed sm:text-base">
        For privacy requests, bugs, or general questions, email us. We read every message; response
        times depend on volume.
      </p>
      <UCard class="mt-8">
        <p class="text-highlighted text-sm font-semibold">Email</p>
        <p class="mt-2">
          <ULink
            to="mailto:support@beensoberfor.com"
            class="text-primary-600 text-base font-medium dark:text-primary-400"
          >
            support@beensoberfor.com
          </ULink>
        </p>
      </UCard>
      <p class="text-muted mt-8 text-sm">
        Before writing in, check the
        <ULink to="/faq" class="text-primary-600 underline dark:text-primary-400">FAQ</ULink>
        for privacy, reset, and printing.
      </p>
    </article>
  </UContainer>
</template>

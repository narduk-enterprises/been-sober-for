<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

const title = 'Privacy Policy | Been Sober For.com'
const description =
  'How Been Sober For handles your account, profile data, sharing modes, and search visibility.'

useSeo({
  title,
  description,
  ogImage: { title, description, icon: 'i-lucide-shield' },
})

useWebPageSchema({
  name: title,
  description,
})
</script>

<template>
  <UContainer class="py-10 sm:py-14">
    <article class="mx-auto max-w-3xl">
      <h1 class="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Privacy policy</h1>
      <p class="text-dimmed mt-2 text-xs">Last updated: March 26, 2026</p>
      <div class="text-muted mt-6 space-y-4 text-sm leading-relaxed sm:text-base">
        <p>
          This policy describes how we treat information for Been Sober For in plain language. It is
          not legal advice; your counsel should review it before you rely on it commercially.
        </p>
        <h2 class="text-highlighted font-display text-xl font-semibold">What we collect</h2>
        <p>
          Account details you provide (such as email), profile fields (display name, photo, start
          date, optional message), and technical logs needed to run the service securely.
        </p>
        <h2 class="text-highlighted font-display text-xl font-semibold">Sharing and visibility</h2>
        <p>
          You choose whether your page is private, unlisted, or public, and whether search engines
          may index it. Default settings avoid indexing personal profile pages.
        </p>
        <h2 class="text-highlighted font-display text-xl font-semibold">Your choices</h2>
        <p>
          You can update or delete your account subject to product implementation. Contact us if you
          need help removing data.
        </p>
        <p>
          <ULink to="/contact" class="text-primary-600 underline dark:text-primary-400"
            >Contact</ULink
          >
          ·
          <ULink to="/terms" class="text-primary-600 underline dark:text-primary-400">Terms</ULink>
        </p>
      </div>
    </article>
  </UContainer>
</template>

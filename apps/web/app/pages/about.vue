<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

const title = 'About BeenSoberFor'
const description =
  'A minimal sobriety counter with a shareable page and printable QR—not treatment, not a forum, not a medical service.'

useSeo({
  title,
  description,
  ogImage: { title, description, icon: 'i-lucide-leaf' },
})

useWebPageSchema({
  name: title,
  description,
  type: 'AboutPage',
})
</script>

<template>
  <UContainer class="py-10 sm:py-14">
    <article class="mx-auto max-w-3xl">
      <h1 class="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        About this site
      </h1>
      <div class="text-muted mt-6 space-y-4 text-sm leading-relaxed sm:text-base">
        <p>
          BeenSoberFor is a personal counter: one start date, a live count in years, months, and
          days, and an optional public page you can share or print as a QR code.
        </p>
        <h2 class="text-highlighted font-display text-xl font-semibold">Who it is for</h2>
        <p>
          People who want a calm place to track alcohol-free time and share progress with sponsors,
          friends, or family—without comments, likes, or feeds.
        </p>
        <h2 class="text-highlighted font-display text-xl font-semibold">What it is not</h2>
        <p>
          It is not a treatment platform, medical service, crisis line, or heavy community app. It
          does not replace professional care.
        </p>
        <h2 class="text-highlighted font-display text-xl font-semibold">Tone and design</h2>
        <p>
          We aim for plain, respectful language—no preachy motivation or “warrior journey” clichés.
          Visuals stay soft, readable, and quietly confident.
        </p>
        <p>
          Questions? See the
          <ULink to="/faq" class="text-primary-600 underline dark:text-primary-400">FAQ</ULink>
          or
          <ULink to="/contact" class="text-primary-600 underline dark:text-primary-400"
            >contact</ULink
          >
          us.
        </p>
      </div>
    </article>
  </UContainer>
</template>

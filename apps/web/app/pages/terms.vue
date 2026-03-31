<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

const title = 'Terms of Use'
const description =
  'Terms for using BeenSoberFor: not medical care, acceptable use, and limitation of liability in plain language.'

useSeo({
  title,
  description,
  ogImage: { title, description, icon: 'i-lucide-file-text' },
})

useWebPageSchema({
  name: title,
  description,
})
</script>

<template>
  <UContainer class="py-10 sm:py-14">
    <article class="mx-auto max-w-3xl">
      <h1 class="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Terms of use</h1>
      <p class="text-dimmed mt-2 text-xs">Last updated: March 26, 2026</p>
      <div class="text-muted mt-6 space-y-4 text-sm leading-relaxed sm:text-base">
        <p>
          By using BeenSoberFor you agree to these terms. If you do not agree, do not use the
          service.
        </p>
        <h2 class="text-highlighted font-display text-xl font-semibold">Not medical care</h2>
        <p>
          The site is a simple counter and sharing tool. It does not provide treatment, diagnosis,
          or emergency support.
        </p>
        <h2 class="text-highlighted font-display text-xl font-semibold">Acceptable use</h2>
        <p>
          Do not misuse the service, attempt to access others’ private data, or use the product to
          harass anyone. We may suspend accounts that violate these expectations.
        </p>
        <h2 class="text-highlighted font-display text-xl font-semibold">Limitation of liability</h2>
        <p>
          The service is provided as-is. To the fullest extent permitted by law, we are not liable
          for indirect or consequential damages arising from use of the site.
        </p>
        <p>
          <ULink to="/privacy" class="text-primary-600 underline dark:text-primary-400"
            >Privacy</ULink
          >
          ·
          <ULink to="/contact" class="text-primary-600 underline dark:text-primary-400"
            >Contact</ULink
          >
        </p>
      </div>
    </article>
  </UContainer>
</template>

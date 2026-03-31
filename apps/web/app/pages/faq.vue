<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

const title = 'FAQ'
const description =
  'Privacy modes, sharing, QR printing, sober date reset, and account questions for BeenSoberFor.'

const faqItems = [
  {
    id: 'private',
    question: 'Can I keep my page private?',
    answer:
      'Yes. You can set your page to private (only you after login), unlisted (link works, noindex for search engines), or public with optional indexing. Profiles are not indexed by default so sobriety status does not surprise you in search results.',
  },
  {
    id: 'reset',
    question: 'How does “Start Again” / reset work?',
    answer:
      'From your private dashboard you can set a new sober start date after explicit confirmation. Copy is direct and supportive—not casual or punitive. Your public counter updates to reflect the new date.',
  },
  {
    id: 'print',
    question: 'Can I print my QR code?',
    answer:
      'Yes. Share settings include a print layout with high contrast: your name, large day count, QR code, short URL, and optional message. It is meant for wallet cards, fridge notes, or handouts.',
  },
  {
    id: 'share',
    question: 'What do people see on my public page?',
    answer:
      'You control photo, display name, counter, optional motto, whether the start date shows, and whether the QR appears. You can switch between minimal, standard, and print-ready presentations as the product matures.',
  },
  {
    id: 'account',
    question: 'How do accounts work?',
    answer:
      'You sign up with email and password (or your app’s auth method). Your dashboard holds edit profile, share settings, Start Again, and account deletion when implemented.',
  },
  {
    id: 'medical',
    question: 'Is this medical advice?',
    answer:
      'No. BeenSoberFor is a simple tool for counting and sharing time. For substance use support in the U.S., SAMHSA’s National Helpline is 1-800-662-4357. For emergencies, contact local emergency services.',
  },
] as const

useSeo({
  title,
  description,
  ogImage: { title, description, icon: 'i-lucide-circle-help' },
})

useWebPageSchema({
  name: title,
  description,
})

useFAQSchema(faqItems.map(({ question, answer }) => ({ question, answer })))
</script>

<template>
  <UContainer class="py-10 sm:py-14">
    <article class="mx-auto max-w-3xl">
      <h1 class="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Frequently asked questions
      </h1>
      <p class="text-muted mt-4 text-sm leading-relaxed sm:text-base">
        Straight answers about privacy, sharing, printing, and reset—without therapy-speak.
      </p>
      <div class="mt-10 space-y-10">
        <section v-for="item in faqItems" :id="item.id" :key="item.id" class="scroll-mt-28">
          <h2 class="font-display text-lg font-semibold sm:text-xl">{{ item.question }}</h2>
          <p class="text-muted mt-2 text-sm leading-relaxed sm:text-base">{{ item.answer }}</p>
        </section>
      </div>
    </article>
  </UContainer>
</template>

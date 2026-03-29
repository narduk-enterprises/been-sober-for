<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

const pageTitle = 'Public Sobriety Counters'
const pageDescription =
  'Browse public BeenSoberFor profiles from people who chose to share their sobriety counters.'

useSeo({
  title: pageTitle,
  description: pageDescription,
  ogImage: {
    title: pageTitle,
    description: pageDescription,
    icon: 'i-lucide-users',
  },
})

useWebPageSchema({
  name: pageTitle,
  description: pageDescription,
})

const { data: profiles, pending, error } = usePublicProfiles()
</script>

<template>
  <UContainer class="py-12 sm:py-16">
    <div class="max-w-3xl">
      <p class="text-primary-600 dark:text-primary-400 font-display text-sm font-medium italic">
        Shared publicly
      </p>
      <h1
        class="font-display text-highlighted mt-4 text-4xl font-semibold tracking-tight sm:text-5xl"
      >
        Public sobriety counters
      </h1>
      <p class="text-muted mt-5 text-base leading-relaxed sm:text-lg">
        These profiles are visible because their owners chose the public setting. Open any page to
        see the live day counter, photo, and message they decided to share.
      </p>
    </div>

    <div v-if="pending" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="text-muted h-10 w-10 animate-spin" />
    </div>

    <UAlert
      v-else-if="error"
      class="mt-10"
      color="error"
      variant="subtle"
      title="Could not load public profiles"
    />

    <div v-else-if="profiles?.length" class="mt-10">
      <BsfPublicProfilesGrid :profiles="profiles" />
    </div>

    <UAlert
      v-else
      class="mt-10"
      color="neutral"
      variant="subtle"
      title="No public profiles yet"
      description="When people switch their page visibility to public, they will appear here."
    />
  </UContainer>
</template>

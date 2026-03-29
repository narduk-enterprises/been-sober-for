<script setup lang="ts">
definePageMeta({ layout: 'minimal' })

const route = useRoute()
const slug = computed(() => {
  const raw = route.params.slug
  return typeof raw === 'string' ? raw : Array.isArray(raw) ? (raw[0] ?? '') : ''
})

useSeo({
  title: 'Print | BeenSoberFor',
  description: 'Printer-friendly sober counter card.',
  robots: 'noindex, nofollow',
})

useWebPageSchema({
  name: 'Print profile',
  description: 'Print layout for BeenSoberFor.',
})

const { data: profile, error, pending } = usePublicSoberProfile(slug)

const requestUrl = useRequestURL()
const profileUrl = computed(() => {
  const base = requestUrl.origin.replace(/\/$/, '')
  return `${base}/u/${slug.value}`
})

function printPage() {
  if (import.meta.client) window.print()
}
</script>

<template>
  <div class="print-page text-highlighted px-4 py-8 sm:px-8">
    <p class="screen-only text-muted mb-6 text-center text-sm">
      Use your browser print dialog for a black-and-white friendly layout.
      <UButton class="mt-3" size="sm" color="primary" icon="i-lucide-printer" @click="printPage">
        Print
      </UButton>
    </p>

    <div v-if="pending" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="text-muted h-8 w-8 animate-spin" />
    </div>
    <div v-else-if="error" class="mx-auto max-w-md text-center">
      <p class="text-muted text-sm">This print link is not available (page may be private).</p>
      <UButton to="/" class="mt-4" variant="ghost" color="neutral">Home</UButton>
    </div>
    <div v-else-if="profile" class="print-inner mx-auto max-w-md">
      <BsfPublicProfileBody :profile="profile" :profile-url="profileUrl" variant="print" />
    </div>
  </div>
</template>

<style scoped>
.screen-only {
  display: block;
}
@media print {
  .screen-only {
    display: none !important;
  }
  .print-page {
    padding: 0;
  }
}
</style>

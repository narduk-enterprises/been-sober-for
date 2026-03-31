<script setup lang="ts">
import { soberWholeDays } from '~/utils/sobrietyTime'

definePageMeta({ layout: 'minimal' })

const route = useRoute()
const slug = computed(() => {
  const raw = route.params.slug
  return typeof raw === 'string' ? raw : Array.isArray(raw) ? (raw[0] ?? '') : ''
})

useSeo({
  title: 'Profile',
  description: 'Public sober counter page on BeenSoberFor.',
  robots: 'noindex, nofollow',
  ogImage: {
    title: 'Profile',
    description: 'Sobriety counter',
    icon: 'i-lucide-leaf',
  },
})

useWebPageSchema({
  name: 'Public profile',
  description: 'Shareable sober counter page.',
})

const { data: profile, error, pending } = usePublicSoberProfile(slug)

const requestUrl = useRequestURL()
const profileUrl = computed(() => {
  const base = requestUrl.origin.replace(/\/$/, '')
  return `${base}/u/${slug.value}`
})

watch(
  profile,
  (p) => {
    if (!p) return
    const daysVal = p.sobrietyStartedAt ? soberWholeDays(p.sobrietyStartedAt) : null
    const title =
      daysVal != null
        ? `${p.displayName || 'Friend'} — ${daysVal.toLocaleString()} Days Sober`
        : p.displayName || 'Friend'
    const robots =
      p.pageVisibility === 'public' && p.allowSearchIndexing ? undefined : 'noindex, nofollow'
    useSeo({
      title,
      description: `${p.displayName || 'Friend'} — sober day counter on BeenSoberFor.`,
      robots,
      ogImage: { title, description: 'Sobriety counter', icon: 'i-lucide-leaf' },
    })
    useWebPageSchema({
      name: title,
      description: 'Public BeenSoberFor profile.',
    })
  },
  { immediate: true },
)
</script>

<template>
  <UContainer class="py-10 sm:py-14">
    <div v-if="pending" class="flex justify-center py-20">
      <UIcon name="i-lucide-loader-2" class="text-muted h-10 w-10 animate-spin" />
    </div>
    <div v-else-if="error" class="mx-auto max-w-md text-center">
      <UIcon name="i-lucide-lock" class="text-muted mx-auto h-12 w-12" />
      <h1 class="font-display mt-6 text-xl font-semibold">This page is not available</h1>
      <p class="text-muted mt-3 text-sm leading-relaxed">
        It may be private, or the link may be wrong. Ask the owner for an updated link, or create
        your own page.
      </p>
      <div class="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
        <UButton to="/register" color="primary">Start my counter</UButton>
        <UButton to="/" color="neutral" variant="ghost">Home</UButton>
      </div>
    </div>
    <div v-else-if="profile" class="mx-auto max-w-lg">
      <BsfPublicProfileBody :profile="profile" :profile-url="profileUrl" />
      <p class="text-dimmed mt-8 text-center text-xs">
        BeenSoberFor — a simple counter, not treatment or medical care.
      </p>
    </div>
  </UContainer>
</template>

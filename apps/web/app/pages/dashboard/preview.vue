<script setup lang="ts">
import type { PublicProfilePayload } from '~/types/sober-public'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth'],
})

useSeo({
  title: 'Preview public page | BeenSoberFor',
  description: 'Preview how your share page looks while it stays private or unlisted.',
  robots: 'noindex, nofollow',
  ogImage: {
    title: 'Preview',
    description: 'Profile preview',
    icon: 'i-lucide-eye',
  },
})

useWebPageSchema({
  name: 'Preview public page',
  description: 'Authenticated preview of your BeenSoberFor share page.',
})

const { data: profile, pending } = useSoberProfile()

const mapped = computed((): PublicProfilePayload | null => {
  const p = profile.value
  if (!p) return null
  return {
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    sobrietyStartedAt: p.sobrietyStartedAt,
    shortMessage: p.shortMessage,
    slug: p.publicSlug,
    showStartDate: p.showStartDate,
    showAvatar: p.showAvatar,
    showQr: p.showQr,
    shareLayout: p.shareLayout,
    allowSearchIndexing: p.allowSearchIndexing,
    pageVisibility: p.pageVisibility,
  }
})

const profileUrl = computed(() => profile.value?.publicProfileUrl ?? '')
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="font-display text-2xl font-semibold tracking-tight">Preview</h1>
      <p class="text-muted mt-2 text-sm">
        This is how your card reads with your current settings. It is not a public URL while your
        page is private.
      </p>
    </div>
    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="text-muted h-8 w-8 animate-spin" />
    </div>
    <div v-else-if="mapped && profileUrl" class="mx-auto max-w-lg">
      <BsfPublicProfileBody :profile="mapped" :profile-url="profileUrl" />
    </div>
    <UButton
      to="/dashboard/share-settings"
      color="neutral"
      variant="ghost"
      icon="i-lucide-arrow-left"
    >
      Back to share settings
    </UButton>
  </div>
</template>

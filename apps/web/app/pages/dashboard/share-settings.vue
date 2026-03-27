<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth'],
})

useSeo({
  title: 'Share settings | Been Sober For.com',
  description: 'Visibility, search indexing, QR code, and print layout for your public page.',
  robots: 'noindex, nofollow',
  ogImage: {
    title: 'Share settings',
    description: 'Privacy and sharing',
    icon: 'i-lucide-share-2',
  },
})

useWebPageSchema({
  name: 'Share settings',
  description: 'Control how your Been Sober For page is shared and indexed.',
})

const toast = useToast()
const { data: profile, pending, refresh } = useSoberProfile()

const visibilityItems = [
  { label: 'Private', value: 'private' },
  { label: 'Unlisted (share link only)', value: 'unlisted' },
  { label: 'Public', value: 'public' },
] as const

const visibility = ref<'private' | 'unlisted' | 'public'>('unlisted')
const allowSearchIndexing = ref(false)

watch(
  profile,
  (p) => {
    if (!p) return
    visibility.value = p.pageVisibility as typeof visibility.value
    allowSearchIndexing.value = p.allowSearchIndexing
  },
  { immediate: true },
)

watch(visibility, (v) => {
  if (v !== 'public') allowSearchIndexing.value = false
})

const saving = ref(false)

async function saveVisibility() {
  saving.value = true
  try {
    const nuxtApp = useNuxtApp()
    const csrfFetch = (nuxtApp.$csrfFetch ?? $fetch) as typeof $fetch
    await csrfFetch('/api/profile', {
      method: 'PATCH',
      body: {
        pageVisibility: visibility.value,
        allowSearchIndexing: allowSearchIndexing.value,
      },
    })
    await refresh()
    toast.add({ title: 'Settings saved', color: 'success' })
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    toast.add({
      title: err.data?.message || err.message || 'Could not save.',
      color: 'error',
    })
  } finally {
    saving.value = false
  }
}

async function copyLink() {
  const url = profile.value?.publicProfileUrl
  if (!url || !import.meta.client) return
  try {
    await navigator.clipboard.writeText(url)
    toast.add({ title: 'Link copied', color: 'success' })
  } catch {
    toast.add({ title: 'Copy failed — select and copy manually.', color: 'warning' })
  }
}

const qrUrl = computed(() => profile.value?.publicProfileUrl ?? '')
</script>

<template>
  <div class="space-y-8">
    <div>
      <h1 class="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Share settings</h1>
      <p class="text-muted mt-2 text-sm leading-relaxed">
        Decide who can open your page and whether search engines may show it. Your public link and
        QR never surprise you: defaults stay private or unlisted.
      </p>
    </div>

    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="text-muted h-8 w-8 animate-spin" />
    </div>

    <template v-else-if="profile">
      <UCard>
        <h2 class="font-display text-lg font-semibold">Page visibility</h2>
        <p class="text-muted mt-2 text-sm">
          <strong class="text-highlighted">Private</strong> — only you, after sign-in.<br />
          <strong class="text-highlighted">Unlisted</strong> — anyone with the link; we set
          noindex.<br />
          <strong class="text-highlighted">Public</strong> — link works; you may allow indexing
          below.
        </p>
        <div class="mt-4 space-y-4">
          <UFormField label="Visibility" name="visibility">
            <USelect v-model="visibility" :items="[...visibilityItems]" class="w-full max-w-md" />
          </UFormField>
          <UCheckbox
            v-model="allowSearchIndexing"
            :disabled="visibility !== 'public'"
            label="Allow search engines to index my public page"
            description="Off by default. Only available when visibility is public. Most people keep sobriety pages out of search."
          />
          <UButton color="primary" :loading="saving" icon="i-lucide-save" @click="saveVisibility">
            Save visibility
          </UButton>
        </div>
      </UCard>

      <UCard>
        <h2 class="font-display text-lg font-semibold">Your link</h2>
        <code
          class="border-default bg-muted/40 text-highlighted mt-3 block rounded-xl border px-3 py-2 text-sm break-all"
          >{{ profile.publicProfileUrl }}</code
        >
        <div class="mt-4 flex flex-wrap gap-2">
          <UButton color="primary" variant="outline" icon="i-lucide-copy" @click="copyLink">
            Copy link
          </UButton>
          <UButton
            :to="
              profile.pageVisibility === 'private'
                ? '/dashboard/preview'
                : `/u/${profile.publicSlug}`
            "
            :target="profile.pageVisibility === 'private' ? undefined : '_blank'"
            color="neutral"
            variant="outline"
            icon="i-lucide-external-link"
          >
            Preview page
          </UButton>
          <UButton
            v-if="profile.pageVisibility !== 'private'"
            :to="`/print/${profile.publicSlug}`"
            target="_blank"
            color="neutral"
            variant="outline"
            icon="i-lucide-printer"
          >
            Print layout
          </UButton>
        </div>
      </UCard>

      <UCard>
        <h2 class="font-display text-lg font-semibold">QR code</h2>
        <p class="text-muted mt-2 text-sm">
          Points at your public page. Download a PNG for cards or printouts.
        </p>
        <div class="mt-6 flex justify-center sm:justify-start">
          <BsfQrCode v-if="qrUrl" :url="qrUrl" />
        </div>
      </UCard>

      <UButton
        to="/dashboard/edit-profile"
        color="neutral"
        variant="ghost"
        icon="i-lucide-arrow-left"
      >
        Back to profile fields
      </UButton>
    </template>
  </div>
</template>

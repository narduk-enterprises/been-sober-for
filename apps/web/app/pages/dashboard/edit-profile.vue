<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth'],
})

useSeo({
  title: 'Edit profile',
  description:
    'Update your display name, photo, sober start date, and what appears on your public page.',
  robots: 'noindex, nofollow',
  ogImage: {
    title: 'Edit profile',
    description: 'Profile settings',
    icon: 'i-lucide-user-round-pen',
  },
})

useWebPageSchema({
  name: 'Edit profile',
  description: 'Manage your BeenSoberFor profile fields.',
})

const toast = useToast()
const { fetchUser } = useAuth()
const { uploadFile, uploading, uploadError } = useUpload()
const hydrated = useHydratedFlag()

const { data: profile, pending, refresh } = useSoberProfile()

const layoutItems = [
  { label: 'Minimal — name and counter', value: 'minimal' },
  { label: 'Standard — photo, message, QR', value: 'standard' },
  { label: 'Print-ready emphasis', value: 'print_ready' },
] as const

const form = reactive({
  displayName: '',
  publicSlug: '',
  sobrietyStartedAt: '' as string,
  shortMessage: '',
  showStartDate: true,
  showAvatar: true,
  showQr: true,
  shareLayout: 'standard' as 'minimal' | 'standard' | 'print_ready',
  avatarUrl: '' as string | null,
})

watch(
  profile,
  (p) => {
    if (!p) return
    form.displayName = p.displayName ?? ''
    form.publicSlug = p.publicSlug
    form.sobrietyStartedAt = p.sobrietyStartedAt ?? ''
    form.shortMessage = p.shortMessage ?? ''
    form.showStartDate = p.showStartDate
    form.showAvatar = p.showAvatar
    form.showQr = p.showQr
    form.shareLayout = p.shareLayout as typeof form.shareLayout
    form.avatarUrl = p.avatarUrl
  },
  { immediate: true },
)

const saving = ref(false)

async function onAvatarChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const url = await uploadFile(file)
  if (url) form.avatarUrl = url
  input.value = ''
}

async function save() {
  if (!form.displayName.trim()) {
    toast.add({ title: 'Display name is required.', color: 'warning' })
    return
  }
  saving.value = true
  try {
    const nuxtApp = useNuxtApp()
    const csrfFetch = (nuxtApp.$csrfFetch ?? $fetch) as typeof $fetch
    await csrfFetch('/api/profile', {
      method: 'PATCH',
      body: {
        displayName: form.displayName.trim(),
        publicSlug: form.publicSlug.trim().toLowerCase(),
        sobrietyStartedAt: form.sobrietyStartedAt || null,
        shortMessage: form.shortMessage.trim() || null,
        showStartDate: form.showStartDate,
        showAvatar: form.showAvatar,
        showQr: form.showQr,
        shareLayout: form.shareLayout,
        avatarUrl: form.avatarUrl,
      },
    })
    await refresh()
    await fetchUser()
    toast.add({ title: 'Profile saved', color: 'success' })
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    const msg = err.data?.message || err.message || 'Could not save. Check the form and try again.'
    toast.add({ title: msg, color: 'error' })
  } finally {
    saving.value = false
  }
}

function clearAvatar() {
  form.avatarUrl = null
}
</script>

<template>
  <div class="space-y-8">
    <div>
      <h1 class="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Edit profile</h1>
      <p class="text-muted mt-2 text-sm leading-relaxed">
        This information powers your private dashboard and your public page (based on visibility and
        toggles below).
      </p>
    </div>

    <div v-if="pending || !hydrated" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="text-muted h-8 w-8 animate-spin" />
    </div>

    <UCard v-else>
      <UForm class="space-y-6" @submit.prevent="save">
        <UFormField label="Display name" name="displayName" required>
          <UInput v-model="form.displayName" maxlength="80" autocomplete="name" />
        </UFormField>

        <UFormField
          label="Public URL"
          name="publicSlug"
          description="This becomes your link (/u/your-slug). Use lowercase letters, numbers, and hyphens (3–32 characters). Changing it updates your public link—bookmarks or printed QR codes that used the old URL will need the new one."
          required
        >
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-muted text-sm">/u/</span>
            <UInput v-model="form.publicSlug" class="max-w-xs" autocomplete="off" />
          </div>
        </UFormField>

        <UFormField label="Profile photo" name="avatar">
          <div class="flex flex-wrap items-center gap-4">
            <div
              class="border-default bg-muted/30 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border"
            >
              <img
                v-if="form.avatarUrl"
                :src="form.avatarUrl"
                alt=""
                class="h-full w-full object-cover"
                width="80"
                height="80"
              />
              <UIcon v-else name="i-lucide-user-round" class="text-muted h-10 w-10" />
            </div>
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
              <UInput
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                class="max-w-xs"
                :disabled="uploading"
                @change="onAvatarChange"
              />
              <p v-if="uploading" class="text-muted text-xs">Uploading…</p>
              <UButton
                v-if="form.avatarUrl"
                type="button"
                color="neutral"
                variant="ghost"
                @click="clearAvatar"
              >
                Remove photo
              </UButton>
            </div>
          </div>
          <p v-if="uploadError" class="text-error mt-2 text-sm">{{ uploadError }}</p>
        </UFormField>

        <UFormField
          label="Sober start date"
          name="sobrietyStartedAt"
          description="We count whole calendar days from this date."
        >
          <UInput v-model="form.sobrietyStartedAt" type="date" class="max-w-xs" />
        </UFormField>

        <UFormField
          label="Short message"
          name="shortMessage"
          description="Optional line shown on your public page (if enabled)."
        >
          <UTextarea v-model="form.shortMessage" :rows="3" maxlength="280" autoresize />
        </UFormField>

        <UFormField label="Public page layout" name="shareLayout">
          <USelect v-model="form.shareLayout" :items="[...layoutItems]" class="w-full max-w-md" />
        </UFormField>

        <div class="space-y-3">
          <p class="text-highlighted text-sm font-semibold">Show on public page</p>
          <UCheckbox v-model="form.showStartDate" label="Show start date" />
          <UCheckbox v-model="form.showAvatar" label="Show profile photo" />
          <UCheckbox v-model="form.showQr" label="Show QR code" />
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton type="submit" color="primary" :loading="saving" icon="i-lucide-save"
            >Save changes</UButton
          >
          <UButton to="/dashboard" color="neutral" variant="ghost">Back</UButton>
        </div>
      </UForm>
    </UCard>
  </div>
</template>

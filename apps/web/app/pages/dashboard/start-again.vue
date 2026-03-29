<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth'],
})

useSeo({
  title: 'Start again | BeenSoberFor',
  description: 'Reset your sober start date with a clear confirmation. Supportive, not punitive.',
  robots: 'noindex, nofollow',
  ogImage: {
    title: 'Start again',
    description: 'Reset sober date',
    icon: 'i-lucide-refresh-ccw',
  },
})

useWebPageSchema({
  name: 'Start again',
  description: 'Reset your BeenSoberFor counter from a new date.',
})

const toast = useToast()
const { fetchUser } = useAuth()
const hydrated = useHydratedFlag()
const { data: profile, pending, error, refresh } = useSoberProfile()

const draftDate = ref<string | null>(null)
const understood = ref(false)
const submitting = ref(false)
const todayYmd = computed(() => {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
})
const newDate = computed({
  get: () => draftDate.value ?? profile.value?.sobrietyStartedAt ?? '',
  set: (value: string) => {
    draftDate.value = value
  },
})
const isTodaySelected = computed(() => newDate.value === todayYmd.value)

function selectToday() {
  newDate.value = todayYmd.value
}

async function submit() {
  if (!newDate.value) {
    toast.add({ title: 'Choose a new start date.', color: 'warning' })
    return
  }
  if (!understood.value) {
    toast.add({
      title: 'Please confirm you understand your counter will restart.',
      color: 'warning',
    })
    return
  }
  if (newDate.value > todayYmd.value) {
    toast.add({ title: 'That date is in the future.', color: 'warning' })
    return
  }

  submitting.value = true
  try {
    const nuxtApp = useNuxtApp()
    const csrfFetch = (nuxtApp.$csrfFetch ?? $fetch) as typeof $fetch
    await csrfFetch('/api/profile/start-again', {
      method: 'POST',
      body: { startedAt: newDate.value, confirmed: true as const },
    })
    await refresh()
    await fetchUser()
    understood.value = false
    toast.add({ title: 'Your start date is updated.', color: 'success' })
    await navigateTo('/dashboard')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    toast.add({
      title: err.data?.message || err.message || 'Could not update.',
      color: 'error',
    })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl space-y-8">
    <div>
      <h1 class="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Start again</h1>
      <p class="text-muted mt-4 text-sm leading-relaxed">
        You can reset your date at any time. This will restart your counter and update your public
        page.
      </p>
      <p class="text-muted mt-3 text-sm leading-relaxed">
        This does not erase your effort. It updates your counter from your new start date.
      </p>
    </div>

    <div v-if="pending || !hydrated" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="text-muted h-8 w-8 animate-spin" />
    </div>

    <UAlert v-else-if="error" color="error" variant="subtle" title="Could not load profile" />

    <UCard v-else>
      <UForm class="space-y-6" @submit.prevent="submit">
        <UFormField label="New sober start date" name="startedAt" required>
          <div class="flex flex-wrap items-center gap-3">
            <UInput v-model="newDate" type="date" class="max-w-xs" />
            <UButton
              type="button"
              color="neutral"
              variant="soft"
              icon="i-lucide-calendar-days"
              :disabled="isTodaySelected"
              @click="selectToday"
            >
              Use today
            </UButton>
          </div>
        </UFormField>

        <UCheckbox
          v-model="understood"
          label="I understand this will replace my current sober date and my public counter will change."
        />

        <div class="flex flex-wrap gap-2">
          <UButton type="submit" color="primary" :loading="submitting">Confirm new date</UButton>
          <UButton to="/dashboard" type="button" color="neutral" variant="ghost">Cancel</UButton>
        </div>
      </UForm>
    </UCard>
  </div>
</template>

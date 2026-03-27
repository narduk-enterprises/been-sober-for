<script setup lang="ts">
import { approximateYmdBreakdown, soberLiveDetail, soberWholeDays } from '~/utils/sobrietyTime'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth'],
})

useSeo({
  title: 'Dashboard | BeenSoberFor',
  description: 'Your sober time counter, public link, and sharing tools.',
  robots: 'noindex, nofollow',
  ogImage: {
    title: 'Dashboard',
    description: 'Your sober time counter and share page.',
    icon: 'i-lucide-leaf',
  },
})

useWebPageSchema({
  name: 'Dashboard',
  description: 'Authenticated home for your BeenSoberFor profile.',
})

const { user, fetchUser } = useAuth()

const { data: profile, pending, error, refresh } = useSoberProfile()

const toast = useToast()
const startAgainModalOpen = ref(false)
const startAgainSubmitting = ref(false)

function localTodayYmd(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function submitStartAgainToday() {
  startAgainSubmitting.value = true
  try {
    const nuxtApp = useNuxtApp()
    const csrfFetch = (nuxtApp.$csrfFetch ?? $fetch) as typeof $fetch
    await csrfFetch('/api/profile/start-again', {
      method: 'POST',
      body: { startedAt: localTodayYmd(), confirmed: true as const },
    })
    await refresh()
    await fetchUser()
    startAgainModalOpen.value = false
    toast.add({ title: 'Your counter now starts from today.', color: 'success' })
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    toast.add({
      title: err.data?.message || err.message || 'Could not update your start date.',
      color: 'error',
    })
  } finally {
    startAgainSubmitting.value = false
  }
}

const tick = ref(Date.now())

let tickIntervalId: number | undefined

onMounted(() => {
  tickIntervalId = window.setInterval(() => {
    tick.value = Date.now()
  }, 60_000)
})

onUnmounted(() => {
  if (tickIntervalId !== undefined) window.clearInterval(tickIntervalId)
})

const days = computed(() =>
  soberWholeDays(profile.value?.sobrietyStartedAt ?? null, new Date(tick.value)),
)
const breakdown = computed(() => (days.value !== null ? approximateYmdBreakdown(days.value) : null))
const live = computed(() =>
  soberLiveDetail(profile.value?.sobrietyStartedAt ?? null, new Date(tick.value)),
)

const visibilityLabel = computed(() => {
  const v = profile.value?.pageVisibility
  if (v === 'private') return 'Private'
  if (v === 'public') return 'Public'
  return 'Unlisted (link only)'
})
</script>

<template>
  <div class="space-y-8">
    <div role="banner">
      <h1 class="font-display text-3xl font-semibold tracking-tight">Welcome back</h1>
      <p class="text-muted mt-1 text-sm">
        Signed in as {{ user?.email }}
        <span v-if="profile?.displayName"> · {{ profile.displayName }}</span>
      </p>
    </div>

    <UAlert v-if="error" color="error" variant="subtle" title="Could not load profile" />

    <template v-else-if="pending">
      <div class="flex justify-center py-16">
        <UIcon name="i-lucide-loader-2" class="text-muted h-10 w-10 animate-spin" />
      </div>
    </template>

    <template v-else-if="profile">
      <UCard
        data-testid="auth-dashboard"
        class="border-primary-200/60 dark:border-primary-900/50 overflow-hidden"
      >
        <div
          class="from-primary-50/80 to-default border-default border-b bg-linear-to-br px-6 py-8 dark:from-primary-950/30"
        >
          <p class="text-muted text-sm font-medium">Your sober time</p>
          <div v-if="days === null" class="mt-4">
            <p class="text-highlighted text-lg font-medium">Set your start date</p>
            <p class="text-muted mt-1 max-w-md text-sm leading-relaxed">
              Add the day you count from on Edit profile. Your counter will show here and on your
              public page.
            </p>
            <UButton
              to="/dashboard/edit-profile"
              class="mt-4"
              color="primary"
              icon="i-lucide-calendar-plus"
            >
              Edit profile
            </UButton>
          </div>
          <div v-else class="mt-2">
            <p
              class="font-display text-primary-600 dark:text-primary-400 text-5xl font-semibold tabular-nums sm:text-6xl"
            >
              {{ days.toLocaleString() }}
            </p>
            <p class="text-muted mt-1 text-sm">days</p>
            <p v-if="breakdown" class="text-dimmed mt-2 text-sm">
              {{ breakdown.years }} years, {{ breakdown.months }} months,
              {{ breakdown.days }} day<span v-if="breakdown.days !== 1">s</span>
            </p>
            <p v-if="live" class="text-dimmed mt-3 text-xs">
              Private detail: {{ live.hours }}h {{ live.minutes }}m since midnight on your start
              date (updates every minute).
            </p>
          </div>
        </div>
        <div class="space-y-4 p-6">
          <div>
            <p class="text-muted text-xs font-medium uppercase tracking-wide">Public link</p>
            <div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code
                class="border-default bg-muted/40 text-highlighted rounded-xl border px-3 py-2 text-sm break-all"
                >{{ profile.publicProfileUrl }}</code
              >
              <UButton
                :to="
                  profile.pageVisibility === 'private'
                    ? '/dashboard/preview'
                    : `/u/${profile.publicSlug}`
                "
                :target="profile.pageVisibility === 'private' ? undefined : '_blank'"
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-external-link"
              >
                Preview
              </UButton>
            </div>
            <p class="text-dimmed mt-2 text-xs">
              Visibility: {{ visibilityLabel
              }}<span v-if="profile.pageVisibility !== 'private' && !profile.allowSearchIndexing">
                · hidden from search by default</span
              >
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton to="/dashboard/share-settings" color="primary" icon="i-lucide-qr-code">
              QR & share
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
            <p v-else class="text-dimmed text-xs">
              Print link is available when your page is not private.
            </p>
            <UButton
              to="/dashboard/edit-profile"
              color="neutral"
              variant="ghost"
              icon="i-lucide-user-round-pen"
            >
              Edit profile
            </UButton>
          </div>
        </div>
      </UCard>

      <div class="grid gap-4 sm:grid-cols-2">
        <UCard>
          <h2 class="font-display text-lg font-semibold">Privacy</h2>
          <p class="text-muted mt-2 text-sm leading-relaxed">
            Control who can open your page and whether search engines may index it.
          </p>
          <UButton
            to="/dashboard/share-settings"
            class="mt-4"
            variant="outline"
            color="neutral"
            block
          >
            Share settings
          </UButton>
        </UCard>
        <UCard>
          <h2 class="font-display text-lg font-semibold">Start again</h2>
          <p class="text-muted mt-2 text-sm leading-relaxed">
            Reset your counter from today after you confirm, or pick a different date on the full
            page.
          </p>
          <div class="mt-4 flex flex-col gap-2">
            <UButton
              variant="outline"
              color="neutral"
              block
              icon="i-lucide-refresh-ccw"
              @click="startAgainModalOpen = true"
            >
              Start again from today
            </UButton>
            <UButton to="/dashboard/start-again" variant="ghost" color="neutral" block size="sm">
              Choose another date
            </UButton>
          </div>
        </UCard>
      </div>

      <UCard>
        <h2 class="font-display text-lg font-semibold">Account</h2>
        <p class="text-muted mt-2 text-sm">Password and account options.</p>
        <UButton
          to="/dashboard/account"
          class="mt-4"
          variant="ghost"
          color="neutral"
          icon="i-lucide-settings"
        >
          Account settings
        </UButton>
      </UCard>

      <UButton color="neutral" variant="link" size="sm" class="px-0" @click="refresh()">
        Refresh data
      </UButton>

      <AppConfirmModal
        v-model="startAgainModalOpen"
        title="Start again from today?"
        message="Your sober counter will reset using today’s date in this browser’s local timezone. Your public page will update to match."
        icon=""
        confirm-label="Yes, start from today"
        confirm-color="primary"
        cancel-label="Cancel"
        :loading="startAgainSubmitting"
        :dismissible="!startAgainSubmitting"
        @confirm="submitStartAgainToday"
      >
        <p class="text-muted text-sm">
          <NuxtLink
            to="/dashboard/start-again"
            class="text-primary font-medium underline"
            @click="startAgainModalOpen = false"
          >
            Use a different date instead
          </NuxtLink>
        </p>
      </AppConfirmModal>
    </template>
  </div>
</template>

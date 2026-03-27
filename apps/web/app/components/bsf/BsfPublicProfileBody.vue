<script setup lang="ts">
import type { PublicProfilePayload } from '~/types/sober-public'
import { approximateYmdBreakdown, soberWholeDays } from '~/utils/sobrietyTime'

const props = defineProps<{
  profile: PublicProfilePayload
  profileUrl: string
  /** print layout uses higher contrast blocks */
  variant?: 'default' | 'print'
}>()

const tick = ref(Date.now())
let tickIntervalId: number | undefined

onMounted(() => {
  tickIntervalId = window.setInterval(() => {
    tick.value = Date.now()
  }, 60_000)
  readViewportWidth()
  window.addEventListener('resize', readViewportWidth, { passive: true })
})

onUnmounted(() => {
  if (tickIntervalId !== undefined) window.clearInterval(tickIntervalId)
  if (import.meta.client) window.removeEventListener('resize', readViewportWidth)
})

const days = computed(() => soberWholeDays(props.profile.sobrietyStartedAt, new Date(tick.value)))
const breakdown = computed(() => (days.value !== null ? approximateYmdBreakdown(days.value) : null))

const showPhoto = computed(
  () =>
    props.profile.showAvatar && props.profile.avatarUrl && props.profile.shareLayout !== 'minimal',
)
const showMessage = computed(
  () => props.profile.shortMessage && props.profile.shareLayout !== 'minimal',
)
const showQrBlock = computed(() => props.profile.showQr && props.profile.shareLayout !== 'minimal')

const viewportWidth = ref(1024)

function readViewportWidth() {
  if (!import.meta.client) return
  viewportWidth.value = window.innerWidth
}

const qrPixelSize = computed(() => {
  if (props.variant === 'print') return 200
  const w = viewportWidth.value
  if (w < 400) return 140
  if (w < 640) return 168
  return 200
})

const avatarAlt = computed(() => {
  const name = props.profile.displayName?.trim()
  return name ? `Profile photo of ${name}` : 'Profile photo'
})
</script>

<template>
  <div
    :class="[
      'rounded-[1.75rem] border p-8 text-center sm:p-10',
      variant === 'print'
        ? 'border-2 border-default bg-default shadow-none'
        : 'border-default bg-default/95 shadow-sm',
    ]"
  >
    <div
      v-if="showPhoto"
      class="border-default bg-muted/40 mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border sm:h-28 sm:w-28"
    >
      <img
        :src="profile.avatarUrl!"
        :alt="avatarAlt"
        class="h-full w-full object-cover"
        width="112"
        height="112"
      />
    </div>

    <p class="font-display text-highlighted mt-6 text-2xl font-semibold">
      {{ profile.displayName || 'Friend' }}
    </p>

    <template v-if="days !== null">
      <p class="text-muted mt-6 text-sm">{{ profile.displayName || 'They' }} has been sober for</p>
      <p
        class="font-display text-primary-600 dark:text-primary-400 mt-2 text-6xl font-semibold tabular-nums leading-none sm:text-7xl"
      >
        {{ days.toLocaleString() }}
      </p>
      <p class="text-muted mt-1 text-sm font-medium">days</p>
      <p
        v-if="breakdown && profile.shareLayout !== 'minimal'"
        class="text-dimmed mt-2 text-xs sm:text-sm"
      >
        {{ breakdown.years }} years, {{ breakdown.months }} months, {{ breakdown.days }} day<span
          v-if="breakdown.days !== 1"
          >s</span
        >
      </p>
    </template>
    <p v-else class="text-muted mt-6 text-sm">Start date not shared yet.</p>

    <p v-if="profile.showStartDate && profile.sobrietyStartedAt" class="text-dimmed mt-4 text-xs">
      Counting since {{ profile.sobrietyStartedAt }}
    </p>

    <p v-if="showMessage" class="text-muted mt-6 text-sm italic">
      {{ profile.shortMessage }}
    </p>

    <div
      v-if="showQrBlock"
      class="mt-8 flex w-full max-w-sm flex-col items-center gap-3 sm:max-w-md"
    >
      <BsfQrCode :url="profileUrl" :size="qrPixelSize" />
    </div>

    <p class="text-dimmed mt-6 text-xs break-all">{{ profileUrl }}</p>
  </div>
</template>

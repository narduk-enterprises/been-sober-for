<script setup lang="ts">
import type { PublicProfilePayload } from '~/types/sober-public'
import { formatSobrietyBreakdown, soberWholeDays, soberYmdBreakdown } from '~/utils/sobrietyTime'

const props = defineProps<{
  profiles: PublicProfilePayload[]
}>()

const decoratedProfiles = computed(() =>
  props.profiles.map((profile) => {
    const label = profile.displayName?.trim() || 'Friend'
    const dayCount = soberWholeDays(profile.sobrietyStartedAt)

    return {
      ...profile,
      label,
      avatarAlt: `Profile photo of ${label}`,
      dayCount,
      breakdown: soberYmdBreakdown(profile.sobrietyStartedAt),
    }
  }),
)
</script>

<template>
  <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
    <UCard
      v-for="profile in decoratedProfiles"
      :key="profile.slug"
      class="border-default bg-default/90 overflow-hidden"
    >
      <div class="flex items-start gap-4">
        <div
          class="border-default bg-muted/30 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border"
        >
          <img
            v-if="profile.showAvatar && profile.avatarUrl"
            :src="profile.avatarUrl"
            :alt="profile.avatarAlt"
            class="h-full w-full object-cover"
            width="64"
            height="64"
          />
          <UIcon v-else name="i-lucide-user-round" class="text-muted h-8 w-8" />
        </div>

        <div class="min-w-0 flex-1">
          <p class="font-display text-highlighted truncate text-lg font-semibold">
            {{ profile.label }}
          </p>
          <p
            v-if="profile.shortMessage"
            class="text-muted mt-1 line-clamp-2 text-sm leading-relaxed"
          >
            {{ profile.shortMessage }}
          </p>
          <p v-else class="text-dimmed mt-1 text-sm">Sharing a public sobriety counter.</p>
        </div>
      </div>

      <div class="mt-5 border-t border-default pt-5">
        <template v-if="profile.dayCount !== null">
          <p class="text-muted text-xs uppercase tracking-wide">Days sober</p>
          <p
            class="font-display text-primary-600 dark:text-primary-400 mt-2 text-4xl font-semibold tabular-nums"
          >
            {{ profile.dayCount.toLocaleString() }}
          </p>
          <p v-if="profile.breakdown" class="text-dimmed mt-2 text-xs">
            {{ formatSobrietyBreakdown(profile.breakdown) }}
          </p>
        </template>
        <p v-else class="text-muted text-sm">Start date not shared yet.</p>

        <div class="mt-4 flex items-center justify-between gap-3">
          <span class="text-dimmed truncate text-xs">/u/{{ profile.slug }}</span>
          <UButton
            :to="`/u/${profile.slug}`"
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-external-link"
          >
            View page
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>

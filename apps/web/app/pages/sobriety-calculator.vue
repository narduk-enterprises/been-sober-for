<script setup lang="ts">
import {
  atLocalMidnight,
  formatSobrietyBreakdown,
  soberWholeDays,
  soberYmdBreakdown,
} from '~/utils/sobrietyTime'

definePageMeta({ layout: 'marketing' })

const title = 'Sobriety Calculator'
const description =
  'Enter your alcohol-free start date to see how many days you have been sober. Free, simple, and respectful.'

useSeo({
  title,
  description,
  keywords: [
    'sobriety calculator',
    'sober calculator',
    'days sober calculator',
    'how long have I been sober',
    'sober date calculator',
  ],
  ogImage: { title, description, icon: 'i-lucide-calculator' },
})

useWebPageSchema({
  name: title,
  description,
})

function startOfLocalToday(): Date {
  return atLocalMidnight(new Date())
}

const startDate = ref('')

const soberDays = computed(() => {
  const start = parseSobrietyStartDate(startDate.value)
  if (!start) return null
  const today = startOfLocalToday()
  if (start.getTime() > today.getTime()) return null
  return soberWholeDays(startDate.value, today)
})

const breakdown = computed(() => soberYmdBreakdown(startDate.value, startOfLocalToday()))
const breakdownLabel = computed(() =>
  breakdown.value ? formatSobrietyBreakdown(breakdown.value) : '',
)
</script>

<template>
  <UContainer class="py-10 sm:py-14">
    <div class="mx-auto max-w-2xl">
      <h1 class="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Sobriety calculator
      </h1>
      <p class="text-muted mt-4 text-sm leading-relaxed sm:text-base">
        Pick the date you count from. We show total days plus a simple years / months / days
        breakdown. Nothing is saved until you create an account.
      </p>

      <UCard class="mt-8">
        <UFormField
          label="Sober start date"
          name="sober-start"
          description="Use the calendar or type directly into the date field. We recalculate as soon as the browser applies the new date."
        >
          <UInput id="sober-start-calendar" v-model="startDate" type="date" class="max-w-xs" />
        </UFormField>
        <div
          v-if="soberDays !== null && breakdown"
          class="mt-8 rounded-2xl bg-primary-50/80 px-4 py-6 text-center dark:bg-primary-950/35"
        >
          <p class="text-primary-700 dark:text-primary-300 text-sm font-medium">
            You have been sober for
          </p>
          <p
            class="font-display text-primary-600 dark:text-primary-400 mt-2 text-5xl font-semibold tracking-tight sm:text-6xl"
          >
            {{ soberDays.toLocaleString() }}
          </p>
          <p class="text-muted mt-1 text-sm font-medium">days</p>
          <p class="text-dimmed mt-3 text-sm">
            {{ breakdownLabel }}
          </p>
          <p class="text-muted mx-auto mt-5 max-w-sm text-sm leading-relaxed">
            Want to keep this count on a shareable page? Create a free account—your date and profile
            stay private until you choose to share.
          </p>
          <div class="mt-5 flex flex-wrap justify-center gap-2">
            <UButton to="/register" color="primary" size="lg" icon="i-lucide-plus"
              >Save this on my page</UButton
            >
            <UButton
              to="/example"
              color="neutral"
              variant="outline"
              size="lg"
              icon="i-lucide-user-round"
            >
              View example profile
            </UButton>
          </div>
        </div>
        <p v-else-if="startDate" class="text-muted mt-6 text-sm">
          Choose a date on or before today.
        </p>
        <div v-if="soberDays === null || !breakdown" class="mt-8 flex flex-wrap gap-2">
          <UButton to="/register" color="primary" icon="i-lucide-plus">Start my counter</UButton>
          <UButton to="/example" color="neutral" variant="outline" icon="i-lucide-user-round">
            View example profile
          </UButton>
        </div>
      </UCard>

      <div class="text-muted mt-12 space-y-4 text-sm leading-relaxed">
        <h2 class="text-highlighted font-display text-lg font-semibold">
          How this calculator works
        </h2>
        <p>
          We compare your start date to today’s calendar date in your browser’s local timezone and
          count whole days elapsed. For legal or medical decisions, use appropriate professional
          tools—this page is a simple helper.
        </p>
      </div>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

const title = 'Sobriety Calculator | Count Your Days Sober'
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

function parseLocalDate(value: string): Date | null {
  if (!value) return null
  const d = new Date(`${value}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function startOfLocalToday(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0)
}

function wholeDaysSober(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

const startDate = ref('')

const soberDays = computed(() => {
  const start = parseLocalDate(startDate.value)
  if (!start) return null
  const today = startOfLocalToday()
  const days = wholeDaysSober(start, today)
  if (days < 0) return null
  return days
})

const breakdown = computed(() => {
  const days = soberDays.value
  if (days === null) return null
  let remaining = days
  const years = Math.floor(remaining / 365)
  remaining -= years * 365
  const months = Math.floor(remaining / 30)
  remaining -= months * 30
  const d = remaining
  return { years, months, days: d }
})
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
        <UFormField label="Sober start date" name="sober-start">
          <UInput id="sober-start" v-model="startDate" type="date" class="max-w-xs" />
        </UFormField>
        <div v-if="soberDays !== null && breakdown" class="mt-8 text-center">
          <p class="text-muted text-sm">You have been sober for</p>
          <p
            class="font-display text-primary-600 dark:text-primary-400 mt-2 text-5xl font-semibold tracking-tight sm:text-6xl"
          >
            {{ soberDays.toLocaleString() }}
          </p>
          <p class="text-muted mt-1 text-sm">days</p>
          <p class="text-dimmed mt-3 text-sm">
            {{ breakdown.years }} years, {{ breakdown.months }} months,
            {{ breakdown.days }} day<span v-if="breakdown.days !== 1">s</span>
          </p>
        </div>
        <p v-else-if="startDate" class="text-muted mt-6 text-sm">
          Choose a date on or before today.
        </p>
        <div class="mt-8 flex flex-wrap gap-2">
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

<script setup lang="ts">
import {
  approximateYmdBreakdown,
  atLocalMidnight,
  parseSobrietyStartDate,
  soberWholeDays,
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
const typedDate = ref('')

function isoFromYmd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function syncTypedFromIso(iso: string) {
  if (!iso) {
    typedDate.value = ''
    return
  }
  const parts = iso.split('-')
  if (parts.length !== 3) return
  const y = Number(parts[0])
  const m = Number(parts[1])
  const d = Number(parts[2])
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return
  typedDate.value = `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`
}

watch(startDate, (v) => syncTypedFromIso(v), { immediate: true })

function parseFlexibleDate(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (us) {
    const mm = Number(us[1])
    const dd = Number(us[2])
    const yyyy = Number(us[3])
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null
    const iso = isoFromYmd(yyyy, mm, dd)
    return parseSobrietyStartDate(iso) ? iso : null
  }
  const isoLike = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoLike) {
    return parseSobrietyStartDate(s) ? s : null
  }
  return null
}

function applyTypedDate() {
  const iso = parseFlexibleDate(typedDate.value)
  if (iso) startDate.value = iso
}

const soberDays = computed(() => {
  const start = parseSobrietyStartDate(startDate.value)
  if (!start) return null
  const today = startOfLocalToday()
  if (start.getTime() > today.getTime()) return null
  return soberWholeDays(startDate.value, today)
})

const breakdown = computed(() =>
  soberDays.value === null ? null : approximateYmdBreakdown(soberDays.value),
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
          description="Use the calendar, or type MM/DD/YYYY (or YYYY-MM-DD). We update the count as you go."
        >
          <div class="flex max-w-md flex-col gap-3 sm:flex-row sm:items-center">
            <UInput
              id="sober-start"
              v-model="startDate"
              type="date"
              class="w-full sm:max-w-[11rem]"
            />
            <UInput
              v-model="typedDate"
              type="text"
              inputmode="numeric"
              placeholder="MM/DD/YYYY"
              autocomplete="off"
              class="w-full sm:max-w-[10rem]"
              aria-label="Sober start date as text"
              @blur="applyTypedDate"
              @change="applyTypedDate"
            />
          </div>
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
            {{ breakdown.years }} years, {{ breakdown.months }} months,
            {{ breakdown.days }} day<span v-if="breakdown.days !== 1">s</span>
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

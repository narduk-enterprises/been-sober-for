<script setup lang="ts">
import type { LayoutPresetAction, PresetLayoutProps } from '../../types/layoutPresets'

const props = defineProps<PresetLayoutProps>()

const launchStats = [
  { label: 'Qualified leads', value: '2.4k', icon: 'i-lucide-users' },
  { label: 'Conversion lift', value: '+31%', icon: 'i-lucide-trending-up' },
  { label: 'Launch windows', value: '4', icon: 'i-lucide-rocket' },
]

const featureCards = [
  {
    title: 'Story-first hero',
    description:
      'Lead with a decisive value proposition, then let proof and motion carry the page.',
    icon: 'i-lucide-sparkles',
  },
  {
    title: 'Operator proof',
    description:
      'Starter sections include metrics, launch notes, and a clean CTA rail for revenue teams.',
    icon: 'i-lucide-badge-check',
  },
  {
    title: 'Campaign ready',
    description:
      'Works well for product launches, feature drops, and founder-led marketing surfaces.',
    icon: 'i-lucide-megaphone',
  },
]

const launchSteps = [
  'Frame the hero with one claim and one proof point.',
  'Drop social proof directly below the fold before deeper details.',
  'Reserve the final band for pricing, signup, or a sales CTA.',
]

const resolvedEyebrow = computed(() => props.eyebrow ?? 'Cinematic launch page')
const resolvedTitle = computed(
  () => props.title ?? 'Ship a page that feels like the first frame of a product reveal.',
)
const resolvedDescription = computed(
  () =>
    props.description ??
    'Marketing Hero is built for launches that need confidence fast: bold headline, proof rail, launch notes, and conversion-ready follow-through.',
)
const resolvedPrimaryAction = computed<LayoutPresetAction>(
  () =>
    props.primaryAction ?? {
      label: 'Primary CTA',
      icon: 'i-lucide-arrow-up-right',
    },
)
const resolvedSecondaryAction = computed<LayoutPresetAction>(
  () =>
    props.secondaryAction ?? {
      label: 'Secondary CTA',
      icon: 'i-lucide-play',
      color: 'neutral',
      variant: 'outline',
    },
)
</script>

<template>
  <section
    class="relative overflow-hidden rounded-[2rem] border border-default bg-default text-default shadow-elevated"
  >
    <div
      class="absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-info/10"
      aria-hidden="true"
    />

    <div class="relative mx-auto flex max-w-7xl flex-col gap-10 px-6 py-6 sm:px-8 lg:px-10">
      <div
        v-if="props.showAnnotations !== false"
        class="flex flex-wrap items-center gap-4 rounded-3xl border border-default/80 bg-default/85 px-5 py-4 backdrop-blur"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex size-11 items-center justify-center rounded-2xl bg-primary text-inverted"
          >
            <UIcon name="i-lucide-orbit" class="size-5" />
          </div>
          <div>
            <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Preset Layout</p>
            <p class="font-display text-lg font-semibold">Marketing Hero</p>
          </div>
        </div>

        <div class="ml-auto flex flex-wrap items-center gap-2 text-sm text-muted">
          <UBadge color="primary" variant="soft" class="rounded-full">Launch</UBadge>
          <UBadge color="neutral" variant="outline" class="rounded-full">Story</UBadge>
          <UBadge color="info" variant="outline" class="rounded-full">Proof</UBadge>
        </div>
      </div>

      <div class="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-center">
        <div class="space-y-8">
          <slot name="prelude" />

          <div class="space-y-5">
            <UBadge color="primary" variant="soft" size="lg" class="rounded-full">
              {{ resolvedEyebrow }}
            </UBadge>

            <div class="space-y-4">
              <h1 class="max-w-4xl font-display text-5xl font-semibold tracking-tight sm:text-6xl">
                {{ resolvedTitle }}
              </h1>
              <p class="max-w-2xl text-lg leading-8 text-muted">
                {{ resolvedDescription }}
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <UButton
                :to="resolvedPrimaryAction.to"
                :icon="resolvedPrimaryAction.icon"
                :color="resolvedPrimaryAction.color ?? 'primary'"
                :variant="resolvedPrimaryAction.variant ?? 'solid'"
                size="xl"
              >
                {{ resolvedPrimaryAction.label }}
              </UButton>
              <UButton
                :to="resolvedSecondaryAction.to"
                :icon="resolvedSecondaryAction.icon"
                :color="resolvedSecondaryAction.color ?? 'neutral'"
                :variant="resolvedSecondaryAction.variant ?? 'outline'"
                size="xl"
              >
                {{ resolvedSecondaryAction.label }}
              </UButton>
            </div>
          </div>

          <slot name="hero">
            <div class="grid gap-4 md:grid-cols-3">
              <UCard
                v-for="stat in launchStats"
                :key="stat.label"
                class="border-default bg-default/85 shadow-none"
              >
                <div class="space-y-3">
                  <div
                    class="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"
                  >
                    <UIcon :name="stat.icon" class="size-5" />
                  </div>
                  <div>
                    <p class="text-sm text-muted">{{ stat.label }}</p>
                    <p class="font-display text-3xl font-semibold">{{ stat.value }}</p>
                  </div>
                </div>
              </UCard>
            </div>
          </slot>
        </div>

        <UCard class="overflow-hidden border-default bg-default/90 shadow-card">
          <div class="space-y-6">
            <div
              class="rounded-[1.75rem] bg-linear-to-br from-primary/12 via-transparent to-info/12 p-6"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Launch Window</p>
                  <p class="mt-2 font-display text-3xl font-semibold">Narrative Control</p>
                </div>
                <div
                  class="flex size-14 items-center justify-center rounded-3xl bg-default text-primary shadow-card"
                >
                  <UIcon name="i-lucide-rocket" class="size-7" />
                </div>
              </div>

              <div class="mt-6 space-y-3">
                <div
                  v-for="item in featureCards"
                  :key="item.title"
                  class="rounded-2xl border border-default/80 bg-default/80 px-4 py-4"
                >
                  <div class="flex items-start gap-3">
                    <div
                      class="mt-0.5 flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary"
                    >
                      <UIcon :name="item.icon" class="size-4" />
                    </div>
                    <div class="space-y-1">
                      <p class="font-medium text-default">{{ item.title }}</p>
                      <p class="text-sm leading-6 text-muted">{{ item.description }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="rounded-[1.75rem] border border-dashed border-default bg-elevated/60 p-5">
              <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Starter Flow</p>
              <ol class="mt-4 space-y-3">
                <li
                  v-for="(step, index) in launchSteps"
                  :key="step"
                  class="flex items-start gap-3 text-sm leading-6 text-muted"
                >
                  <span
                    class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary"
                  >
                    {{ index + 1 }}
                  </span>
                  <span>{{ step }}</span>
                </li>
              </ol>
            </div>
          </div>
        </UCard>
      </div>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <slot>
          <div class="grid gap-4 md:grid-cols-3">
            <UCard
              v-for="item in featureCards"
              :key="item.title"
              class="border-default bg-default/85 shadow-none"
            >
              <div class="space-y-3">
                <div
                  class="flex size-10 items-center justify-center rounded-2xl bg-info/10 text-info"
                >
                  <UIcon :name="item.icon" class="size-5" />
                </div>
                <div class="space-y-1">
                  <h2 class="text-lg font-semibold">{{ item.title }}</h2>
                  <p class="text-sm leading-6 text-muted">{{ item.description }}</p>
                </div>
              </div>
            </UCard>
          </div>
        </slot>

        <slot name="aside">
          <UCard class="border-default bg-elevated/70 shadow-none">
            <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Best For</p>
            <div class="mt-4 flex flex-wrap gap-2">
              <UBadge color="neutral" variant="soft" class="rounded-full">Launch pages</UBadge>
              <UBadge color="neutral" variant="soft" class="rounded-full">Feature drops</UBadge>
              <UBadge color="neutral" variant="soft" class="rounded-full">Founders</UBadge>
            </div>

            <p class="mt-6 text-sm leading-6 text-muted">
              Use this preset when the page needs to feel decisive immediately. It is intentionally
              cinematic rather than neutral.
            </p>
          </UCard>
        </slot>
      </div>

      <slot v-if="props.showAnnotations !== false || $slots.footer" name="footer">
        <div
          class="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-default/80 bg-default/85 px-5 py-4 text-sm text-muted"
        >
          <span
            >Starter shell includes hero, proof rail, launch steps, and closing conversion
            band.</span
          >
          <span class="font-medium text-default"
            >Distinct personality: cinematic, polished, forward.</span
          >
        </div>
      </slot>
    </div>
  </section>
</template>

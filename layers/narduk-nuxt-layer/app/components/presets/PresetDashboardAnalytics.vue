<script setup lang="ts">
import type { LayoutPresetAction, PresetLayoutProps } from '../../types/layoutPresets'

const props = defineProps<PresetLayoutProps>()

const metricCards = [
  { label: 'Pipeline value', value: '$482k', icon: 'i-lucide-chart-column-big' },
  { label: 'Net retention', value: '118%', icon: 'i-lucide-refresh-cw' },
  { label: 'Live experiments', value: '12', icon: 'i-lucide-flask-conical' },
  { label: 'Ops incidents', value: '3', icon: 'i-lucide-siren' },
]

const tableRows = [
  { name: 'Enterprise expansion', owner: 'Ava', stage: 'Negotiation', delta: '+18%' },
  { name: 'Lifecycle campaign', owner: 'Rami', stage: 'Review', delta: '+9%' },
  { name: 'Churn intervention', owner: 'Niko', stage: 'In flight', delta: '+5%' },
]

const resolvedEyebrow = computed(() => props.eyebrow ?? 'Calm analytics cockpit')
const resolvedTitle = computed(
  () => props.title ?? 'A metrics-first workspace that still feels intentional.',
)
const resolvedDescription = computed(
  () =>
    props.description ??
    'Dashboard Analytics pairs executive stats with an opinionated operations surface: command bar, metric grid, trend placeholders, and a clean work table.',
)
const resolvedPrimaryAction = computed<LayoutPresetAction>(
  () =>
    props.primaryAction ?? {
      label: 'Create report',
      icon: 'i-lucide-plus',
    },
)
const resolvedSecondaryAction = computed<LayoutPresetAction>(
  () =>
    props.secondaryAction ?? {
      label: 'Share board',
      icon: 'i-lucide-share-2',
      color: 'neutral',
      variant: 'outline',
    },
)
</script>

<template>
  <section
    class="overflow-hidden rounded-[2rem] border border-default bg-linear-to-br from-neutral/95 via-default to-primary/8 text-default shadow-overlay"
  >
    <div class="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-5 sm:px-6">
      <div
        v-if="props.showAnnotations !== false"
        class="flex flex-wrap items-center gap-3 rounded-[1.5rem] border border-default bg-default/95 px-4 py-4"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex size-10 items-center justify-center rounded-2xl bg-success/12 text-success"
          >
            <UIcon name="i-lucide-command" class="size-5" />
          </div>
          <div>
            <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Preset Layout</p>
            <p class="font-display text-lg font-semibold text-default">Dashboard Analytics</p>
          </div>
        </div>

        <div class="ml-auto flex flex-wrap gap-2">
          <UBadge color="success" variant="subtle" class="rounded-full">Analytics</UBadge>
          <UBadge color="neutral" variant="soft" class="rounded-full">Executive</UBadge>
          <UBadge color="warning" variant="soft" class="rounded-full">Command</UBadge>
        </div>
      </div>

      <div class="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
        <aside class="space-y-4 rounded-[1.75rem] border border-default bg-elevated/85 p-4">
          <slot name="prelude" />

          <div class="rounded-2xl border border-default bg-default/95 px-4 py-4">
            <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Views</p>
            <div class="mt-3 space-y-2 text-sm text-muted">
              <div>Executive summary</div>
              <div>Funnel performance</div>
              <div>Retention risk</div>
              <div>Experiment queue</div>
            </div>
          </div>

          <div
            v-if="props.showAnnotations !== false"
            class="rounded-2xl border border-default bg-default/95 px-4 py-4 text-sm text-muted"
          >
            Distinct personality: calm, dense, and slightly command-center without breaking the
            semantic token system.
          </div>
        </aside>

        <div class="space-y-6 rounded-[1.75rem] border border-default bg-elevated/85 p-5">
          <div
            class="flex flex-wrap items-start justify-between gap-4 rounded-[1.5rem] border border-default bg-default/95 px-5 py-5"
          >
            <div class="space-y-4">
              <UBadge color="success" variant="subtle" size="lg" class="rounded-full">
                {{ resolvedEyebrow }}
              </UBadge>
              <div class="space-y-3">
                <h1
                  class="font-display text-4xl font-semibold tracking-tight text-default sm:text-5xl"
                >
                  {{ resolvedTitle }}
                </h1>
                <p class="max-w-3xl text-base leading-7 text-muted">
                  {{ resolvedDescription }}
                </p>
              </div>
            </div>

            <div class="flex flex-wrap gap-3">
              <UButton
                :to="resolvedPrimaryAction.to"
                :icon="resolvedPrimaryAction.icon"
                :color="resolvedPrimaryAction.color ?? 'primary'"
                :variant="resolvedPrimaryAction.variant ?? 'solid'"
              >
                {{ resolvedPrimaryAction.label }}
              </UButton>
              <UButton
                :to="resolvedSecondaryAction.to"
                :icon="resolvedSecondaryAction.icon"
                :color="resolvedSecondaryAction.color ?? 'neutral'"
                :variant="resolvedSecondaryAction.variant ?? 'outline'"
              >
                {{ resolvedSecondaryAction.label }}
              </UButton>
            </div>
          </div>

          <slot name="hero">
            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <UCard
                v-for="metric in metricCards"
                :key="metric.label"
                class="border-default bg-default/95 shadow-none"
              >
                <div class="space-y-3">
                  <div
                    class="flex size-10 items-center justify-center rounded-2xl bg-success/12 text-success"
                  >
                    <UIcon :name="metric.icon" class="size-5" />
                  </div>
                  <div>
                    <p class="text-sm text-muted">{{ metric.label }}</p>
                    <p class="font-display text-3xl font-semibold text-default">
                      {{ metric.value }}
                    </p>
                  </div>
                </div>
              </UCard>
            </div>
          </slot>

          <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <slot>
              <UCard class="border-default bg-default/95 shadow-none">
                <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Operational Table</p>
                <div class="mt-4 space-y-3">
                  <div
                    v-for="row in tableRows"
                    :key="row.name"
                    class="grid gap-3 rounded-2xl border border-default px-4 py-4 md:grid-cols-[minmax(0,1.2fr)_120px_120px_100px]"
                  >
                    <div>
                      <p class="font-medium text-default">{{ row.name }}</p>
                      <p class="text-sm text-muted">Owner: {{ row.owner }}</p>
                    </div>
                    <div class="text-sm text-default">{{ row.stage }}</div>
                    <div class="text-sm text-default">{{ row.owner }}</div>
                    <div class="text-sm text-success">{{ row.delta }}</div>
                  </div>
                </div>
              </UCard>
            </slot>

            <slot name="aside">
              <UCard
                class="border-default bg-linear-to-br from-success/10 via-default to-primary/6 shadow-none"
              >
                <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Focus Queue</p>
                <div class="mt-4 space-y-3 text-sm text-muted">
                  <div class="rounded-2xl border border-default px-4 py-4">
                    Resolve attribution gap in lifecycle reporting.
                  </div>
                  <div class="rounded-2xl border border-default px-4 py-4">
                    Publish leadership summary for weekly review.
                  </div>
                  <div class="rounded-2xl border border-default px-4 py-4">
                    Push experiment results to CRM owners.
                  </div>
                </div>
              </UCard>
            </slot>
          </div>
        </div>
      </div>

      <slot v-if="props.showAnnotations !== false || $slots.footer" name="footer">
        <div
          class="rounded-[1.5rem] border border-default bg-default/95 px-5 py-4 text-sm text-muted"
        >
          Starter analytics shell includes side navigation, KPI cards, and a working table surface.
        </div>
      </slot>
    </div>
  </section>
</template>

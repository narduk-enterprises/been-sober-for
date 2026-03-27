<script setup lang="ts">
import type { LayoutPresetAction, PresetLayoutProps } from '../../types/layoutPresets'

const props = defineProps<PresetLayoutProps>()

const workflowSteps = [
  {
    title: 'Collect the signal',
    description:
      'Bring product telemetry, CRM context, and support feedback into one opinionated intake.',
  },
  {
    title: 'Route the decision',
    description:
      'Assign owners, thresholds, and follow-through directly on the page instead of in a separate playbook.',
  },
  {
    title: 'Prove the outcome',
    description:
      'Close with before-and-after metrics and a concrete next action for the team buying the software.',
  },
]

const comparisonCards = [
  {
    title: 'Current workflow',
    tone: 'Muted',
    notes: 'Scattered narrative, weak proof, and unclear handoff.',
  },
  {
    title: 'Preset workflow',
    tone: 'Structured',
    notes: 'Clear promise, measured proof, and starter modules ready to swap.',
  },
]

const resolvedEyebrow = computed(() => props.eyebrow ?? 'Operator-friendly product pitch')
const resolvedTitle = computed(
  () => props.title ?? 'Explain a SaaS product like an operator, not a brochure.',
)
const resolvedDescription = computed(
  () =>
    props.description ??
    'SaaS Product balances trust, workflow clarity, and measurable outcomes. It is designed for buyers who expect the page to answer how the product works, not just what it claims.',
)
const resolvedPrimaryAction = computed<LayoutPresetAction>(
  () =>
    props.primaryAction ?? {
      label: 'Book demo',
      icon: 'i-lucide-calendar-range',
    },
)
const resolvedSecondaryAction = computed<LayoutPresetAction>(
  () =>
    props.secondaryAction ?? {
      label: 'Explore workflow',
      icon: 'i-lucide-workflow',
      color: 'neutral',
      variant: 'outline',
    },
)
</script>

<template>
  <section
    class="overflow-hidden rounded-[2rem] border border-default bg-elevated/40 text-default shadow-card"
  >
    <div class="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-6 sm:px-8 lg:px-10">
      <div v-if="props.showAnnotations !== false" class="flex flex-wrap items-center gap-4">
        <div>
          <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Preset Layout</p>
          <h1 class="mt-2 font-display text-2xl font-semibold">SaaS Product</h1>
        </div>

        <div class="ml-auto flex flex-wrap gap-2">
          <UBadge color="success" variant="soft" class="rounded-full">B2B</UBadge>
          <UBadge color="neutral" variant="outline" class="rounded-full">Workflow</UBadge>
          <UBadge color="warning" variant="outline" class="rounded-full">Proof</UBadge>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_320px]">
        <div class="rounded-[1.75rem] border border-default bg-default/90 p-8 shadow-none">
          <slot name="prelude" />

          <UBadge color="success" variant="soft" size="lg" class="rounded-full">
            {{ resolvedEyebrow }}
          </UBadge>

          <div class="mt-5 space-y-4">
            <h2 class="max-w-4xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              {{ resolvedTitle }}
            </h2>
            <p class="max-w-3xl text-lg leading-8 text-muted">
              {{ resolvedDescription }}
            </p>
          </div>

          <div class="mt-6 flex flex-wrap gap-3">
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

          <slot name="hero">
            <div class="mt-8 grid gap-4 md:grid-cols-3">
              <UCard class="border-default bg-elevated/70 shadow-none">
                <p class="text-sm text-muted">Average onboarding</p>
                <p class="mt-2 font-display text-3xl font-semibold">11 days</p>
              </UCard>
              <UCard class="border-default bg-elevated/70 shadow-none">
                <p class="text-sm text-muted">Expansion pipeline</p>
                <p class="mt-2 font-display text-3xl font-semibold">$214k</p>
              </UCard>
              <UCard class="border-default bg-elevated/70 shadow-none">
                <p class="text-sm text-muted">Stakeholder touchpoints</p>
                <p class="mt-2 font-display text-3xl font-semibold">6</p>
              </UCard>
            </div>
          </slot>
        </div>

        <UCard class="border-default bg-default/90 shadow-none">
          <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Narrative Rail</p>
          <div class="mt-4 space-y-4">
            <div
              v-for="step in workflowSteps"
              :key="step.title"
              class="rounded-2xl border border-default bg-elevated/60 px-4 py-4"
            >
              <p class="font-medium text-default">{{ step.title }}</p>
              <p class="mt-2 text-sm leading-6 text-muted">{{ step.description }}</p>
            </div>
          </div>
        </UCard>
      </div>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <slot>
          <UCard class="border-default bg-default/90 shadow-none">
            <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Starter Comparison</p>
            <div class="mt-4 grid gap-4 md:grid-cols-2">
              <div
                v-for="item in comparisonCards"
                :key="item.title"
                class="rounded-2xl border border-default px-4 py-5"
              >
                <p class="text-sm text-muted">{{ item.tone }}</p>
                <h3 class="mt-1 text-lg font-semibold">{{ item.title }}</h3>
                <p class="mt-3 text-sm leading-6 text-muted">{{ item.notes }}</p>
              </div>
            </div>
          </UCard>
        </slot>

        <slot name="aside">
          <UCard
            class="border-default bg-linear-to-br from-success/8 via-default to-transparent shadow-none"
          >
            <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Recommended Blocks</p>
            <div class="mt-4 space-y-3">
              <div class="rounded-2xl bg-default/90 px-4 py-4">
                Feature ladder with quantified outcomes
              </div>
              <div class="rounded-2xl bg-default/90 px-4 py-4">
                Buyer concerns + rebuttal section
              </div>
              <div class="rounded-2xl bg-default/90 px-4 py-4">
                Workflow walkthrough with ownership
              </div>
            </div>
          </UCard>
        </slot>
      </div>

      <slot v-if="props.showAnnotations !== false || $slots.footer" name="footer">
        <div class="rounded-3xl border border-default bg-default/85 px-5 py-4 text-sm text-muted">
          Built for teams that want the page to feel operational, not ornamental.
        </div>
      </slot>
    </div>
  </section>
</template>

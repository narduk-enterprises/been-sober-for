<script setup lang="ts">
import type { LayoutPresetAction, PresetLayoutProps } from '../../types/layoutPresets'

const props = defineProps<PresetLayoutProps>()

const plans = [
  { name: 'Starter', price: '$29', note: 'For solo operators and early launches.' },
  { name: 'Scale', price: '$149', note: 'For teams running multiple surfaces and experiments.' },
  {
    name: 'Signature',
    price: 'Custom',
    note: 'For premium service, migration, or embedded support.',
  },
]

const resolvedEyebrow = computed(() => props.eyebrow ?? 'Commercial conversion surface')
const resolvedTitle = computed(
  () => props.title ?? 'Let the pricing page carry the weight, not just the comparison table.',
)
const resolvedDescription = computed(
  () =>
    props.description ??
    'Pricing Cascade is built to move from commercial framing into tier comparison, trust, and next-step clarity without feeling like a spreadsheet dump.',
)
const resolvedPrimaryAction = computed<LayoutPresetAction>(
  () =>
    props.primaryAction ?? {
      label: 'Start free',
      icon: 'i-lucide-arrow-right',
    },
)
const resolvedSecondaryAction = computed<LayoutPresetAction>(
  () =>
    props.secondaryAction ?? {
      label: 'Talk to sales',
      icon: 'i-lucide-phone-call',
      color: 'neutral',
      variant: 'outline',
    },
)
</script>

<template>
  <section
    class="overflow-hidden rounded-[2rem] border border-default bg-linear-to-br from-primary/8 via-default to-warning/8 text-default shadow-card"
  >
    <div class="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-6 sm:px-8">
      <div class="space-y-5 rounded-[1.75rem] border border-default bg-default/92 p-8 text-center">
        <slot name="prelude" />

        <div class="flex justify-center">
          <UBadge color="primary" variant="soft" size="lg" class="rounded-full">
            {{ resolvedEyebrow }}
          </UBadge>
        </div>

        <div class="space-y-4">
          <h1
            class="mx-auto max-w-4xl font-display text-4xl font-semibold tracking-tight sm:text-5xl"
          >
            {{ resolvedTitle }}
          </h1>
          <p class="mx-auto max-w-3xl text-lg leading-8 text-muted">
            {{ resolvedDescription }}
          </p>
        </div>

        <div class="flex flex-wrap justify-center gap-3">
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
        <div class="grid gap-4 xl:grid-cols-3">
          <UCard
            v-for="plan in plans"
            :key="plan.name"
            class="border-default bg-default/92 shadow-none"
          >
            <div class="space-y-4">
              <p class="text-xs uppercase tracking-[0.24em] text-dimmed">{{ plan.name }}</p>
              <p class="font-display text-4xl font-semibold">{{ plan.price }}</p>
              <p class="text-sm leading-6 text-muted">{{ plan.note }}</p>
            </div>
          </UCard>
        </div>
      </slot>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <slot>
          <UCard class="border-default bg-default/92 shadow-none">
            <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Starter Commercial Flow</p>
            <div class="mt-4 space-y-3 text-sm leading-6 text-muted">
              <div class="rounded-2xl border border-default px-4 py-4">
                Anchor the page with economic framing before features.
              </div>
              <div class="rounded-2xl border border-default px-4 py-4">
                Give each plan a narrative, not just a price.
              </div>
              <div class="rounded-2xl border border-default px-4 py-4">
                Close with proof, FAQ, and a confident next step.
              </div>
            </div>
          </UCard>
        </slot>

        <slot name="aside">
          <UCard class="border-default bg-elevated/60 shadow-none">
            <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Conversion Notes</p>
            <p class="mt-3 text-sm leading-7 text-muted">
              This preset is intentionally commercial and persuasive. Use it when pricing is the
              main decision surface.
            </p>
          </UCard>
        </slot>
      </div>

      <slot v-if="props.showAnnotations !== false || $slots.footer" name="footer">
        <div
          class="rounded-[1.5rem] border border-default bg-default/85 px-5 py-4 text-sm text-muted"
        >
          Pricing shell with hero, tiers, proof prompts, and a commercial finishing lane.
        </div>
      </slot>
    </div>
  </section>
</template>

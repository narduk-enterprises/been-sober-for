<script setup lang="ts">
import type { LayoutPresetAction, PresetLayoutProps } from '../../types/layoutPresets'

const props = defineProps<PresetLayoutProps>()

const pipelineStages = [
  { name: 'Discovery', count: 18, color: 'bg-info/12 text-info' },
  { name: 'Proposal', count: 11, color: 'bg-warning/12 text-warning' },
  { name: 'Legal', count: 6, color: 'bg-primary/12 text-primary' },
  { name: 'Closed won', count: 9, color: 'bg-success/12 text-success' },
]

const activityFeed = [
  'Follow up with Hightower on security review.',
  'Send renewal brief to Nera Health before Friday.',
  'Escalate implementation blocker for Atlas Logistics.',
]

const resolvedEyebrow = computed(() => props.eyebrow ?? 'Sales control room')
const resolvedTitle = computed(
  () => props.title ?? 'Turn account management into a page your team can actually run from.',
)
const resolvedDescription = computed(
  () =>
    props.description ??
    'Dashboard CRM prioritizes relationships over charts: account spotlight, pipeline stages, recent activity, and a compact command zone for sales and success teams.',
)
const resolvedPrimaryAction = computed<LayoutPresetAction>(
  () =>
    props.primaryAction ?? {
      label: 'Create opportunity',
      icon: 'i-lucide-plus',
    },
)
const resolvedSecondaryAction = computed<LayoutPresetAction>(
  () =>
    props.secondaryAction ?? {
      label: 'Review accounts',
      icon: 'i-lucide-briefcase-business',
      color: 'neutral',
      variant: 'outline',
    },
)
</script>

<template>
  <section
    class="overflow-hidden rounded-[2rem] border border-default bg-linear-to-br from-warning/8 via-default to-primary/8 text-default shadow-card"
  >
    <div class="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6 sm:px-8">
      <div
        v-if="props.showAnnotations !== false"
        class="flex flex-wrap items-center gap-3 rounded-[1.5rem] border border-default bg-default/90 px-4 py-4"
      >
        <div>
          <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Preset Layout</p>
          <p class="mt-2 font-display text-2xl font-semibold">Dashboard CRM</p>
        </div>

        <div class="ml-auto flex flex-wrap gap-2">
          <UBadge color="warning" variant="soft" class="rounded-full">Pipeline</UBadge>
          <UBadge color="neutral" variant="outline" class="rounded-full">Accounts</UBadge>
          <UBadge color="primary" variant="outline" class="rounded-full">Activity</UBadge>
        </div>
      </div>

      <div class="space-y-6 rounded-[1.75rem] border border-default bg-default/92 p-6">
        <slot name="prelude" />

        <div class="space-y-4">
          <UBadge color="warning" variant="soft" size="lg" class="rounded-full">
            {{ resolvedEyebrow }}
          </UBadge>

          <div class="space-y-3">
            <h1 class="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              {{ resolvedTitle }}
            </h1>
            <p class="max-w-3xl text-lg leading-8 text-muted">
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

        <slot name="hero">
          <div class="grid gap-4 md:grid-cols-4">
            <div
              v-for="stage in pipelineStages"
              :key="stage.name"
              class="rounded-[1.5rem] border border-default bg-elevated/70 px-4 py-4"
            >
              <div :class="['inline-flex rounded-full px-3 py-1 text-xs font-medium', stage.color]">
                {{ stage.name }}
              </div>
              <p class="mt-4 font-display text-4xl font-semibold">{{ stage.count }}</p>
              <p class="mt-1 text-sm text-muted">active records</p>
            </div>
          </div>
        </slot>

        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <slot>
            <UCard class="border-default bg-elevated/50 shadow-none">
              <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Account Spotlight</p>
              <div class="mt-4 rounded-[1.5rem] border border-default bg-default px-5 py-5">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 class="text-2xl font-semibold">Nera Health</h2>
                    <p class="mt-2 text-sm text-muted">
                      Expansion review due this week. Product adoption is healthy; procurement needs
                      a tighter rollout memo.
                    </p>
                  </div>
                  <UBadge color="success" variant="soft" class="rounded-full">Healthy</UBadge>
                </div>
              </div>
            </UCard>
          </slot>

          <slot name="aside">
            <UCard class="border-default bg-elevated/50 shadow-none">
              <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Activity Feed</p>
              <ul class="mt-4 space-y-3 text-sm leading-6 text-muted">
                <li
                  v-for="item in activityFeed"
                  :key="item"
                  class="rounded-2xl border border-default bg-default px-4 py-4"
                >
                  {{ item }}
                </li>
              </ul>
            </UCard>
          </slot>
        </div>
      </div>

      <slot v-if="props.showAnnotations !== false || $slots.footer" name="footer">
        <UCard class="border-default bg-default/92 shadow-none">
          <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Notes</p>
          <p class="mt-4 text-sm leading-7 text-muted">
            This preset is warmer and more relational than the analytics cockpit. It is optimized
            for active ownership and account movement.
          </p>
        </UCard>
      </slot>
    </div>
  </section>
</template>

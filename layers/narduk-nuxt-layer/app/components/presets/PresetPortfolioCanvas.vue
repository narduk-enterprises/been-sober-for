<script setup lang="ts">
import type { LayoutPresetAction, PresetLayoutProps } from '../../types/layoutPresets'

const props = defineProps<PresetLayoutProps>()

const workTiles = [
  { title: 'Signal Archive', tone: 'Research system', span: 'lg:col-span-2' },
  { title: 'North Coast', tone: 'Campaign identity', span: '' },
  { title: 'Studio Ledger', tone: 'Operations product', span: '' },
  { title: 'Field Notes', tone: 'Editorial platform', span: 'lg:col-span-2' },
]

const resolvedEyebrow = computed(() => props.eyebrow ?? 'Creative showcase')
const resolvedTitle = computed(
  () => props.title ?? 'A portfolio shell with enough voice to feel authored.',
)
const resolvedDescription = computed(
  () =>
    props.description ??
    'Portfolio Canvas uses asymmetry, softer copy, and gallery rhythm to make creative work feel intentional instead of boxed into a generic case-study template.',
)
const resolvedPrimaryAction = computed<LayoutPresetAction>(
  () =>
    props.primaryAction ?? {
      label: 'View selected work',
      icon: 'i-lucide-images',
    },
)
const resolvedSecondaryAction = computed<LayoutPresetAction>(
  () =>
    props.secondaryAction ?? {
      label: 'Start a conversation',
      icon: 'i-lucide-send',
      color: 'neutral',
      variant: 'outline',
    },
)
</script>

<template>
  <section
    class="overflow-hidden rounded-[2rem] border border-default bg-linear-to-br from-secondary/10 via-default to-primary/10 text-default shadow-card"
  >
    <div class="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-6 sm:px-8">
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_300px]">
        <div class="space-y-6 rounded-[1.75rem] border border-default bg-default/92 p-8">
          <slot name="prelude" />

          <UBadge color="secondary" variant="soft" size="lg" class="rounded-full">
            {{ resolvedEyebrow }}
          </UBadge>

          <div class="space-y-4">
            <h1 class="max-w-4xl font-display text-5xl font-semibold tracking-tight sm:text-6xl">
              {{ resolvedTitle }}
            </h1>
            <p class="max-w-3xl text-lg leading-8 text-muted">
              {{ resolvedDescription }}
            </p>
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
            <div class="grid gap-4 md:grid-cols-2">
              <div
                v-for="tile in workTiles"
                :key="tile.title"
                :class="[
                  'rounded-[1.75rem] border border-default bg-linear-to-br from-default to-elevated px-5 py-6',
                  tile.span,
                ]"
              >
                <p class="text-xs uppercase tracking-[0.24em] text-dimmed">{{ tile.tone }}</p>
                <p class="mt-12 font-display text-3xl font-semibold">{{ tile.title }}</p>
              </div>
            </div>
          </slot>
        </div>

        <slot name="aside">
          <aside class="space-y-4 rounded-[1.75rem] border border-default bg-default/92 p-5">
            <UCard class="border-default bg-elevated/60 shadow-none">
              <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Voice</p>
              <p class="mt-3 text-sm leading-7 text-muted">
                Keep the copy sparse and confident. Let the work blocks carry the emotional weight.
              </p>
            </UCard>
            <UCard class="border-default bg-elevated/60 shadow-none">
              <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Use Cases</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <UBadge color="neutral" variant="soft" class="rounded-full">Studio</UBadge>
                <UBadge color="neutral" variant="soft" class="rounded-full">Agency</UBadge>
                <UBadge color="neutral" variant="soft" class="rounded-full">Creator</UBadge>
              </div>
            </UCard>
          </aside>
        </slot>
      </div>

      <slot>
        <div class="rounded-[1.75rem] border border-default bg-default/92 px-6 py-6">
          <p class="text-sm leading-7 text-muted">
            Starter body section for selected case studies, process notes, or speaking highlights.
            Replace this with project stories, embedded media, or an inquiry block.
          </p>
        </div>
      </slot>

      <slot v-if="props.showAnnotations !== false || $slots.footer" name="footer">
        <div
          class="rounded-[1.5rem] border border-default bg-default/85 px-5 py-4 text-sm text-muted"
        >
          Portfolio shell with gallery rhythm, authored voice, and asymmetrical work blocks.
        </div>
      </slot>
    </div>
  </section>
</template>

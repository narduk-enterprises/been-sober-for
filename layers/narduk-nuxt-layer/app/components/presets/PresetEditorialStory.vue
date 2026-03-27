<script setup lang="ts">
import type { LayoutPresetAction, PresetLayoutProps } from '../../types/layoutPresets'

const props = defineProps<PresetLayoutProps>()

const chapters = [
  {
    title: 'Opening scene',
    description: 'Set tension, context, and stakes without forcing a conversion CTA too early.',
  },
  {
    title: 'Middle proof',
    description:
      'Introduce evidence, process, or field notes with room for pull quotes and visual pauses.',
  },
  {
    title: 'Closing frame',
    description: 'Finish with interpretation and a softer next step, not just a button wall.',
  },
]

const resolvedEyebrow = computed(() => props.eyebrow ?? 'Long-form editorial')
const resolvedTitle = computed(() => props.title ?? 'Tell the story like it deserves real pacing.')
const resolvedDescription = computed(
  () =>
    props.description ??
    'Editorial Story is a deliberate reading surface with chapter rhythm, warm accents, and a clear split between narrative content and support notes.',
)
const resolvedPrimaryAction = computed<LayoutPresetAction>(
  () =>
    props.primaryAction ?? {
      label: 'Read feature',
      icon: 'i-lucide-scroll-text',
    },
)
const resolvedSecondaryAction = computed<LayoutPresetAction>(
  () =>
    props.secondaryAction ?? {
      label: 'Download notes',
      icon: 'i-lucide-download',
      color: 'neutral',
      variant: 'outline',
    },
)
</script>

<template>
  <section
    class="overflow-hidden rounded-[2rem] border border-default bg-linear-to-br from-warning/8 via-default to-transparent text-default shadow-card"
  >
    <div class="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <div class="grid gap-8 lg:grid-cols-[180px_minmax(0,1fr)]">
        <aside class="space-y-4">
          <slot name="prelude" />

          <div class="rounded-[1.5rem] border border-default bg-default/90 px-4 py-5">
            <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Edition</p>
            <p class="mt-3 font-display text-2xl font-semibold">Vol. 01</p>
            <p class="mt-2 text-sm text-muted">
              For narratives, case studies, and authored essays.
            </p>
          </div>
        </aside>

        <div class="space-y-8">
          <div class="space-y-5">
            <UBadge color="warning" variant="soft" size="lg" class="rounded-full">
              {{ resolvedEyebrow }}
            </UBadge>
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
            <div class="rounded-[1.75rem] border border-default bg-default/90 p-8">
              <p class="text-2xl leading-10 text-default sm:text-3xl sm:leading-12">
                “Use this preset when the work needs breathing room. The story should feel curated,
                not packed into a dashboard frame.”
              </p>
            </div>
          </slot>

          <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
            <slot>
              <div class="space-y-5 rounded-[1.75rem] border border-default bg-default/90 p-6">
                <section
                  v-for="chapter in chapters"
                  :key="chapter.title"
                  class="border-b border-default pb-5 last:border-b-0 last:pb-0"
                >
                  <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Chapter</p>
                  <h2 class="mt-2 font-display text-3xl font-semibold">{{ chapter.title }}</h2>
                  <p class="mt-4 text-base leading-8 text-muted">{{ chapter.description }}</p>
                </section>
              </div>
            </slot>

            <slot name="aside">
              <div class="space-y-4">
                <UCard class="border-default bg-default/90 shadow-none">
                  <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Side Notes</p>
                  <p class="mt-3 text-sm leading-7 text-muted">
                    Add author details, supporting data, or pull quotes here without disturbing the
                    main reading lane.
                  </p>
                </UCard>
                <UCard class="border-default bg-default/90 shadow-none">
                  <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Rhythm</p>
                  <p class="mt-3 text-sm leading-7 text-muted">
                    Alternate prose sections with imagery, quotes, or evidence blocks to keep
                    momentum.
                  </p>
                </UCard>
              </div>
            </slot>
          </div>
        </div>
      </div>

      <slot v-if="props.showAnnotations !== false || $slots.footer" name="footer">
        <div
          class="mt-8 rounded-[1.75rem] border border-default bg-default/90 px-5 py-4 text-sm text-muted"
        >
          Editorial shell tuned for slower reading, richer pacing, and softer transitions between
          sections.
        </div>
      </slot>
    </div>
  </section>
</template>

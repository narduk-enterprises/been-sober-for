<script setup lang="ts">
import type { LayoutPresetAction, PresetLayoutProps } from '../../types/layoutPresets'

const props = defineProps<PresetLayoutProps>()

const navigationSections = [
  {
    title: 'Getting Started',
    items: ['Overview', 'Install', 'First request'],
  },
  {
    title: 'Guides',
    items: ['Authentication', 'Mutations', 'Caching'],
  },
  {
    title: 'Reference',
    items: ['Components', 'Composables', 'Routes'],
  },
]

const articleSections = [
  {
    title: 'Why this shape exists',
    description:
      'The shell gives docs pages a strong reading lane while still leaving room for local navigation and context panels.',
  },
  {
    title: 'What starter content includes',
    description:
      'Sections, notes, checklists, and summary blocks are ready out of the box so teams can replace content instead of composing scaffolding.',
  },
  {
    title: 'Where it works best',
    description:
      'Use this for onboarding, API references, handbooks, or multi-level docs where scanning matters as much as reading.',
  },
]

const resolvedEyebrow = computed(() => props.eyebrow ?? 'Focused knowledge base')
const resolvedTitle = computed(
  () => props.title ?? 'Ship documentation with real structure on day one.',
)
const resolvedDescription = computed(
  () =>
    props.description ??
    'Docs Knowledge is tuned for calm scanning: strong left navigation, a readable article lane, and a right rail for context, status, and adoption prompts.',
)
const resolvedPrimaryAction = computed<LayoutPresetAction>(
  () =>
    props.primaryAction ?? {
      label: 'Read guide',
      icon: 'i-lucide-book-open',
    },
)
const resolvedSecondaryAction = computed<LayoutPresetAction>(
  () =>
    props.secondaryAction ?? {
      label: 'Open API reference',
      icon: 'i-lucide-braces',
      color: 'neutral',
      variant: 'outline',
    },
)
</script>

<template>
  <section
    class="overflow-hidden rounded-[2rem] border border-default bg-default text-default shadow-card"
  >
    <div
      v-if="props.showAnnotations !== false"
      class="border-b border-default bg-elevated/70 px-6 py-5 sm:px-8"
    >
      <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-4">
        <div>
          <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Preset Layout</p>
          <p class="mt-2 font-display text-2xl font-semibold">Docs Knowledge</p>
        </div>

        <div class="ml-auto flex flex-wrap gap-2">
          <UBadge color="info" variant="soft" class="rounded-full">Docs</UBadge>
          <UBadge color="neutral" variant="outline" class="rounded-full">Reference</UBadge>
          <UBadge color="success" variant="outline" class="rounded-full">Navigation</UBadge>
        </div>
      </div>
    </div>

    <div
      class="mx-auto grid max-w-7xl gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[260px_minmax(0,1fr)_260px]"
    >
      <aside class="space-y-4 rounded-[1.75rem] border border-default bg-elevated/50 p-4">
        <slot name="prelude" />

        <div>
          <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Library</p>
          <p class="mt-2 text-sm leading-6 text-muted">
            A left rail for sections, entry points, and shared starter links.
          </p>
        </div>

        <div class="space-y-3">
          <div
            v-for="section in navigationSections"
            :key="section.title"
            class="rounded-2xl border border-default bg-default/90 px-4 py-4"
          >
            <p class="text-sm font-semibold text-default">{{ section.title }}</p>
            <ul class="mt-3 space-y-2 text-sm text-muted">
              <li v-for="item in section.items" :key="item">{{ item }}</li>
            </ul>
          </div>
        </div>
      </aside>

      <div class="space-y-6 rounded-[1.75rem] border border-default bg-default/90 p-6">
        <UBadge color="info" variant="soft" size="lg" class="rounded-full">
          {{ resolvedEyebrow }}
        </UBadge>

        <div class="space-y-4">
          <h1 class="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
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
          <div class="rounded-[1.5rem] border border-default bg-elevated/60 px-5 py-5">
            <p class="text-sm leading-7 text-muted">
              Starter hero copy lives here. Replace it with product-specific onboarding text,
              migration notes, or versioned guidance without needing a custom docs scaffold first.
            </p>
          </div>
        </slot>

        <slot>
          <div class="space-y-4">
            <section
              v-for="section in articleSections"
              :key="section.title"
              class="rounded-[1.5rem] border border-default bg-default px-5 py-5"
            >
              <h2 class="text-xl font-semibold">{{ section.title }}</h2>
              <p class="mt-3 text-sm leading-7 text-muted">{{ section.description }}</p>
            </section>
          </div>
        </slot>
      </div>

      <aside class="space-y-4 rounded-[1.75rem] border border-default bg-elevated/50 p-4">
        <slot name="aside">
          <div class="rounded-2xl border border-default bg-default/90 px-4 py-4">
            <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Status</p>
            <p class="mt-2 text-sm leading-6 text-muted">
              Versioned starter content, navigation, and callout cards.
            </p>
          </div>

          <div class="rounded-2xl border border-default bg-default/90 px-4 py-4">
            <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Checklist</p>
            <ul class="mt-3 space-y-2 text-sm text-muted">
              <li>Document the happy path first.</li>
              <li>Give migrations their own callout.</li>
              <li>Keep the right rail small and useful.</li>
            </ul>
          </div>
        </slot>
      </aside>
    </div>

    <slot v-if="props.showAnnotations !== false || $slots.footer" name="footer">
      <div class="border-t border-default bg-elevated/60 px-6 py-4 text-sm text-muted sm:px-8">
        Documentation shell with navigation, article lane, and context rail included.
      </div>
    </slot>
  </section>
</template>

<script setup lang="ts">
import type { LayoutPresetAction, PresetLayoutProps } from '../../types/layoutPresets'

const props = defineProps<PresetLayoutProps>()

const settingSections = [
  { title: 'Profile & identity', description: 'Avatar, display name, and login preferences.' },
  { title: 'Team permissions', description: 'Role defaults, invite policy, and approvals.' },
  { title: 'Billing controls', description: 'Plan owner, invoice delivery, and usage alerts.' },
]

const resolvedEyebrow = computed(() => props.eyebrow ?? 'Configuration console')
const resolvedTitle = computed(
  () => props.title ?? 'A settings surface that makes change management feel deliberate.',
)
const resolvedDescription = computed(
  () =>
    props.description ??
    'Settings Console is dense on purpose: clear section navigation, change panels, and a review rail for activity or guidance.',
)
const resolvedPrimaryAction = computed<LayoutPresetAction>(
  () =>
    props.primaryAction ?? {
      label: 'Save changes',
      icon: 'i-lucide-save',
    },
)
const resolvedSecondaryAction = computed<LayoutPresetAction>(
  () =>
    props.secondaryAction ?? {
      label: 'Discard draft',
      icon: 'i-lucide-rotate-ccw',
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
      class="mx-auto grid max-w-7xl gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[240px_minmax(0,1fr)_280px]"
    >
      <aside class="space-y-4 rounded-[1.75rem] border border-default bg-elevated/50 p-4">
        <slot name="prelude" />

        <div v-if="props.showAnnotations !== false">
          <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Preset Layout</p>
          <p class="mt-2 font-display text-2xl font-semibold">Settings Console</p>
        </div>

        <div class="space-y-3">
          <div
            v-for="section in settingSections"
            :key="section.title"
            class="rounded-2xl border border-default bg-default/90 px-4 py-4"
          >
            <p class="font-medium text-default">{{ section.title }}</p>
            <p class="mt-2 text-sm leading-6 text-muted">{{ section.description }}</p>
          </div>
        </div>
      </aside>

      <div class="space-y-6 rounded-[1.75rem] border border-default bg-default/92 p-6">
        <UBadge color="primary" variant="soft" size="lg" class="rounded-full">
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
            <UCard class="border-default bg-elevated/60 shadow-none">
              <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Draft Status</p>
              <p class="mt-2 font-display text-3xl font-semibold">4 pending edits</p>
            </UCard>
            <UCard class="border-default bg-elevated/60 shadow-none">
              <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Last reviewed</p>
              <p class="mt-2 font-display text-3xl font-semibold">2 hours ago</p>
            </UCard>
          </div>
        </slot>

        <slot>
          <div class="space-y-4">
            <UCard class="border-default bg-default shadow-none">
              <div class="form-section">
                <UInput class="w-full" placeholder="Workspace name" />
                <UTextarea
                  class="w-full"
                  placeholder="Short description for the workspace"
                  :rows="4"
                />
              </div>
            </UCard>
            <UCard class="border-default bg-default shadow-none">
              <div class="form-row">
                <UInput class="w-full" placeholder="Timezone" />
                <UInput class="w-full" placeholder="Default locale" />
              </div>
            </UCard>
          </div>
        </slot>
      </div>

      <slot name="aside">
        <aside class="space-y-4 rounded-[1.75rem] border border-default bg-elevated/50 p-4">
          <UCard class="border-default bg-default/90 shadow-none">
            <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Review Rail</p>
            <p class="mt-3 text-sm leading-7 text-muted">
              Use this area for audit logs, guidance, or a checklist that keeps high-risk changes
              visible.
            </p>
          </UCard>
          <UCard class="border-default bg-default/90 shadow-none">
            <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Suggested Pattern</p>
            <p class="mt-3 text-sm leading-7 text-muted">
              Pair dense setting groups with a right rail instead of stacking everything into a
              single long form.
            </p>
          </UCard>
        </aside>
      </slot>
    </div>

    <slot v-if="props.showAnnotations !== false || $slots.footer" name="footer">
      <div class="border-t border-default bg-elevated/60 px-6 py-4 text-sm text-muted sm:px-8">
        Settings shell with navigation, editable center panel, and review rail.
      </div>
    </slot>
  </section>
</template>

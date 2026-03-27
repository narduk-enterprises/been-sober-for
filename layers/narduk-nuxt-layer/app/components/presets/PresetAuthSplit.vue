<script setup lang="ts">
import type { LayoutPresetAction, PresetLayoutProps } from '../../types/layoutPresets'

const props = defineProps<PresetLayoutProps>()

const trustPoints = [
  'Social login, email login, or magic link blocks can slot into the right panel.',
  'Brand story and trust cues stay separate so the form is never overcrowded.',
  'The supporting panel can carry product proof, invites, or recovery guidance.',
]

const resolvedEyebrow = computed(() => props.eyebrow ?? 'Branded access gateway')
const resolvedTitle = computed(
  () => props.title ?? 'Make sign-in feel like an intentional part of the product, not a dead end.',
)
const resolvedDescription = computed(
  () =>
    props.description ??
    'Auth Split gives you a strong brand panel and a focused form panel, so the access flow feels trustworthy without collapsing into marketing noise.',
)
const resolvedPrimaryAction = computed<LayoutPresetAction>(
  () =>
    props.primaryAction ?? {
      label: 'Continue',
      icon: 'i-lucide-arrow-right',
    },
)
const resolvedSecondaryAction = computed<LayoutPresetAction>(
  () =>
    props.secondaryAction ?? {
      label: 'Need help?',
      icon: 'i-lucide-life-buoy',
      color: 'neutral',
      variant: 'outline',
    },
)
</script>

<template>
  <section
    class="overflow-hidden rounded-[2rem] border border-default bg-linear-to-br from-primary/8 via-default to-secondary/10 text-default shadow-card"
  >
    <div
      class="mx-auto grid max-w-6xl gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]"
    >
      <div class="space-y-6 rounded-[1.75rem] border border-default bg-default/90 p-8">
        <slot name="prelude" />

        <UBadge color="primary" variant="soft" size="lg" class="rounded-full">
          {{ resolvedEyebrow }}
        </UBadge>

        <div class="space-y-4">
          <h1 class="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {{ resolvedTitle }}
          </h1>
          <p class="text-lg leading-8 text-muted">
            {{ resolvedDescription }}
          </p>
        </div>

        <slot name="hero">
          <div class="grid gap-3">
            <div
              v-for="item in trustPoints"
              :key="item"
              class="rounded-2xl border border-default bg-elevated/60 px-4 py-4 text-sm leading-6 text-muted"
            >
              {{ item }}
            </div>
          </div>
        </slot>
      </div>

      <div class="rounded-[1.75rem] border border-default bg-default/95 p-6 shadow-none">
        <slot>
          <div class="space-y-5">
            <div>
              <p class="text-xs uppercase tracking-[0.24em] text-dimmed">Starter Form</p>
              <h2 class="mt-2 text-2xl font-semibold">Welcome back</h2>
              <p class="mt-2 text-sm leading-6 text-muted">
                Replace this starter surface with the shared auth card or your own form controls.
              </p>
            </div>

            <div class="form-section">
              <UInput class="w-full" placeholder="you@example.com" icon="i-lucide-mail" />
              <UInput class="w-full" type="password" placeholder="Password" icon="i-lucide-lock" />
            </div>

            <div class="flex flex-wrap gap-3">
              <UButton
                :to="resolvedPrimaryAction.to"
                :icon="resolvedPrimaryAction.icon"
                :color="resolvedPrimaryAction.color ?? 'primary'"
                :variant="resolvedPrimaryAction.variant ?? 'solid'"
                class="flex-1 justify-center"
              >
                {{ resolvedPrimaryAction.label }}
              </UButton>
              <UButton
                :to="resolvedSecondaryAction.to"
                :icon="resolvedSecondaryAction.icon"
                :color="resolvedSecondaryAction.color ?? 'neutral'"
                :variant="resolvedSecondaryAction.variant ?? 'outline'"
                class="flex-1 justify-center"
              >
                {{ resolvedSecondaryAction.label }}
              </UButton>
            </div>
          </div>
        </slot>

        <slot name="aside">
          <div
            class="mt-5 rounded-[1.5rem] border border-default bg-elevated/60 px-4 py-4 text-sm leading-6 text-muted"
          >
            The right panel is intentionally narrow and focused. Keep the identity task obvious.
          </div>
        </slot>
      </div>
    </div>

    <slot v-if="props.showAnnotations !== false || $slots.footer" name="footer">
      <div class="border-t border-default bg-default/85 px-6 py-4 text-sm text-muted sm:px-8">
        Two-panel auth layout with dedicated brand context and form space.
      </div>
    </slot>
  </section>
</template>

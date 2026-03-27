<script setup lang="ts">
import type { LayoutPresetNavItem } from '../../types/layoutPresets'

defineProps<{
  brand: string
  category: string
  items: LayoutPresetNavItem[]
}>()
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
    <div
      class="flex flex-wrap items-center gap-4 rounded-[1.5rem] border border-default bg-default/92 px-5 py-4 shadow-card"
    >
      <div class="flex items-center gap-3">
        <div
          class="flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-sm font-semibold text-primary"
        >
          {{ brand.slice(0, 2).toUpperCase() }}
        </div>
        <div>
          <p class="text-xs uppercase tracking-[0.24em] text-dimmed">{{ category }}</p>
          <p class="font-display text-lg font-semibold text-default">{{ brand }}</p>
        </div>
      </div>

      <div class="ml-auto flex flex-wrap items-center gap-5">
        <NuxtLink
          v-for="item in items"
          :key="item.label"
          :to="item.to"
          class="text-sm font-medium text-muted transition-colors hover:text-default"
        >
          {{ item.label }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

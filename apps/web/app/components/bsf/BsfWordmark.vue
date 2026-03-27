<script setup lang="ts">
withDefaults(
  defineProps<{
    compact?: boolean
    showTagline?: boolean
  }>(),
  {
    compact: false,
    showTagline: false,
  },
)
</script>

<template>
  <div class="min-w-0">
    <p
      :class="[
        compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg',
        'font-display leading-none tracking-tight',
      ]"
    >
      <span class="text-highlighted/80">Been</span>
      <span class="text-primary-700 dark:text-primary-400">Sober</span>
      <span class="text-highlighted/80">For</span>
    </p>
    <p
      v-if="showTagline"
      class="text-muted mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.22em] sm:text-[11px]"
    >
      Counter / Profile / Share / QR
    </p>
  </div>
</template>

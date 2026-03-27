<script setup lang="ts">
withDefaults(
  defineProps<{
    sizeClass?: string
  }>(),
  { sizeClass: 'h-10 w-10' },
)
</script>

<template>
  <img
    src="/logo-mark.svg"
    width="40"
    height="40"
    alt=""
    aria-hidden="true"
    class="shrink-0"
    :class="sizeClass"
    decoding="async"
  />
</template>

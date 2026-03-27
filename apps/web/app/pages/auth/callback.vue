<script setup lang="ts">
useSeo({
  title: 'Finishing Sign In',
  description: 'Completing your authentication callback.',
})

useWebPageSchema({
  name: 'Finishing Sign In',
  description: 'Completing your authentication callback.',
})
</script>

<template>
  <div class="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
    <AuthExchangePanel />
  </div>
</template>

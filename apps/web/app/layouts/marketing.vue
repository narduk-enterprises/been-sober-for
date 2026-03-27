<script setup lang="ts">
import BsfSiteHeader from '~/components/bsf/SiteHeader.vue'
import BsfSiteFooter from '~/components/bsf/SiteFooter.vue'
</script>

<template>
  <div class="bsf-shell text-highlighted flex min-h-screen flex-col">
    <BsfSiteHeader />
    <div role="main" class="flex-1">
      <slot />
    </div>
    <BsfSiteFooter />
  </div>
</template>

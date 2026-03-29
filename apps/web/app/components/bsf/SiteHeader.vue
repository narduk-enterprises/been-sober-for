<script setup lang="ts">
const navItems = [
  { label: 'Calculator', to: '/sobriety-calculator', icon: 'i-lucide-calculator' },
  { label: 'About', to: '/about', icon: 'i-lucide-info' },
  { label: 'FAQ', to: '/faq', icon: 'i-lucide-circle-help' },
]

const { loggedIn } = useAuth()
</script>

<template>
  <div
    role="banner"
    class="border-default bg-default/80 supports-[backdrop-filter]:bg-default/65 sticky top-0 z-30 border-b backdrop-blur-md"
  >
    <UContainer class="flex flex-wrap items-center justify-between gap-3 py-3 sm:py-4">
      <NuxtLink
        to="/"
        class="focus-visible:ring-primary flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <BsfLogoMark size-class="h-11 w-11 sm:h-12 sm:w-12" />
        <BsfWordmark show-tagline />
      </NuxtLink>

      <div role="navigation" class="hidden items-center gap-1 lg:flex" aria-label="Site">
        <UNavigationMenu :items="navItems" />
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <template v-if="loggedIn">
          <UButton to="/dashboard" color="primary" size="sm" icon="i-lucide-gauge" trailing>
            Dashboard
          </UButton>
        </template>
        <template v-else>
          <UButton
            to="/login"
            color="neutral"
            variant="ghost"
            size="sm"
            class="hidden sm:inline-flex"
          >
            Log in
          </UButton>
          <UButton to="/register" color="primary" size="sm" icon="i-lucide-plus" trailing>
            Create account
          </UButton>
        </template>
      </div>
    </UContainer>
    <UContainer class="pb-3 lg:hidden">
      <div role="navigation" class="flex gap-2 overflow-x-auto" aria-label="Site sections">
        <UButton
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          color="neutral"
          variant="ghost"
          size="xs"
          :icon="item.icon"
        >
          {{ item.label }}
        </UButton>
      </div>
    </UContainer>
  </div>
</template>

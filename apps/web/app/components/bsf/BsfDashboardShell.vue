<script setup lang="ts">
const runtimeConfig = useRuntimeConfig()
const appName =
  runtimeConfig.public.appName && String(runtimeConfig.public.appName).length > 0
    ? runtimeConfig.public.appName
    : 'Been Sober For.com'

const { logout } = useAuth()

async function signOut() {
  await logout()
  await navigateTo('/login', { replace: true })
}

const nav = [
  { label: 'Dashboard', to: '/dashboard', icon: 'i-lucide-gauge' },
  { label: 'Edit profile', to: '/dashboard/edit-profile', icon: 'i-lucide-user-round-pen' },
  { label: 'Share settings', to: '/dashboard/share-settings', icon: 'i-lucide-share-2' },
  { label: 'Preview', to: '/dashboard/preview', icon: 'i-lucide-eye' },
  { label: 'Start again', to: '/dashboard/start-again', icon: 'i-lucide-refresh-ccw' },
  { label: 'Account', to: '/dashboard/account', icon: 'i-lucide-settings' },
]
</script>

<template>
  <div class="bg-muted/30 text-highlighted min-h-screen">
    <div
      role="banner"
      class="border-default bg-default/90 supports-[backdrop-filter]:bg-default/75 sticky top-0 z-30 border-b backdrop-blur-md"
    >
      <UContainer class="flex flex-wrap items-center justify-between gap-3 py-3 sm:py-4">
        <div class="flex min-w-0 flex-wrap items-center gap-4 lg:gap-8">
          <NuxtLink
            to="/"
            class="focus-visible:ring-primary flex min-w-0 items-center gap-2 rounded-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <UIcon
              name="i-lucide-leaf"
              class="text-primary-600 dark:text-primary-400 h-5 w-5 shrink-0"
            />
            <span class="truncate">{{ appName }}</span>
          </NuxtLink>
          <div role="navigation" class="hidden items-center gap-1 lg:flex" aria-label="Dashboard">
            <UButton
              v-for="item in nav"
              :key="item.to"
              :to="item.to"
              color="neutral"
              variant="ghost"
              size="sm"
              :icon="item.icon"
            >
              {{ item.label }}
            </UButton>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <UButton to="/" color="neutral" variant="ghost" size="sm" class="hidden sm:inline-flex">
            Home
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-log-out"
            data-testid="auth-signout"
            @click="signOut"
          >
            Sign out
          </UButton>
        </div>
      </UContainer>
      <UContainer class="border-default flex gap-1 overflow-x-auto border-t py-2 lg:hidden">
        <UButton
          v-for="item in nav"
          :key="item.label"
          :to="item.to"
          size="xs"
          color="neutral"
          variant="soft"
          :icon="item.icon"
        >
          {{ item.label }}
        </UButton>
      </UContainer>
    </div>
    <UContainer class="max-w-3xl py-8 sm:py-10">
      <slot />
    </UContainer>
  </div>
</template>

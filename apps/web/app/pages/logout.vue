<script setup lang="ts">
const config = useRuntimeConfig()
const { logout } = useAuth()

useSeo({
  title: 'Signing Out',
  description: 'Clearing your app session.',
})

useWebPageSchema({
  name: 'Signing Out',
  description: 'Clearing your app session.',
})

onMounted(async () => {
  await logout()
  await navigateTo(config.public.authLoginPath, { replace: true })
})
</script>

<template>
  <div class="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
    <UCard class="w-full max-w-md text-center">
      <div class="space-y-3 py-4">
        <UIcon name="i-lucide-loader-circle" class="mx-auto size-8 animate-spin text-primary" />
        <p class="text-sm text-muted">Signing you out of this app…</p>
      </div>
    </UCard>
  </div>
</template>

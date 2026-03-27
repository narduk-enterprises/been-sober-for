<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth'],
})

useSeo({
  title: 'Account settings | Been Sober For.com',
  description: 'Password and account options for Been Sober For.',
  robots: 'noindex, nofollow',
  ogImage: {
    title: 'Account settings',
    description: 'Account',
    icon: 'i-lucide-settings',
  },
})

useWebPageSchema({
  name: 'Account settings',
  description: 'Manage your Been Sober For account.',
})

const toast = useToast()
const { user } = useAuth()
const authApi = useAuthApi()

const currentPassword = ref('')
const newPassword = ref('')
const changing = ref(false)

async function changePassword() {
  if (!currentPassword.value || !newPassword.value) {
    toast.add({ title: 'Fill in both password fields.', color: 'warning' })
    return
  }
  if (newPassword.value.length < 8) {
    toast.add({ title: 'New password should be at least 8 characters.', color: 'warning' })
    return
  }
  changing.value = true
  try {
    await authApi.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    })
    currentPassword.value = ''
    newPassword.value = ''
    toast.add({ title: 'Password updated', color: 'success' })
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    toast.add({
      title: err.data?.message || err.message || 'Could not change password.',
      color: 'error',
    })
  } finally {
    changing.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl space-y-8">
    <div>
      <h1 class="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Account</h1>
      <p class="text-muted mt-2 text-sm">Signed in as {{ user?.email }}</p>
    </div>

    <UCard>
      <h2 class="font-display text-lg font-semibold">Change password</h2>
      <UForm class="mt-4 space-y-4" @submit="changePassword">
        <UFormField label="Current password" name="current">
          <UInput v-model="currentPassword" type="password" autocomplete="current-password" />
        </UFormField>
        <UFormField label="New password" name="new">
          <UInput v-model="newPassword" type="password" autocomplete="new-password" />
        </UFormField>
        <UButton type="submit" color="primary" :loading="changing">Update password</UButton>
      </UForm>
    </UCard>

    <UCard>
      <h2 class="font-display text-lg font-semibold">Delete account</h2>
      <p class="text-muted mt-2 text-sm leading-relaxed">
        We are finishing a self-serve delete flow. Until then, email
        <ULink to="mailto:support@beensoberfor.com" class="text-primary-600 dark:text-primary-400"
          >support@beensoberfor.com</ULink
        >
        from your account email and we will remove your data.
      </p>
    </UCard>

    <UButton to="/dashboard" color="neutral" variant="ghost" icon="i-lucide-arrow-left"
      >Back</UButton
    >
  </div>
</template>

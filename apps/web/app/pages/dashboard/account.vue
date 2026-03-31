<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth'],
})

useSeo({
  title: 'Account settings',
  description: 'Password and account options for BeenSoberFor.',
  robots: 'noindex, nofollow',
  ogImage: {
    title: 'Account settings',
    description: 'Account',
    icon: 'i-lucide-settings',
  },
})

useWebPageSchema({
  name: 'Account settings',
  description: 'Manage your BeenSoberFor account.',
})

const toast = useToast()
const { user, changePassword: updatePassword, deleteAccount: removeAccount } = useAuth()
const hydrated = useHydratedFlag()

const currentPassword = ref('')
const newPassword = ref('')
const changing = ref(false)
const deleteCurrentPassword = ref('')
const deleteConfirmed = ref(false)
const deleteModalOpen = ref(false)
const deleting = ref(false)

const requiresCurrentPassword = computed(() => {
  if (!user.value) {
    return false
  }

  return (
    user.value.authBackend === 'local' ||
    Boolean(user.value.authProviders?.includes('email') && !user.value.needsPasswordSetup)
  )
})

function toUserFacingError(error: unknown, fallback: string) {
  if (!error || typeof error !== 'object') return fallback

  const maybeError = error as {
    data?: { statusMessage?: string; message?: string }
    statusMessage?: string
    message?: string
  }

  return (
    maybeError.data?.statusMessage ||
    maybeError.data?.message ||
    maybeError.statusMessage ||
    maybeError.message ||
    fallback
  )
}

async function submitPasswordChange() {
  if (!newPassword.value) {
    toast.add({ title: 'Enter a new password.', color: 'warning' })
    return
  }
  if (requiresCurrentPassword.value && !currentPassword.value) {
    toast.add({ title: 'Enter your current password.', color: 'warning' })
    return
  }
  if (newPassword.value.length < 8) {
    toast.add({ title: 'New password should be at least 8 characters.', color: 'warning' })
    return
  }
  changing.value = true
  try {
    await updatePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    })
    currentPassword.value = ''
    newPassword.value = ''
    toast.add({ title: 'Password updated', color: 'success' })
  } catch (e: unknown) {
    toast.add({
      title: toUserFacingError(e, 'Could not change password.'),
      color: 'error',
    })
  } finally {
    changing.value = false
  }
}

function openDeleteConfirmation() {
  if (!deleteConfirmed.value) {
    toast.add({
      title: 'Confirm that you understand this will permanently delete your account.',
      color: 'warning',
    })
    return
  }

  if (requiresCurrentPassword.value && !deleteCurrentPassword.value) {
    toast.add({ title: 'Enter your current password to continue.', color: 'warning' })
    return
  }

  deleteModalOpen.value = true
}

async function confirmDeleteAccount() {
  deleting.value = true

  try {
    await removeAccount({
      currentPassword: deleteCurrentPassword.value || undefined,
    })
    deleteModalOpen.value = false
    deleteCurrentPassword.value = ''
    deleteConfirmed.value = false
    toast.add({ title: 'Account deleted', color: 'success' })
    await navigateTo('/', { replace: true })
  } catch (error) {
    deleteModalOpen.value = false
    toast.add({
      title: toUserFacingError(error, 'Could not delete your account.'),
      color: 'error',
    })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div>
    <div class="mx-auto max-w-xl space-y-8">
      <div>
        <h1 class="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Account</h1>
        <p class="text-muted mt-2 text-sm">Signed in as {{ user?.email }}</p>
      </div>

      <UCard>
        <h2 class="font-display text-lg font-semibold">Change password</h2>
        <div v-if="!hydrated" class="mt-4 flex justify-center py-6">
          <UIcon name="i-lucide-loader-2" class="text-muted h-6 w-6 animate-spin" />
        </div>
        <UForm v-else class="mt-4 space-y-4" @submit.prevent="submitPasswordChange">
          <UFormField v-if="requiresCurrentPassword" label="Current password" name="current">
            <UInput v-model="currentPassword" type="password" autocomplete="current-password" />
          </UFormField>
          <UFormField label="New password" name="new">
            <UInput v-model="newPassword" type="password" autocomplete="new-password" />
          </UFormField>
          <UButton type="submit" color="primary" :loading="changing">Update password</UButton>
        </UForm>
      </UCard>

      <UCard class="border border-error/20">
        <h2 class="font-display text-lg font-semibold">Delete account</h2>
        <p class="text-muted mt-2 text-sm leading-relaxed">
          This permanently deletes your BeenSoberFor account, your current session, and your public
          profile page. This action cannot be undone.
        </p>
        <p class="text-muted mt-2 text-sm leading-relaxed">
          <template v-if="requiresCurrentPassword">
            Enter your current password, then confirm the deletion.
          </template>
          <template v-else>
            This account does not currently require a password to finish deletion, but you still
            need to confirm the action.
          </template>
        </p>
        <div v-if="!hydrated" class="mt-4 flex justify-center py-6">
          <UIcon name="i-lucide-loader-2" class="text-muted h-6 w-6 animate-spin" />
        </div>
        <UForm v-else class="mt-4 space-y-4" @submit.prevent="openDeleteConfirmation">
          <UFormField
            v-if="requiresCurrentPassword"
            label="Current password to delete account"
            name="delete-current-password"
          >
            <UInput
              v-model="deleteCurrentPassword"
              type="password"
              autocomplete="current-password"
            />
          </UFormField>

          <UCheckbox
            v-model="deleteConfirmed"
            label="I understand this permanently deletes my account, public page, and current session."
          />

          <UButton
            type="submit"
            color="error"
            icon="i-lucide-trash-2"
            :loading="deleting"
            :disabled="deleting"
          >
            Delete account
          </UButton>
        </UForm>
      </UCard>

      <UButton to="/dashboard" color="neutral" variant="ghost" icon="i-lucide-arrow-left"
        >Back</UButton
      >
    </div>

    <AppConfirmModal
      v-model="deleteModalOpen"
      title="Delete your account?"
      message="Your BeenSoberFor account and public page will be permanently removed."
      confirm-label="Delete account forever"
      confirm-color="error"
      cancel-label="Keep my account"
      :loading="deleting"
      :dismissible="!deleting"
      @confirm="confirmDeleteAccount"
    >
      <p class="text-muted text-sm">
        Signed in as <span class="font-medium text-default">{{ user?.email }}</span>
      </p>
    </AppConfirmModal>
  </div>
</template>

<script setup lang="ts">
/**
 * AppConfirmModal — Generic confirmation dialog.
 *
 * Wraps UModal for "Are you sure?" patterns. Supports customizable title,
 * message, button labels, colors, and a loading state on the confirm button.
 *
 * Usage:
 *   <AppConfirmModal
 *     v-model="showDeleteModal"
 *     title="Delete invoice?"
 *     message="This action cannot be undone."
 *     confirm-label="Delete"
 *     confirm-color="error"
 *     :loading="isDeleting"
 *     @confirm="handleDelete"
 *   />
 */

type ConfirmColor =
  | 'error'
  | 'info'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'neutral'

const ICON_TONE_CLASSES: Record<ConfirmColor, string> = {
  error: 'bg-error/10 text-error',
  info: 'bg-info/10 text-info',
  neutral: 'bg-neutral/10 text-neutral',
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/10 text-secondary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
}

const modelValue = defineModel<boolean>({ default: false })

const props = withDefaults(
  defineProps<{
    /** Modal title. */
    title?: string
    /** Description text. */
    message?: string
    /** Icon shown next to the title. */
    icon?: string
    /** Confirm button label. */
    confirmLabel?: string
    /** Cancel button label. */
    cancelLabel?: string
    /** Confirm button color. */
    confirmColor?: ConfirmColor
    /** Whether the confirm button shows a loading spinner. */
    loading?: boolean
    /** Whether the modal can be closed by clicking outside or pressing Escape. */
    dismissible?: boolean
  }>(),
  {
    title: 'Are you sure?',
    message: '',
    icon: 'i-lucide-alert-triangle',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    confirmColor: 'error',
    loading: false,
    dismissible: true,
  },
)

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const iconToneClass = computed(() => ICON_TONE_CLASSES[props.confirmColor])

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  modelValue.value = false
  emit('cancel')
}
</script>

<template>
  <UModal v-model:open="modelValue" :dismissible="props.dismissible" :close="false">
    <template #header>
      <div class="flex items-start gap-3">
        <div
          v-if="props.icon"
          :class="iconToneClass"
          class="flex size-10 shrink-0 items-center justify-center rounded-full"
        >
          <UIcon :name="props.icon" class="size-5" />
        </div>
        <div class="space-y-1">
          <h3 class="text-lg font-semibold text-default">{{ props.title }}</h3>
          <p v-if="props.message" class="text-sm text-muted">{{ props.message }}</p>
        </div>
      </div>
    </template>

    <div v-if="$slots.default" class="space-y-4">
      <slot />
    </div>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="soft"
          :label="props.cancelLabel"
          :disabled="props.loading"
          @click="handleCancel"
        />
        <UButton
          :color="props.confirmColor"
          :label="props.confirmLabel"
          :loading="props.loading"
          @click="handleConfirm"
        />
      </div>
    </template>
  </UModal>
</template>

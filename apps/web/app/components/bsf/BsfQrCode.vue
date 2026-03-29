<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    url: string
    /** Pixel width/height of the generated bitmap */
    size?: number
  }>(),
  { size: 200 },
)

const dataUrl = ref<string | null>(null)
const errorText = ref('')
const downloaded = ref(false)
let downloadFeedbackTimeoutId: ReturnType<typeof setTimeout> | undefined

watch(
  () => props.url,
  async (url) => {
    if (!import.meta.client || !url) {
      dataUrl.value = null
      return
    }
    errorText.value = ''
    try {
      const QR = (await import('qrcode')).default
      dataUrl.value = await QR.toDataURL(url, {
        width: props.size,
        margin: 1,
        errorCorrectionLevel: 'M',
      })
    } catch {
      errorText.value = 'Could not generate QR code.'
      dataUrl.value = null
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  if (downloadFeedbackTimeoutId !== undefined) {
    globalThis.clearTimeout(downloadFeedbackTimeoutId)
  }
})

function downloadPng() {
  if (!dataUrl.value || !import.meta.client) return
  const a = document.createElement('a')
  a.href = dataUrl.value
  a.download = 'beensoberfor-share-qr.png'
  a.click()
  downloaded.value = true
  if (downloadFeedbackTimeoutId !== undefined) {
    globalThis.clearTimeout(downloadFeedbackTimeoutId)
  }
  downloadFeedbackTimeoutId = globalThis.setTimeout(() => {
    downloaded.value = false
  }, 2500)
}
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <div
      class="border-default flex items-center justify-center rounded-2xl border bg-default p-3"
      :style="{ minWidth: `${size + 24}px`, minHeight: `${size + 24}px` }"
    >
      <img
        v-if="dataUrl"
        :src="dataUrl"
        alt="QR code linking to your public sobriety page"
        class="h-auto w-full"
        :style="{ maxWidth: `min(100%, ${size}px)` }"
      />
      <p v-else-if="errorText" class="text-muted text-center text-sm">{{ errorText }}</p>
      <UIcon v-else name="i-lucide-loader-2" class="text-muted h-8 w-8 animate-spin" />
    </div>
    <UButton
      v-if="dataUrl"
      color="neutral"
      variant="outline"
      size="sm"
      :icon="downloaded ? 'i-lucide-check' : 'i-lucide-download'"
      @click="downloadPng"
    >
      {{ downloaded ? 'Downloaded PNG' : 'Download QR (PNG)' }}
    </UButton>
    <p v-if="downloaded" class="text-dimmed text-xs" role="status">PNG downloaded.</p>
  </div>
</template>

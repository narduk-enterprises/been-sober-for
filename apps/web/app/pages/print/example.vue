<script setup lang="ts">
definePageMeta({ layout: 'minimal' })

const title = 'Print preview | Been Sober For (example)'
const description = 'Printer-friendly example: name, day count, QR placeholder, and URL.'

useSeo({
  title,
  description,
  robots: 'noindex, nofollow',
})

useWebPageSchema({
  name: title,
  description,
})
</script>

<template>
  <div class="print-example text-highlighted mx-auto max-w-md px-6 py-10 sm:py-12">
    <p class="screen-only text-muted mb-6 text-center text-sm">
      This screen preview hides chrome for printing. Use your browser’s Print dialog.
    </p>
    <div class="print-card border-default rounded-2xl border bg-default p-8 sm:p-10">
      <div class="border-default flex items-center justify-between gap-4 border-b pb-6">
        <div>
          <p class="text-highlighted text-lg font-semibold">Jamie</p>
          <p class="text-muted text-sm">Been sober for</p>
        </div>
        <div class="bg-muted text-muted flex h-16 w-16 items-center justify-center rounded-full">
          <UIcon name="i-lucide-user-round" class="h-8 w-8" />
        </div>
      </div>
      <p class="text-highlighted mt-8 text-center text-5xl font-bold tabular-nums">1,248</p>
      <p class="text-muted mt-1 text-center text-sm">days · 3y 5mo 1d</p>
      <p class="text-highlighted mt-6 text-center text-sm">
        One day at a time—sharing with people I trust.
      </p>
      <div
        class="border-default mx-auto mt-8 flex h-36 w-36 items-center justify-center border-2 border-dashed"
      >
        <UIcon name="i-lucide-qr-code" class="text-muted h-20 w-20" />
      </div>
      <p class="text-dimmed mt-4 text-center text-xs">beensoberfor.com/u/jamie</p>
    </div>
  </div>
</template>

<style scoped>
.screen-only {
  display: block;
}
@media print {
  .screen-only {
    display: none !important;
  }
  .print-example {
    padding: 0;
    max-width: none;
  }
  .print-card {
    border: none !important;
    box-shadow: none !important;
  }
}
</style>

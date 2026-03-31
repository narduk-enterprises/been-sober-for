<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

const title = 'Jamie — 1,248 Days Sober (example)'
const description =
  'Example public profile: photo, name, sober counter, optional message, and QR code—how a real share page can look.'

useSeo({
  title,
  description,
  robots: 'noindex, nofollow',
  ogImage: { title, description, icon: 'i-lucide-user-round' },
})

useWebPageSchema({
  name: title,
  description,
})
</script>

<template>
  <UContainer class="py-10 sm:py-14">
    <div class="mx-auto max-w-lg">
      <UBadge color="neutral" variant="subtle" class="mb-6">Example only</UBadge>
      <div
        class="border-default rounded-[1.75rem] border bg-default/90 p-8 text-center shadow-sm sm:p-10"
      >
        <div
          class="bg-muted mx-auto flex h-24 w-24 items-center justify-center rounded-full sm:h-28 sm:w-28"
        >
          <UIcon name="i-lucide-user-round" class="text-muted h-12 w-12 sm:h-14 sm:w-14" />
        </div>
        <p class="font-display text-highlighted mt-6 text-2xl font-semibold">Jamie</p>
        <p class="text-muted mt-4 text-sm">Jamie has been sober for</p>
        <p
          class="font-display text-primary-600 dark:text-primary-400 mt-2 text-6xl font-semibold leading-none sm:text-7xl"
        >
          1,248
        </p>
        <p class="text-muted mt-1 text-sm font-medium">days</p>
        <p class="text-dimmed mt-2 text-xs">3 years, 5 months, 1 day</p>
        <p class="text-muted mt-6 text-sm italic">
          One day at a time—sharing this with people I trust.
        </p>
        <div
          class="border-default mx-auto mt-8 flex h-32 w-32 items-center justify-center rounded-2xl border-2 border-dashed bg-muted/20"
          aria-hidden="true"
        >
          <UIcon name="i-lucide-qr-code" class="text-muted h-16 w-16" />
        </div>
        <p class="text-dimmed mt-4 text-xs">beensoberfor.com/u/jamie</p>
        <div class="mt-8 flex flex-wrap justify-center gap-2">
          <UButton color="neutral" variant="outline" icon="i-lucide-copy" disabled
            >Copy link</UButton
          >
          <UButton to="/print/example" color="primary" variant="outline" icon="i-lucide-printer">
            Print layout
          </UButton>
        </div>
      </div>
      <p class="text-muted mt-8 text-center text-sm">
        Ready for your own page?
        <ULink to="/register" class="text-primary-600 font-medium dark:text-primary-400">
          Start my counter
        </ULink>
      </p>
    </div>
  </UContainer>
</template>

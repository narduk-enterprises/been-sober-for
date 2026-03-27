<script setup lang="ts">
withDefaults(
  defineProps<{
    headline: string
    lead: string
    sections?: { title: string; body: string }[]
  }>(),
  { sections: () => [] },
)
</script>

<template>
  <UContainer class="py-10 sm:py-14">
    <article class="mx-auto max-w-3xl">
      <p class="text-primary-600 dark:text-primary-400 font-display text-sm font-medium italic">
        Milestone guide
      </p>
      <h1 class="font-display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        {{ headline }}
      </h1>
      <p class="text-muted mt-4 text-base leading-relaxed">{{ lead }}</p>

      <div v-if="sections.length" class="mt-10 space-y-8">
        <section v-for="block in sections" :key="block.title">
          <h2 class="font-display text-xl font-semibold tracking-tight">{{ block.title }}</h2>
          <p class="text-muted mt-2 text-sm leading-relaxed sm:text-base">{{ block.body }}</p>
        </section>
      </div>

      <div
        class="border-default mt-12 flex flex-col gap-3 rounded-2xl border bg-default/80 p-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p class="text-highlighted text-sm font-semibold">Count your own days</p>
          <p class="text-muted mt-1 text-xs sm:text-sm">
            Use the calculator, then create a page when you are ready.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <UButton to="/sobriety-calculator" color="primary" icon="i-lucide-calculator">
            Open calculator
          </UButton>
          <UButton to="/register" color="neutral" variant="outline" icon="i-lucide-plus">
            Start my counter
          </UButton>
        </div>
      </div>
    </article>
  </UContainer>
</template>

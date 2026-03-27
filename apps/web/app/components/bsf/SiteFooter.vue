<script setup lang="ts">
const runtimeConfig = useRuntimeConfig()
const appName =
  runtimeConfig.public.appName && String(runtimeConfig.public.appName).length > 0
    ? runtimeConfig.public.appName
    : 'Been Sober For.com'

const displayYear = new Date().getFullYear()
</script>

<template>
  <div role="contentinfo" class="border-default bg-default/80 mt-auto border-t">
    <UContainer class="py-10">
      <div class="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div class="max-w-md">
          <p class="text-highlighted text-sm font-semibold">{{ appName }}</p>
          <p class="text-muted mt-2 text-xs leading-relaxed">
            Set your date. Track your time. Share your progress. A simple personal counter—not
            treatment, not a forum.
          </p>
        </div>
        <div
          role="navigation"
          class="text-muted grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3"
          aria-label="Footer"
        >
          <ULink to="/about" class="hover:text-highlighted">About</ULink>
          <ULink to="/faq" class="hover:text-highlighted">FAQ</ULink>
          <ULink to="/sobriety-calculator" class="hover:text-highlighted"
            >Sobriety calculator</ULink
          >
          <ULink to="/privacy" class="hover:text-highlighted">Privacy</ULink>
          <ULink to="/terms" class="hover:text-highlighted">Terms</ULink>
          <ULink to="/contact" class="hover:text-highlighted">Contact</ULink>
          <ULink
            to="/register"
            class="text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            Create account
          </ULink>
          <ULink to="/login" class="hover:text-highlighted">Log in</ULink>
        </div>
      </div>
      <p class="text-dimmed mt-8 text-center text-xs">
        © {{ displayYear }} {{ appName }}. All rights reserved.
      </p>
    </UContainer>
  </div>
</template>

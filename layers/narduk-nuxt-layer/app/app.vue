<script setup lang="ts">
/**
 * Layer Default Application Shell
 * This uses the layer's highly configurable components.
 */
const route = useRoute()
const appName = useRuntimeConfig().public.appName || 'Nuxt 4 Demo'

const navItems = [{ label: 'Home', to: '/', icon: 'i-lucide-home' }]

/** Layouts and meta that must not get the default max-width app gutter. */
const isFullBleedRoute = computed(() => {
  if (route.meta.fullBleed === true) return true
  const layout = String(route.meta.layout ?? '')
  return (
    layout === 'landing' ||
    layout === 'blank' ||
    layout === 'auth' ||
    layout === 'preset-surface'
  )
})

const showShellHeader = computed(
  () => route.meta.shellHeader !== false && String(route.meta.layout ?? '') !== 'preset-surface',
)
const showShellFooter = computed(() => route.meta.shellFooter !== false)

const shellContentClass = computed(() =>
  isFullBleedRoute.value
    ? 'flex-1'
    : 'flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full',
)

/**
 * Site-wide SEO defaults are now handled by @nuxtjs/seo via nuxt.config.ts `site` block.
 * The titleTemplate is automatically set to `%s %separator %siteName`.
 * Individual pages use the `useSeo()` composable to set their own title/description/OG.
 */
</script>

<template>
  <LayerAppShell>
    <!-- Configurable Header -->
    <template v-if="showShellHeader" #header>
      <LayerAppHeader :app-name="appName" :nav-links="navItems" />
    </template>

    <!-- Main Content Container with standard max-w-7xl padding unless overridden by layout -->
    <div :class="shellContentClass">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </div>

    <!-- Configurable Footer -->
    <template v-if="showShellFooter" #footer>
      <LayerAppFooter :app-name="appName" />
    </template>
  </LayerAppShell>
</template>

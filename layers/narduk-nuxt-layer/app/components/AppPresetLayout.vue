<script setup lang="ts">
import type { LayoutPresetId, PresetLayoutProps } from '../types/layoutPresets'
import PresetAuthSplit from './presets/PresetAuthSplit.vue'
import PresetDashboardAnalytics from './presets/PresetDashboardAnalytics.vue'
import PresetDashboardCrm from './presets/PresetDashboardCrm.vue'
import PresetDocsKnowledge from './presets/PresetDocsKnowledge.vue'
import PresetEditorialStory from './presets/PresetEditorialStory.vue'
import PresetMarketingHero from './presets/PresetMarketingHero.vue'
import PresetPortfolioCanvas from './presets/PresetPortfolioCanvas.vue'
import PresetPricingCascade from './presets/PresetPricingCascade.vue'
import PresetSaasProduct from './presets/PresetSaasProduct.vue'
import PresetSettingsConsole from './presets/PresetSettingsConsole.vue'

interface Props extends PresetLayoutProps {
  preset: LayoutPresetId
}

const props = defineProps<Props>()
const { getPresetById } = useLayoutPresets()

const presetComponents = {
  'marketing-hero': PresetMarketingHero,
  'saas-product': PresetSaasProduct,
  'docs-knowledge': PresetDocsKnowledge,
  'editorial-story': PresetEditorialStory,
  'dashboard-analytics': PresetDashboardAnalytics,
  'dashboard-crm': PresetDashboardCrm,
  'auth-split': PresetAuthSplit,
  'settings-console': PresetSettingsConsole,
  'pricing-cascade': PresetPricingCascade,
  'portfolio-canvas': PresetPortfolioCanvas,
}

const resolvedComponent = computed(() => presetComponents[props.preset])
const presetMeta = computed(() => getPresetById(props.preset))
</script>

<template>
  <div class="space-y-6">
    <PresetLayoutNav
      v-if="presetMeta"
      :brand="presetMeta.name"
      :category="presetMeta.category"
      :items="presetMeta.navItems"
    />

    <component
      :is="resolvedComponent"
      :eyebrow="eyebrow"
      :title="title"
      :description="description"
      :primary-action="primaryAction"
      :secondary-action="secondaryAction"
      :show-annotations="showAnnotations"
    >
      <template v-if="$slots.prelude" #prelude>
        <slot name="prelude" />
      </template>

      <template v-if="$slots.hero" #hero>
        <slot name="hero" />
      </template>

      <template v-if="$slots.aside" #aside>
        <slot name="aside" />
      </template>

      <slot />

      <template v-if="$slots.footer" #footer>
        <slot name="footer" />
      </template>
    </component>
  </div>
</template>

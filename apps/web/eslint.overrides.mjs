// App-specific ESLint exceptions live here.
//
// These route-level pages and auth surfaces intentionally keep orchestration,
// SEO metadata, and UX copy together. Splitting them further would mostly move
// ceremony around, so the file-size-budget rule is disabled only for the
// specific app-owned files that currently need that exemption.
export default [
  {
    files: [
      'app/pages/index.vue',
      'app/pages/reset-password.vue',
      'app/pages/sobriety-calculator.vue',
      'app/pages/dashboard/account.vue',
      'app/pages/dashboard/edit-profile.vue',
      'app/pages/dashboard/index.vue',
      'app/pages/dashboard/share-settings.vue',
      'app/pages/dashboard/start-again.vue',
      'app/components/auth/LoginCard.vue',
      'app/components/auth/RegisterCard.vue',
      'app/composables/useAuthApi.ts',
    ],
    rules: {
      'narduk/file-size-budget': 'off',
    },
  },
]

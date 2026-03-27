<!-- Nuxt UI + Tailwind review guidance for inherited workflows. -->

# UI Consistency Review

Apply this guidance when the repo uses `@nuxt/ui`, Tailwind CSS v4, or a shared
design-token system.

## Component and theming checks

- Prefer repo-standard Nuxt UI primitives over bespoke duplicates when the
  duplicate adds little value and increases maintenance cost.
- Flag legacy or inconsistent component usage that the repo explicitly avoids
  such as outdated divider/separator primitives, missing `UApp` wrappers, or ad
  hoc modal/toast patterns when a standard composable exists.
- Look for raw hex colors, ad hoc spacing systems, or dynamic Tailwind class
  construction when the repo expects semantic tokens and `@theme` variables.
- In Tailwind v4 setups, flag theme regressions such as reintroducing
  `tailwind.config.*`-driven theme logic, broken `@theme` ordering, or
  `@apply`-heavy abstractions that work against the documented pattern.

## UX and accessibility checks

- Forms should follow the repo's validation pattern. Flag missing validation
  affordances, inaccessible labels, or inconsistent error-state handling when
  the repository has a standard approach.
- Prefer low-risk consistency improvements over subjective redesign advice.
  These workflows should remove drift, not invent a new design system.

## Good cleanup targets

- internal links rendered as raw `<a>` instead of `NuxtLink`
- duplicated theme tokens or one-off color values
- inconsistent Nuxt UI component variants for the same concept
- SSR-unsafe UI code that reads `window` or `document` during render

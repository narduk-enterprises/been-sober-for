# Engineering Guide

## Platform Constraints

- Nuxt 4, Nuxt UI 4, and Cloudflare Workers only.
- D1 and Drizzle are the database path.
- No Node-only runtime assumptions in app code.
- Keep request handling stateless across worker isolates.

## Security Defaults

- Use the shared CSRF, CORS, security headers, and rate-limit helpers.
- Validate mutation input before using it.
- Keep browser-only code behind client-only guards or lifecycle hooks.

## UI And Data Flow

- Prefer the shared layer exports and starter bundle package.
- Keep components thin and move fetch or state logic into composables.
- Use `useAsyncData` or `useFetch` instead of raw `$fetch` in setup code.

## Quality Bar

- Maintain zero TypeScript, ESLint, and build warnings.
- Follow the tokenized design system and Nuxt UI 4 conventions.
- Run the relevant validation command after meaningful changes.

## Forward-Sync Styling Defaults

- Default to semantic tokens and bundle-provided UI patterns during
  template-forward work. Do not preserve raw Tailwind colors just because the
  downstream repo already has them.
- Treat these internal skills as the default design-system playbook when a
  forward turns into UI cleanup: `tailwind-design-system`,
  `tailwind-theme-builder`, and `tailwindcss-advanced-layouts`.
- Keep Tailwind v4 theming CSS-first with `@theme`. Do not reintroduce
  `tailwind.config.*` theme drift or one-off color variables when the starter
  already exposes semantic tokens.
- Keep layout shells explicit and consistent with stable gaps, `min-w-0`
  discipline, and responsive grid or flex patterns instead of ad hoc wrapper
  stacks.

Typical token moves:

| Replace this                  | With this                         |
| ----------------------------- | --------------------------------- |
| `text-neutral-900`            | `text-default`                    |
| `text-neutral-600`            | `text-muted`                      |
| `bg-white border-neutral-200` | `bg-default border-default`       |
| `bg-neutral-50`               | `bg-elevated`                     |
| custom theme color literals   | existing semantic `@theme` tokens |

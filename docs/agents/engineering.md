# Engineering Guide

## Hard Constraints

- Deployed server code runs on Cloudflare Workers.
- Do not use Node.js built-ins such as `fs`, `path`, `crypto`, `bcrypt`, or
  `child_process` in Worker-bound code.
- Use Web Crypto (`crypto.subtle`) for hashing and key derivation.
- Use Drizzle ORM. Do not introduce Prisma or other Node-dependent ORMs.
- Server code must be stateless across requests.
- In Drizzle `sql` template literals, `${table.column}` becomes a value binding,
  not a column reference. Avoid correlated subquery mistakes; prefer Drizzle's
  relational API or separate queries batched with `Promise.all`.

## Security Defaults

### Mutation Classification

All POST, PUT, PATCH, and DELETE routes should use the shared wrappers from
`server/utils/mutation.ts`, for example:

```ts
export default defineUserMutation(
  {
    rateLimit: RATE_LIMIT_POLICIES.authChangePassword,
    parseBody: withValidatedBody(changePasswordSchema.parse),
  },
  async ({ event, user, body }) => {
    // ...
  },
)
```

Use the matching wrapper for the route type:

- `defineAdminMutation`
- `defineUserMutation`
- `definePublicMutation`
- `defineWebhookMutation`
- `defineCallbackMutation`
- `defineCronMutation`

### Request Validation

- Validate JSON bodies with `withValidatedBody(schema.parse)`.
- Use `withOptionalValidatedBody(schema.parse, fallback)` only when an empty
  body is intentional.
- Never rely on raw `readBody()` data in mutation routes.

### Rate Limiting

- The layer ships a per-isolate sliding-window IP limiter.
- It protects one Worker isolate, not the entire global edge.
- Production apps should add Cloudflare dashboard or Terraform rate-limiting
  rules for true global enforcement.

### CORS, CSRF, And Headers

- CORS is same-origin by default and applies to `/api/*` routes only.
- Cross-origin access must use exact origin matches via
  `runtimeConfig.corsAllowedOrigins`.
- CSRF protection requires `X-Requested-With` on state-changing requests.
- Security headers ship from middleware and should stay enabled unless the
  change is deliberate and reviewed.

## Nuxt UI 4 Rules

- Use `USeparator`, not `UDivider`.
- Use `i-lucide-*` icons only.
- Prefer semantic colors such as `primary` and `neutral`.
- Configure Tailwind v4 through `@theme` in CSS, not `tailwind.config`.
- Inputs do not default to full width. Add `class="w-full"` unless the layout is
  intentionally narrow.

## Lint Quick Reference

### Semantic Colors

Avoid raw Tailwind colors in app code.

| Do not use           | Use instead      |
| -------------------- | ---------------- |
| `text-neutral-900`   | `text-default`   |
| `text-neutral-600`   | `text-muted`     |
| `text-neutral-400`   | `text-dimmed`    |
| `bg-neutral-100`     | `bg-muted`       |
| `bg-neutral-50`      | `bg-elevated`    |
| `bg-white`           | `bg-default`     |
| `border-neutral-200` | `border-default` |
| `text-red-500`       | `text-error`     |
| `text-green-500`     | `text-success`   |
| `text-blue-500`      | `text-info`      |
| `text-yellow-500`    | `text-warning`   |

### Required Nuxt UI Replacements

| Native element | Use instead                    |
| -------------- | ------------------------------ |
| `<button>`     | `<UButton>`                    |
| `<form>`       | `<UForm>`                      |
| `<input>`      | `<UInput>`                     |
| `<table>`      | `<UTable>`                     |
| `<details>`    | `<UAccordion>`                 |
| `<dialog>`     | `<UModal>`                     |
| `<hr>`         | `<USeparator>`                 |
| `<kbd>`        | `<UKbd>`                       |
| `<progress>`   | `<UProgress>`                  |
| `<select>`     | `<USelect>` or `<USelectMenu>` |

### Tailwind v4 Syntax

| Old                | Current                |
| ------------------ | ---------------------- |
| `bg-gradient-to-r` | `bg-linear-to-r`       |
| `bg-gradient-to-b` | `bg-linear-to-b`       |
| `decoration-clone` | `box-decoration-clone` |
| `decoration-slice` | `box-decoration-slice` |

### Common Guardrails

- No raw `$fetch` in page `script setup`.
- Prefer composables for fetching logic.
- No module-scope `ref()` in composables or utilities.
- Avoid `Array.map(async ...)` on the server when it creates N+1 work.
- Every page must call `useSeo()` and a Schema.org helper.

If a false positive requires suppression, add a narrow inline disable with a
clear justification and track any file-level suppression in
`guardrail-exceptions.json`.

## Design Tokens

The layer exposes these `@theme` tokens:

- Typography: `--font-sans`, `--font-display`
- Shadows: `--shadow-card`, `--shadow-elevated`, `--shadow-overlay`
- Radius: `--radius-card`, `--radius-button`, `--radius-badge`, `--radius-input`
- Motion: `--transition-fast`, `--transition-base`, `--transition-slow`,
  `--transition-spring`

Use utility classes such as `.glass`, `.glass-card`, `.card-base`,
`.shadow-card`, `.shadow-elevated`, and `.shadow-overlay` before inventing new
global primitives.

## SEO On Every Page

Every page should call both:

```ts
useSeo({
  title: '...',
  description: '...',
  ogImage: { title: '...', description: '...', icon: 'icon' },
})

useWebPageSchema({
  name: '...',
  description: '...',
})
```

Use another schema helper when the page is an article, product, and so on.

## Architecture Patterns

- Thin components, thick composables.
- Use `AppTabs` and `usePersistentTab` instead of custom tab persistence logic.
- Use `useState()` or Pinia for SSR-safe shared state.
- Wrap browser-only code in `onMounted` or `<ClientOnly>`.
- Inside `server/`, use `#server/` imports.
- Generate app migrations from `apps/web/server/database/app-schema.ts`, not
  from the combined runtime schema.
- Run package-scoped quality checks. For the main app, use
  `pnpm --filter web run quality`.

## Zero Warnings Policy

Code in this template and in derived apps should ship with zero TypeScript,
ESLint, Vue, Nuxt, and build warnings. Fix the real issue instead of hiding it.

## Shared ESLint Plugins

Workspace-local plugins enforce many of these rules automatically.

| Plugin                                      | Focus                                                              |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `eslint-plugin-nuxt-ui`                     | Nuxt UI component and API correctness                              |
| `eslint-plugin-nuxt-guardrails`             | SSR safety, SEO requirements, fetch rules, store rules             |
| `eslint-plugin-atx`                         | Design system, lint guardrails, validation, and architecture rules |
| `eslint-plugin-vue-official-best-practices` | Composition API and Pinia patterns                                 |

Run `pnpm run build:plugins` after changing TypeScript-based plugin code.

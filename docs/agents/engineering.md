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

## Developer tooling

The DX stack is intentionally narrow — one tool per concern, no overlap:

- **Prettier 3.x** owns all formatting. Config in `prettier.config.mjs`. Ignore
  rules in `.prettierignore`.
- **ESLint flat config** owns linting. Config in `apps/web/eslint.config.mjs`
  extending `@narduk-enterprises/eslint-config`. `eslint-config-prettier` is
  already bundled, so ESLint and Prettier cannot fight.
- **EditorConfig** owns line endings, indentation, and charset.
- **`.vscode/settings.json`** pins Prettier as the default formatter for `.vue`,
  `.ts`, `.tsx`, `.js`, `.json`, `.yaml`, `.md`, and `.css`, and sets
  `vue.format.enable: false` so Volar does not race Prettier on `.vue` files.
- **`.vscode/extensions.json`** recommends Prettier, ESLint, Volar,
  EditorConfig, and Tailwind IntelliSense, and marks Vetur and js-beautify as
  unwanted (they collapse multi-attribute Vue tags).

### Canonical fix paths

| Situation                 | Command                                           |
| ------------------------- | ------------------------------------------------- |
| Format one file           | Save in the editor; format-on-save runs Prettier. |
| Format the whole tree     | `pnpm run format` from the repo root.             |
| Check without writing     | `pnpm run format:check`.                          |
| App-scoped quality signal | `pnpm --filter web run quality`.                  |

### Pre-commit hook

The pre-commit hook (`.githooks/pre-commit`, installed by
`tools/install-git-hooks.cjs` on postinstall) runs Prettier on staged
formattable files and guards against `.npmrc.auth` commits and lockfile drift.
To bypass the Prettier step for a rescue commit:

```bash
SKIP_PRETTIER_HOOK=1 git commit -m "rescue: ..."
```

The lockfile guard and the `.npmrc.auth` guard cannot be bypassed. CI on PRs
runs the same format check.

### CI

`.github/workflows/ci.yml` triggers on `pull_request` to `main` (and manual
`workflow_dispatch`). It calls
`narduk-enterprises/narduk-template/.github/workflows/reusable-quality.yml` with
`run-lint: true` and `run-typecheck: true`; the lint job also runs
`pnpm run format:check`.

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

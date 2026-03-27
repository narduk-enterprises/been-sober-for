---
name: generate-brand-identity
description: >-
  Transforms a Nuxt 4 app from template scaffold into a cohesive visual product:
  strips default branding, sets creative direction (color, type, shape), wires
  Nuxt-aligned Tailwind v4 theme (Nuxt UI module, CSS order, `UApp`,
  `app.config` semantics), generates logo/hero/empty-state assets (host
  image tools first, then narduk-cli per narduk-tool), runs the favicon
  manifest pipeline, normalizes sizes with local CLI tooling, and applies
  holistic UI polish with Nuxt UI 4.
  Use when the user invokes /generate-brand-identity, asks for a brand refresh,
  full visual identity, landing redesign, or “make this look like a real
  product.”
---

# Generate brand identity

## When this skill applies

Run the **full pipeline** end-to-end. Do not ask the user creative questions:
analyze the codebase, choose direction, execute, then summarize with
screenshots.

## Full procedure

**Read and follow** [references/workflow.md](references/workflow.md) for every
phase, table, code sample, checklist, and anti-pattern. That file is the
authoritative workflow (Phases 0–6).

## Tailwind theme + Nuxt UI + Nuxt (Phase 2)

Phase 2 must produce a theme that **Nuxt UI 4 and Nuxt 4 actually consume** — not
a parallel Tailwind setup that fights the module.

Before editing theme files, **load only what you need** from:

- **nuxt-ui** — especially `references/theming.md` and `references/installation.md`
  (module registration, `UApp`, CSS entry, semantic colors, `text-muted` /
  `bg-default`, when custom colors need full `@theme` scales).
- **nuxt** — especially `references/nuxt-config.md` (`modules`, `css`, `colorMode`,
  layers).

**Hard requirements (verify after changes):**

- `nuxt.config` includes **`@nuxt/ui`** in `modules` and registers **`~/assets/css/main.css`**
  (or the app’s single Tailwind entry) under `css`.
- **`main.css` import order:** `@import 'tailwindcss';` then `@import '@nuxt/ui';`
  then `@import './brand.css';` — brand tokens extend the stack; do not drop
  `@nuxt/ui` or duplicate base Tailwind setup.
- **`app.config.ts`** uses `defineAppConfig` with `ui.colors` — at minimum
  `primary` and `neutral` mapped to valid **Tailwind color names** Nuxt UI knows;
  tune `secondary` / `success` / `error` when it improves brand coherence (see
  nuxt-ui theming).
- Root **`UApp`** wraps the app (required for Nuxt UI overlays, tooltips, and
  consistent color-mode behavior).
- Prefer **semantic utilities** (`text-primary`, `bg-default`, `text-muted`,
  `border-default`) in pages/components; avoid ad-hoc hex on primitives unless
  nuxt-ui docs say to define a full custom scale.

Details and code samples: [references/workflow.md](references/workflow.md) Phase 2.

## Phase map (quick orientation)

| Phase | Focus                                                                                                     |
| ----- | --------------------------------------------------------------------------------------------------------- |
| 0     | Remove all template branding (`Nuxt 4`, `N4`, `Demo`, lazy navbar rules)                                  |
| 1     | Discovery: product type, audience, mood, optional scheme catalog                                          |
| 2     | **Tailwind v4 + Nuxt UI + Nuxt** — `app.config.ts`, `main.css` order, `brand.css`, `UApp`, color mode, OG |
| 3     | Bespoke assets + **local resize/crop/encode** — see **Image generation** below                            |
| 4     | `pnpm generate:favicons`, schema.org logo path                                                            |
| 5     | Nuxt UI page building, surfaces, motion, type, a11y, responsive, dark mode                                |
| 6     | Dev server, screenshots, verification checklist                                                           |

## Image generation (Phase 3)

Use this order; do not skip straight to the CLI if a host tool can produce the
asset.

1. **Built-in / environment image tools first** — whatever the current agent or
   IDE exposes (e.g. `GenerateImage`, `generate_image`, or equivalent). Prefer
   these when available so outputs land in the workspace with minimal friction.
2. **Fallback: Narduk CLI** — if built-in generation is unavailable, fails, or
   the user expects local xAI-backed renders: follow the **narduk-tool** / `/narduk-tool`
   skill (`narduk` or `narduk-cli image generate`, optional `--aspect-ratio`, `--output-dir`).
   Save generated files into the paths Phase 3 specifies (`public/favicon.svg`,
   `public/images/`, etc.). Ensure `XAI_API_KEY` / Doppler scope per that skill.

3. **Resize, crop, and encode with local tools** — generative output is rarely
   pixel-perfect. Before commit, normalize each asset using **what is already on
   the machine** (no new installs unless unavoidable): e.g. **ImageMagick**
   (`magick` / `convert`), **ffmpeg**, macOS **sips**, **cwebp**, or a one-off
   **Node + sharp** script in the repo (the template already uses `sharp` for
   favicons). Crop to the correct aspect, scale to target dimensions, and
   export WebP/PNG as the workflow specifies. Do not ship raw generator
   dimensions when the UI expects fixed sizes.

## Non-negotiables

- Generic or placeholder-looking output is failure; decisions should feel
  intentional.
- Default path: **`apps/web/`** (adjust only if the app root differs).
- Prefer Nuxt UI primitives over hand-rolled equivalents; use semantic tokens
  over raw palette utilities where the workflow specifies.

## Related skills

- **brand-guidelines** — only when Anthropic corporate styling is explicitly
  required; this workflow is for **app-specific** identity.
- **narduk-tool** — fallback image pipeline when host tools are not enough.
- **nuxt-ui** — **required for Phase 2** (theming, installation, semantic tokens).
- **nuxt** — **required for Phase 2** (`nuxt.config`, `colorMode`, CSS pipeline).
- **nuxt-seo**, **tailwind-design-system** — use as needed alongside the workflow.

## Prerequisites

`sharp` for favicon generation (see workflow “Prerequisites” section).

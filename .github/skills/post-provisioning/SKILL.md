# Post-provisioning (downstream apps)

Use this skill after the control plane creates a repo from `narduk-nuxt-template`. It sequences
product, UI, contract, and quality work so shipped apps stay consistent with the template.

## When to use

- First implementation pass on a new provisioned app
- Re-aligning an app with template conventions after `sync-template` / `update-layer`

## References (read in order)

| Phase | File | Purpose |
| ----- | ---- | ------- |
| Product brief (generic) | [references/phase-1-product-brief.md](references/phase-1-product-brief.md) | Positioning, IA, SEO, trust—paste domain-specific answers |
| Spec | `SPEC.md` → `UI_PLAN.md` → `CONTRACT.md` in the app repo | Canonical product + API surface |

## Checklist

1. Fill **product brief** sections for the real domain (or attach a completed brief to the PR).
2. Lock **SPEC / UI_PLAN / CONTRACT** before large UI work.
3. Implement **marketing shell**: thin header/footer, trust links, primary/secondary CTAs.
4. Add **SEO pages** (home, FAQ, about, policy) with `useSeo` + `useWebPageSchema` on every route.
5. Decide **indexing policy** for user-generated pages (default `noindex` is usually right).
6. Run `pnpm --filter web run quality` before merge.

## Repo root

See workspace `AGENTS.md` for layer boundaries, mutation rules, and deploy commands.

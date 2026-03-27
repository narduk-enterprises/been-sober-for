Status: LOCKED

# Been Sober For.com

Source: provision.json (been-sober-for)

## Product

A simple site where users can register, upload a photo, and input the date of
their last drink. They can share their progress with others. On their account
profile, they can **start again** if they drink—resetting the sober clock
without losing their account.

## In scope (MVP)

- Email/password registration and login (layer auth).
- Authenticated profile: display name, profile photo upload, **sobriety start
  date** (date of last drink).
- **Public share page** (or shareable slug) so visitors see sober time and
  profile basics without editing.
- **Start again** action on profile: confirm, then set a new sobriety start date
  (history optional for later).
- Marketing landing (`/`) explaining the product; CTA to register.
- Layer SEO: `useSeo` + Schema.org on every app-owned page; favicons and
  manifest complete.

## Out of scope (initial)

- Clinical/medical claims, treatment referrals, or crisis hotline replacement.
- Social feed, comments, or messaging between users.
- Native mobile apps (web-first).
- Custom auth providers beyond what the template ships (unless SPEC amended).

## User flows

1. **Visitor → register → profile setup** — Lands on `/`, signs up via
   `/register`, completes profile (photo + last-drink date).
2. **Returning user → dashboard/profile** — Sees elapsed sober time, share link,
   **Start again** if needed.
3. **Visitor with share link** — Read-only view of public profile / sober
   counter (no auth).
4. **Start again** — Confirm modal → new start date stored → UI reflects reset
   with supportive copy.
5. **Admin** — Existing layer admin patterns; app may extend with moderation
   later.

**Errors:** invalid date, upload too large / wrong type, unauthenticated access
to private routes, network failure with retry messaging.

## Conceptual data model

- **User** — Layer user row (email, password hash, role flags as shipped).
- **Profile extension (app)** — Optional app table keyed by user: `displayName`,
  `avatarUrl` or R2 key, `sobrietyStartedAt` (timestamp or date), `publicSlug`
  (unique), `updatedAt`.
- **Audit (optional later)** — Prior `sobrietyStartedAt` values if product
  requires history.

Implement via `useAppDatabase` + Drizzle in
`apps/web/server/database/app-schema.ts` (MVP: minimal columns above).

## Pages / routes

| Route                      | Purpose                                     |
| -------------------------- | ------------------------------------------- |
| `/`                        | Marketing landing (exists).                 |
| `/register`, `/login`, …   | Layer auth routes.                          |
| `/profile` or `/me`        | Authenticated profile + edit + Start again. |
| `/u/[slug]` or `/p/[slug]` | Public read-only share page.                |
| Layer health, admin, legal | As provided by layer.                       |

Exact paths follow UI_PLAN; prefer layer conventions for auth URLs.

## Non-functional

### Guardrails

Do not reinvent platform primitives. Before adding new auth, session, CSRF,
analytics, SEO, OG images, rate limiting, mutation helpers, or DB access
patterns:

Auth: Use the template / layer auth (session, login/register routes, guards,
useUser-style composables) exactly as shipped. Extend with new tables and route
rules, not a parallel auth stack. Maps / geo (if needed): Use first-class
template or layer integrations (e.g. documented map components, env keys, server
utilities). Do not embed a new map SDK or geocoder unless the template has no
path and SPEC explicitly approves an exception. Data & API: Use useAppDatabase,
layer useDatabase rules, withValidatedBody / mutation wrappers, #server/
imports, and existing D1 + Drizzle patterns. UI & SEO: Use Nuxt UI v4, useSeo +
Schema.org helpers, useFetch / useAsyncData (no raw $fetch in pages). Reuse
OgImage templates from the layer where applicable. Analytics / admin patterns:
Wire through existing PostHog, GA, or admin patterns if the template already
exposes them; do not duplicate trackers or admin APIs. If something is missing,
extend the layer only when the feature is reusable across apps; otherwise keep
changes in apps/web/ and still call into layer utilities.

## Test acceptance (MVP)

- New user can register, set photo + sobriety start date, and see elapsed time
  on profile.
- Share URL shows the same counter and profile basics without login.
- **Start again** updates the start date and refreshes the counter.
- Landing and share pages call `useSeo` and a Schema.org helper; no linter/type
  errors (`pnpm --filter web run quality`).
- Favicon + manifest PNGs return 200 in dev/prod.

## Open questions

- Replace `public/google*.html` with the **property-specific** Google Search
  Console verification file for beensoberfor.com (do not reuse another app’s
  token).
- Final URL shape for public profiles (`/u/:slug` vs `/p/:slug`) and collision
  policy for slugs.

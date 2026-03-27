Status: LOCKED

# UI plan — Been Sober For.com

Locked after SPEC. Sitemap, components, loading / empty / error per route.

## Sitemap

| Route                 | Layout                 | Primary components                                                                                                             |
| --------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `/`                   | `default` or marketing | `UContainer`, hero, feature grid, CTA to register; optional sticky mini-nav (anchors).                                         |
| `/register`, `/login` | Layer                  | Layer `UAuthForm` / auth pages as shipped.                                                                                     |
| `/profile` (or `/me`) | `default`              | `UCard` profile header (avatar, name), sober counter (large duration), share link copy, `UButton` Start again + confirm modal. |
| `/u/[slug]`           | minimal marketing      | Read-only profile mirror: avatar, name, counter, supportive footer; no edit chrome.                                            |

## Per-route UX

### `/` (landing)

- **Loading:** None beyond SSR; optional skeleton for async marketing copy if
  split to API later.
- **Empty:** N/A.
- **Error:** Global error boundary / toast if client fetch fails.

### Profile (authenticated)

- **Loading:** `USkeleton` for avatar + counter while `useAsyncData` / session
  resolves.
- **Empty:** First-run empty state prompting photo + date if incomplete.
- **Error:** Toast + inline validation for date and file upload.

### Public `/u/[slug]`

- **Loading:** Skeleton or spinner for slug resolution.
- **Empty / 404:** Friendly “This page isn’t available” if slug unknown or
  profile private.
- **Error:** 500 message minimal; no stack traces.

### Start again

- **Modal:** `UModal` with confirm copy (non-judgmental). Primary action sets
  new date; cancel closes.

## Shell

- **Recommendation:** `UApp` + `NuxtLayout` + `NuxtPage` in `app.vue` for Nuxt
  UI color mode and consistency with fleet guidance.
- Landing uses in-page header (not “Home + toggle only”); profile/share may omit
  global nav or use minimal brand link home.

## Accessibility

- Sober counter readable by screen readers (aria-live polite on updates if
  client-side tick).
- Focus management on modal open/close; sufficient contrast on primary actions.

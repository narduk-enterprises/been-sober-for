# Phase 1 — Product brief (generic template)

Copy this scaffold into your product doc or PR description, then replace placeholders with
domain-specific answers. Keep it factual and restrained—this is not marketing fluff.

---

## 1. Product definition

### Positioning

- **What it is** (3–5 bullets): _counter, profile, share surface, printable artifact, etc._
- **What it is not** (3–5 bullets): _treatment, medical service, social network, etc._

### Core promise

_One sentence users can repeat._

### Primary emotional goal

_Adjectives: calm, dignified, private, proud without loudness, etc._

---

## 2. Core feature set

### Must-have features

Number each. For each: **user outcome**, **key UI surfaces**, **constraints** (privacy, safety,
legal).

Examples of feature types:

1. Primary metric / counter (what units, live vs snapshot)
2. Account profile (identity, media, bio, privacy)
3. Public share page (URL scheme, what visitors see)
4. QR or printable artifact
5. Destructive or sensitive action (reset, delete) with **non-casual UX**

---

## 3. Product principles

1. **Simplicity** — what you will refuse to build
2. **Privacy** — default visibility; indexing defaults
3. **Shareable artifact** — what strangers should see in one glance
4. **Visual language** — mood board in words (what to avoid)
5. **Tone** — voice rules and banned phrases

---

## 4. Information architecture

### Public

_List pages with one-line purpose each._

### Authenticated

_List pages with one-line purpose each._

Keep the set **lean**—explicitly note pages you are **not** building in v1.

---

## 5. Page-by-page notes

For **home**, **core share view**, **dashboard**, **settings**, **sensitive flows**:

- Goal of the page
- Above-the-fold content
- Primary / secondary CTA copy
- Mobile vs desktop layout notes

---

## 6. Visual design direction

- Overall style keywords
- Shape language (radius, spacing, cards)
- Typography emphasis (e.g. large numerals)
- Dark mode stance (default or optional; contrast rules)

---

## 7. Color and theming spec

- Brand roles: primary, secondary, background, surface, text, accent
- Colors to avoid (cultural / accessibility / cliché reasons)
- How tokens map to Tailwind / Nuxt UI (`app.config`, CSS variables)

---

## 8. Homepage / landing SEO

- Plain-language blocks that answer: what it is, how it works, privacy, printing/sharing, who it is for
- All copy in **meaningful HTML** (not only client-only widgets)

---

## 9. SEO strategy

- **Transactional** keyword bucket (utility searches)
- **Intent / milestone** keyword bucket (if applicable)
- **Core indexable routes** list
- **Non-goals** (e.g. thin UGC profile URLs)

---

## 10. Public UGC indexing policy

State the default (`noindex` vs index) and **why**. List toggles users can change.

---

## 11. Metadata

Provide **title + meta description** templates for:

- Home
- Calculator / tool page (if any)
- FAQ / About
- Public profile (indexed vs unlisted variants)

---

## 12. Social sharing

- OG / Twitter expectations when links are shared
- Whether dynamic OG images are required

---

## 13. QR / print experience

- Use cases
- Print layout must-haves (contrast, fields, URL)
- Screen vs print CSS notes

---

## 14. Copy and tone guide

- Good example lines
- Banned example lines (patterns, not single jokes)

---

## 15. Accessibility and readability

- Type scale for hero metrics
- Contrast / motion / form labeling rules
- Mobile priorities

---

## 16. Trust, safety, credibility

- Required footer / policy links
- Crisis or “not medical” disclaimers when subject matter is sensitive
- Account deletion stance

---

## 17. Recommended page set (lean)

_Checklist of routes to ship vs defer._

---

## 18. Layout decisions (locked)

- Header density
- Footer trust cluster
- Content max-width
- Card system
- Primary CTA label(s)

---

## 19. Brand / theming (locked)

- Personality adjectives
- Motif (what metaphor ties UI together)

---

## 20. SEO implementation checklist

- Unique titles
- Meta descriptions where useful
- Internal links between pillar pages
- Sitemap / robots alignment with indexing policy
- Performance budget awareness

---

## 21. Final summary

**Ship:** _3–5 bullets._  
**Defer:** _3–5 bullets._

Status: DRAFT

# Been Sober For.com

Source: provision.json (been-sober-for)

## Product

A simple site where users can register, upload a photo, and input the date of their last drink. Then share it with people. On their account profile page, they can click start again, if they have a drink.


## In scope

- (fill during agent workflow)


## Out of scope

- (fill during agent workflow)

## User flows

1. Review the product brief, lock the first end-to-end workflow in SPEC, and confirm the implementation order before building.

2. Expand secondary journeys, error states, and privileged/admin flows during the downstream agent workflow.


## Conceptual data model

- 

## Pages / routes

- 

## Non-functional

### Guardrails

Do not reinvent platform primitives. Before adding new auth, session, CSRF, analytics, SEO, OG images, rate limiting, mutation helpers, or DB access patterns:

Auth: Use the template / layer auth (session, login/register routes, guards, useUser-style composables) exactly as shipped. Extend with new tables and route rules, not a parallel auth stack.
Maps / geo (if needed): Use first-class template or layer integrations (e.g. documented map components, env keys, server utilities). Do not embed a new map SDK or geocoder unless the template has no path and SPEC explicitly approves an exception.
Data & API: Use useAppDatabase, layer useDatabase rules, withValidatedBody / mutation wrappers, #server/ imports, and existing D1 + Drizzle patterns.
UI & SEO: Use Nuxt UI v4, useSeo + Schema.org helpers, useFetch / useAsyncData (no raw $fetch in pages). Reuse OgImage templates from the layer where applicable.
Analytics / admin patterns: Wire through existing PostHog, GA, or admin patterns if the template already exposes them; do not duplicate trackers or admin APIs.
If something is missing, extend the layer only when the feature is reusable across apps; otherwise keep changes in apps/web/ and still call into layer utilities.


## Test acceptance (MVP)

- 

## Open questions

- 

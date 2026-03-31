# Build Spec Artifact Map

Use this reference when turning discovery answers into the three planning
files. Keep each decision in one home instead of duplicating it everywhere.

## Lock order

1. `SPEC.md`
2. `UI_PLAN.md`
3. `CONTRACT.md`

If `SPEC.md` is still vague, do not pretend the later files are ready.

## What belongs in `SPEC.md`

`SPEC.md` is product truth. It should answer:

- What are we building?
- Who is it for?
- What is in scope at launch?
- What is explicitly out of scope?
- What are the primary user flows?
- What conceptual entities exist?
- What pages or route groups must exist?
- What non-functional constraints matter?
- What test acceptance criteria define MVP?

Good `SPEC.md` material:

- Audience definition
- Value proposition
- Primary conversion event
- Route list at a product level
- Runtime architecture boundaries such as external auth authority, queue or
  backlog choice, live versus historical data split, and storage roles
- Content ownership and launch dependencies
- Trust, legal, or domain disclaimers
- Success criteria and phase-2 cuts

Do not overload `SPEC.md` with endpoint-level API details.

When the runtime topology becomes concrete enough to name real services,
hostnames, or storage locations, create or update a supporting
`docs/architecture.md` and link it from `SPEC.md` or `README.md` instead of
letting those details live only in chat.

## What belongs in `UI_PLAN.md`

`UI_PLAN.md` turns the product into a concrete surface map.

For each route or route group, capture:

- Purpose of the route
- Primary components or sections
- Required CTAs
- Loading state
- Empty state
- Error state
- Auth or role gating
- SEO or schema notes if the route has special requirements

Good `UI_PLAN.md` material:

- Sitemap
- Navigation and footer decisions
- Shared layout decisions
- Reusable modules
- Route-specific states

Do not turn `UI_PLAN.md` into a design system manifesto. Keep it tied to
routes and user outcomes.

## What belongs in `CONTRACT.md`

`CONTRACT.md` captures system behavior that the UI depends on.

Document:

- Endpoint or action name
- Method and path
- Who can call it
- Request payload
- Response shape
- Validation expectations
- Error cases
- Side effects or integrations

Include:

- Lead capture submissions
- Contact forms
- Auth callbacks
- Admin mutations
- Webhooks
- Search endpoints
- Analytics events that need explicit implementation

If the site truly has no custom server behavior, state that explicitly
instead of leaving the file blank.

## Completion test

The planning set is ready to lock when:

- Another engineer can explain the launch scope without asking basic
  clarification questions
- A designer can map every required route and state
- An implementer knows which APIs, forms, and integrations must exist
- Deferred work is visible and intentional
- The remaining open questions are small enough that they will not change
  architecture or IA

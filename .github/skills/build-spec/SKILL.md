---
name: build-spec
description: >-
  Guide a new site or product through the decisions required to lock
  SPEC.md, UI_PLAN.md, and CONTRACT.md before design or implementation.
  Use when planning a new site, defining scope, discovery, requirements,
  routes, content, integrations, SEO, trust, or launch acceptance.
  Triggers on "build spec", "write the spec", "what do we need to decide",
  "scope this site", "new site planning", "discovery", "requirements",
  and "lock the spec". Defaults to a silent full-intake questionnaire, then
  follows up only on true blockers.
---

# Build Spec

Use this skill to turn a vague new-site idea into locked planning artifacts.
The goal is not to brainstorm forever. The goal is to resolve enough product,
content, UX, and technical decisions that `SPEC.md`, `UI_PLAN.md`, and
`CONTRACT.md` can move from draft to locked.

## When to use

- A new site, app, landing page, or marketing surface is being planned
- The user wants help figuring out what still needs to be decided
- `SPEC.md` exists but is too thin to guide design or implementation
- Scope is drifting because routes, flows, integrations, or content rules are unclear
- If the work is only a scoped feature inside an existing product, prefer
  [`build-feature`](../build-feature/SKILL.md) instead

## What good looks like

By the end of the workflow:

- `SPEC.md` states scope, users, flows, content, constraints, and acceptance
  clearly
- `UI_PLAN.md` maps the routes and route-level states that actually need to
  exist
- `CONTRACT.md` captures every required mutation, endpoint, webhook, or
  explicitly says none
- Open questions are either resolved, assigned, or isolated as launch blockers
- Major runtime boundaries such as auth authority, storage roles, live versus
  historical data paths, and queue or backlog assumptions are either locked in
  `SPEC.md` or linked from a supporting architecture doc

## Workflow

1. Start with a one-screen summary.
2. Ground in the repo and current environment first.
3. Ask one consolidated intake questionnaire by default.
4. Synthesize the answers into:
   - Locked decisions
   - Assumptions
   - True blockers only
5. Ask follow-up questions only when a missing answer would materially change
   scope, IA, architecture, or contract behavior.
6. Lock product truth in `SPEC.md` first.
7. If infrastructure or runtime topology is already known, capture the major
   architecture boundaries in `SPEC.md` and link a dedicated architecture doc
   when service placement is concrete enough to matter.
8. Translate that into routes and states in `UI_PLAN.md`.
9. Lock server and integration behavior in `CONTRACT.md`.
10. End each pass with three buckets:
    - Locked decisions
    - Assumptions to confirm
    - Open questions still blocking the spec

## Questioning mode

Default behavior:

- silently use an all-at-once intake
- do not ask the user which questioning mode they want
- avoid many tiny rounds when one coherent questionnaire will do
- follow up only on unresolved blockers

Override behavior:

- if the user explicitly asks for one-by-one questions, do that
- if the user explicitly asks for batched questions, do that
- if the product surface is too broad for one clean intake, split the intake
  into a few larger grouped batches rather than many small rounds

## Intake design

The default intake should usually cover:

- product definition and audience
- scope, out-of-scope, and launch success
- public and private route groups
- major user flows
- roles and permissions
- data model and storage boundaries
- integrations, auth, live data, queues, and retention
- public sharing, SEO, and discoverability
- design direction, layout expectations, and device priorities
- operational, admin, and acceptance constraints

When the user wants a ready-made one-pass questionnaire, use
[`full-intake.md`](references/full-intake.md) and trim it to the product in
front of you.

## Interview rules

- Default to one complete questionnaire instead of many small batches.
- Keep the intake compact, but do not artificially split it if the user would
  benefit from seeing the whole decision surface at once.
- After the intake, only ask follow-up questions that materially change the
  product, route model, architecture, or contract.
- Prefer high-leverage questions that collapse multiple downstream decisions.
- If the user gives vague answers, propose a recommended default and label it
  as an assumption.
- Push for explicit in-scope and out-of-scope lists. Most spec drift starts there.
- If a requirement implies trust, legal, privacy, moderation, or
  regulated-content risk, surface it early.
- If the site sounds mostly static or editorial, still confirm whether forms,
  lead capture, search, auth, or admin tools exist before skipping
  `CONTRACT.md`.
- If the product handles live data, streams, queues, background jobs, or device
  ingest, ask explicitly about source of truth, batching, retention, latency
  targets, and whether browsers ever connect directly to upstream systems.
- If auth is external to the app, separate identity authority, app sessions,
  and app-owned data early instead of letting them blur together.

## Repo-specific guardrails

- Lock files in this order: `SPEC.md`, then `UI_PLAN.md`, then `CONTRACT.md`.
- If a file is marked `LOCKED` but the user explicitly wants to revisit it,
  reopen it intentionally and record the new status instead of editing around
  the lock silently.
- Every page will need `useSeo(...)` and a Schema.org helper, so page-level
  intent and metadata needs should be captured during spec work.
- Mutations must use the shared wrappers in `server/utils/mutation.ts`;
  request bodies must be validated. Capture that reality in contract
  decisions.
- Downstream apps run on Cloudflare Workers and Drizzle ORM. Do not spec
  Node-only server assumptions.
- Reuse layer patterns before inventing custom auth, database, middleware,
  SEO, or UI primitives.
- For products with live or historical data, separate app state, snapshot or
  cache state, and analytical or time-series state instead of assuming one
  store handles everything.
- If raw upstream data exists, default to managed app streams for browser
  consumption rather than direct raw upstream browser access unless the user
  explicitly wants and accepts that tradeoff.

## References

- Use [`decision-checklist.md`](references/decision-checklist.md) when you need
  the full set of categories to cover.
- Use [`full-intake.md`](references/full-intake.md) when you want a compact
  all-at-once questionnaire to start the conversation.
- Use [`artifact-map.md`](references/artifact-map.md) when translating answers
  into `SPEC.md`, `UI_PLAN.md`, and `CONTRACT.md`.

## Output format

Use this shape during the conversation:

```md
## Snapshot
- Product:
- Audience:
- Primary conversion:
- Recommended scope cut:

## Locked Decisions
- ...

## Assumptions To Confirm
- ...

## Open Questions
- ...

## Next Questions
1. ...
2. ...
```

When the user is ready, convert the decisions into the three planning files
and remove `DRAFT` only when blockers are resolved or explicitly accepted.

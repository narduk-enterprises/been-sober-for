---
name: build-feature
description: >-
  Plan a concrete product feature to decision completeness before
  implementation. Use when scoping a feature, capability, workflow, route,
  integration, migration, or UI slice inside an existing product. Triggers on
  "plan this feature", "scope this feature", "build-feature", "feature spec",
  "what would it take", and "how should we implement this". Defaults to a
  silent full-intake questionnaire, then follows up only on true blockers.
---

# Build Feature

Use this skill to turn a vague feature request into an implementation-ready
plan. The goal is not broad product discovery. The goal is to define one
feature clearly enough that another engineer or agent can implement it without
making product, API, or UX decisions on their own.

## When to use

- The repo already exists and the user wants to add or change a feature
- A feature request spans UI, backend, data, or integrations
- The request is still ambiguous enough that implementation would drift
- A feature needs a decision-complete plan before coding starts

## When not to use

- The user is redefining the whole product or route model; use
  [`build-spec`](../build-spec/SKILL.md) instead
- The work is already decision-complete and should just be implemented
- The request is a narrow bugfix or refactor with no meaningful product or
  interface decisions left to make
- If the request is really a whole-product or whole-site planning exercise,
  switch to [`build-spec`](../build-spec/SKILL.md)

## What good looks like

By the end of the workflow:

- the feature goal and success criteria are explicit
- affected routes, components, APIs, and data changes are known
- in-scope and out-of-scope behavior are visible
- edge cases and failure states are covered
- rollout, validation, and acceptance are concrete enough to implement safely

## Workflow

1. Ground in the repo and current implementation first.
2. Identify the smallest real feature boundary that matches the request.
3. Ask one consolidated intake questionnaire by default.
4. Synthesize the answers into:
   - Locked decisions
   - Assumptions
   - True blockers only
5. Ask follow-up questions only when a missing answer would materially change
   interfaces, data flow, UX, or rollout.
6. Produce a decision-complete feature plan that can be handed directly to an
   implementer.

## Questioning mode

Default behavior:

- silently use an all-at-once intake
- do not ask the user which questioning mode they want
- avoid many tiny rounds when one coherent questionnaire will do
- follow up only on unresolved blockers

Override behavior:

- if the user explicitly asks for one-by-one questions, do that
- if the user explicitly asks for batched questions, do that
- if the feature is too broad for one clean intake, split the intake into a
  few larger grouped batches rather than many small rounds

## Intake design

The default intake should usually cover:

- the feature goal and user value
- target audience, roles, and permissions
- where the feature starts and ends in the UI
- affected routes, pages, or flows
- data model changes and storage boundaries
- mutations, reads, webhooks, jobs, or integrations
- loading, empty, error, and retry behavior
- rollout, migration, and backward-compatibility constraints
- testing and acceptance criteria

When the user wants a ready-made one-pass questionnaire, use
[`full-intake.md`](references/full-intake.md) and trim it to the feature in
front of you.

When the user wants a ready-made one-pass questionnaire, use
[`full-intake.md`](references/full-intake.md) and trim it to the feature in
front of you.

## Interview rules

- Default to one complete questionnaire instead of many small batches.
- After the intake, only ask follow-up questions that materially change the
  implementation plan.
- Prefer high-leverage questions that collapse multiple downstream decisions.
- If the user gives vague answers, propose a recommended default and record it
  as an assumption.
- Separate product decisions from implementation details. Lock product truth
  before arguing about files.
- If the feature touches live data, queues, background jobs, or external auth,
  make source of truth and ownership explicit.
- If the feature affects existing routes or APIs, define compatibility and
  migration behavior instead of assuming a rewrite.

## Repo-specific guardrails

- Read the current implementation first. Do not ask about codebase facts that
  can be discovered.
- Keep the feature boundary tight. Do not accidentally turn a feature plan into
  a whole-product re-spec.
- Reuse existing layer, auth, data, and UI primitives before inventing new ones.
- If the feature needs new routes, APIs, or schema changes, name them clearly.
- If the feature should update `SPEC.md`, `UI_PLAN.md`, or `CONTRACT.md`,
  say so explicitly in the final plan.

## References

- Use [`feature-checklist.md`](references/feature-checklist.md) when you need
  the full set of feature-planning categories to cover.
- Use [`full-intake.md`](references/full-intake.md) when you want a compact
  all-at-once questionnaire to start the conversation.
- Use [`plan-shape.md`](references/plan-shape.md) when translating answers into
  an implementation-ready plan.

## Output format

Use this shape during the conversation:

```md
## Snapshot
- Feature:
- User value:
- Entry points:
- Recommended scope cut:

## Locked Decisions
- ...

## Assumptions
- ...

## Blockers
- ...

## Next Questions
1. ...
2. ...
```

When the user is ready, convert the decisions into a concise feature plan with
summary, key changes, test cases, and explicit assumptions. Use
[`plan-shape.md`](references/plan-shape.md) to keep the final plan compact and
implementation-ready.

# Build Feature Plan Shape

Use this reference when turning answers into a final implementation-ready plan.
Keep the plan concise, but decision complete.

## Summary

State:

- what the feature does
- who it is for
- what existing behavior changes

## Key changes

Group changes by behavior, not by file list. Usually cover:

- UI and route changes
- data or schema changes
- read and mutation interfaces
- background processing or integrations
- compatibility or rollout notes

## Test plan

Include:

- happy-path user scenarios
- edge or failure states
- regression checks for existing behavior

## Assumptions

List the defaults chosen where the user did not care enough to decide.

## When to update planning artifacts

If the feature materially changes product truth, route inventory, or system
behavior, call out the planning docs that should be updated:

- `SPEC.md`
- `UI_PLAN.md`
- `CONTRACT.md`

## Compact example

Use a compact plan shape like this:

```md
## Summary
- Add:
- For:
- Changes:

## Key changes
- UI:
- Data:
- Interfaces:
- Rollout:

## Test plan
- Happy path:
- Failure path:
- Regression:

## Assumptions
- ...
```

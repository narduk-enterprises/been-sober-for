# Build Feature Full Intake

Use this when the user prefers one consolidated questionnaire for a feature
instead of many small rounds. Trim it to fit the feature in front of you.

## Goal and scope

- What exactly is the feature?
- Who is it for?
- What problem does it solve?
- What is in scope now?
- What is out of scope for this feature pass?

## Entry points and UX

- Where does the feature start in the product?
- Which routes, screens, or components are affected?
- What is the happy path?
- What empty, loading, error, and retry states matter?
- What permissions or role gates apply?

## Data and interfaces

- What entities or records change?
- What reads, mutations, jobs, or webhooks are needed?
- Does the feature touch auth, billing, queues, or external systems?
- What existing behavior must stay compatible?

## Rollout and validation

- Is migration or backfill required?
- Does the feature need flags or staged rollout?
- How will we know it works?
- What would make it unsafe to ship?

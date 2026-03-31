# Build Feature Checklist

Use this reference when the feature still feels underdefined after the initial
intake. Do not dump the whole list by default. Pull the sections that matter
for the feature in front of you.

## 1. Goal and success

- What user problem does the feature solve?
- Who is it for?
- What should be measurably better when it ships?
- What is explicitly out of scope?

## 2. Entry points and UX

- Which routes, screens, or user flows does the feature start from?
- What are the main happy paths?
- What are the empty, loading, error, and retry states?
- What permissions or role gates apply?

## 3. Data and state

- What entities are created, read, updated, or archived?
- What state is local UI state versus durable server state?
- Does the feature touch cache, snapshot, or time-series data?
- What retention or lifecycle rules matter?

## 4. Interfaces and integrations

- Which existing APIs or actions are affected?
- What new reads or mutations are required?
- Are background jobs, queues, or webhooks involved?
- What third-party systems or internal services are touched?

## 5. Compatibility and rollout

- Does the feature change existing behavior?
- Is migration, backfill, or dual-read/write needed?
- Are there flags, phased rollout needs, or admin-only gates?

## 6. Acceptance

- What tests should prove the feature works?
- What are the critical failure modes?
- What would make the feature not ready to ship?

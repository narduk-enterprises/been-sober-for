# Build Spec Decision Checklist

Use this reference when the user wants the full checklist or when the spec
still feels thin after an initial discovery pass. Do not dump the whole list
by default. Pull the sections that matter for the product in front of you.

## 1. Product foundation

Lock these first:

- What is the site or product?
- Who is it for?
- What primary action do we want the visitor or user to take?
- What should the product absolutely not try to do at launch?
- What deadline, launch event, or operational constraint is real?
- What would count as success in the first 30 to 90 days?

## 2. Audience and trust

Clarify:

- Primary audience and secondary audience
- Why this audience would trust the product
- What proof exists now: testimonials, credentials, case studies, metrics,
  founder story
- What claims need evidence or careful wording
- What disclaimers, safety guidance, or legal copy are required
- Whether the product operates in a sensitive domain such as health, finance,
  legal, grief, recovery, or children

## 3. Offer and conversion

Lock the conversion path:

- What is being offered: content, service, software, membership, download,
  booking, purchase
- Primary CTA
- Secondary CTA
- What happens after conversion
- Whether conversion requires account creation
- What objections must be answered before a user converts

## 4. Information architecture

Define the surface area:

- Required public routes
- Required authenticated routes
- Utility routes: contact, privacy, terms, FAQ, status, thank-you pages
- Navigation structure
- Footer requirements
- Search, filtering, categories, or taxonomy needs
- Whether there are country, locale, or audience-specific variants

## 5. Content model

Decide where content comes from and who owns it:

- Core page types
- Reusable sections or modules
- Editorial workflow
- CMS versus code-managed content
- Assets required before launch: images, logos, copy decks, video,
  downloadable files
- Content that must be ready for launch versus content that can be staged later

## 6. Core user flows

Capture the concrete sequences:

- First-visit happy path
- Conversion path
- Returning-user path
- Reset, cancel, retry, and failure paths where relevant
- Empty states, loading states, and error states that matter to the experience
- Support or contact escalation path

## 7. Functional requirements

Ask only what applies:

- Auth and roles
- Forms and submissions
- Search
- Booking or scheduling
- Checkout or payments
- Dashboards
- Notifications
- File uploads
- Comments, moderation, or user-generated content
- Internationalization or localization
- Accessibility commitments beyond baseline

## 8. Data and integrations

Lock the moving parts:

- Core entities and relationships
- Identity authority versus app-local session model
- Required third-party services: analytics, CRM, email, CMS, payments, maps,
  search, chat, scheduling
- Inbound and outbound webhooks
- Storage boundaries: relational, cache or snapshot, time-series, search, object
  storage
- Data retention expectations
- Admin or back-office tooling needs
- Reporting needs

## 8.1 Realtime and pipeline decisions

Use this section when the product involves telemetry, streams, devices,
background jobs, or live dashboards.

- What upstream system emits the data?
- Who owns the upstream connection: browser, app backend, edge agent, or
  managed collector?
- What needs true live delivery and what can be batched?
- What freshness target is acceptable for owner views and public views?
- Is there a queue or backlog layer, and where does it live?
- Are browsers allowed to connect to raw upstream systems directly? If yes, why
  is that safe and operationally acceptable?
- Where do latest snapshot state and historical analytics live?
- What batching, retention, downsampling, or replay expectations exist?
- What failure mode matters most: delayed history, stale live state, or dropped
  ingest?

## 9. SEO and discoverability

Clarify before pages are built:

- Search-dependent versus referral-dependent acquisition
- Priority landing pages
- Keyword themes or search intent buckets
- Social sharing needs
- Structured data opportunities
- Search Console, analytics, and campaign tracking expectations

## 10. Non-functional and operational

Lock the practical constraints:

- Performance expectations
- Browser and device priorities
- Accessibility level
- Privacy and consent requirements
- Security expectations
- Observability and alerting needs
- Runtime placement when already known: hostnames, clouds, rollback origin,
  where auth runs, where data stores run
- Ownership after launch: who updates content, who handles leads, who
  responds to support

## 11. Acceptance and scope cuts

End with explicit launch discipline:

- What must be true for launch approval
- What will be deferred to phase 2 on purpose
- Which unresolved questions are acceptable assumptions
- Which unresolved questions are blockers

## Suggested order of questioning

1. Product foundation
2. Audience and trust
3. Offer and conversion
4. Information architecture
5. Core user flows
6. Content model
7. Functional requirements
8. Data and integrations
9. SEO and non-functional constraints
10. Acceptance and scope cuts

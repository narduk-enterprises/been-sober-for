# AGENTS.md — apps/web

This is the **main application**.

## Key Rules

- Do not duplicate bundle-provided files.
- All Cloudflare Workers hard constraints apply here.
- Every page must call `useSeo()` and a Schema.org helper.
- Use `useAsyncData`/`useFetch` for data fetching, never raw `$fetch` in
  `<script setup>`.

## Structure

```
app/           # Frontend: pages, components, layouts, composables
server/        # Edge API routes and database handling
nuxt.config.ts # Extends the published bundle package — keep this slim
wrangler.json  # Cloudflare Workers deployment config
drizzle/       # App-specific SQL migrations only
```

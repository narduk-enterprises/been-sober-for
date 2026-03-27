App-owned SQL migrations live here.

Do not copy shared layer migrations into this directory. The supported flow is:

1. `pnpm run db:migrate` applies
   `@narduk-enterprises/narduk-nuxt-template-layer/drizzle` first.
2. The same command then applies any app-owned `apps/web/drizzle/0*.sql` files.

Generate new app migrations from
[`app-schema.ts`](../server/database/app-schema.ts), not from the combined
runtime schema.

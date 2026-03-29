import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { enforceRateLimitPolicy, RATE_LIMIT_POLICIES } from '#layer/server/utils/rateLimit'
import { soberProfiles } from '#server/database/app-schema'
import { useAppDatabase } from '#server/utils/database'
import { toPublicProfileDto } from '#server/utils/sober-profile'

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(20),
})

export default defineEventHandler(async (event) => {
  await enforceRateLimitPolicy(event, RATE_LIMIT_POLICIES.notifications)

  const { limit } = await getValidatedQuery(event, querySchema.parse)

  // Nitro can inspect dynamic routes during prerender before Cloudflare bindings
  // exist. Keep build-time link inspection quiet without masking runtime issues.
  if (import.meta.prerender && !(event.context.cloudflare?.env as { DB?: D1Database })?.DB) {
    return []
  }

  const db = useAppDatabase(event)
  const rows = await db
    .select()
    .from(soberProfiles)
    .where(eq(soberProfiles.pageVisibility, 'public'))
    .orderBy(desc(soberProfiles.updatedAt))
    .limit(limit)
    .all()

  return rows.map(toPublicProfileDto)
})

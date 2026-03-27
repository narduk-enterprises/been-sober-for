import { eq } from 'drizzle-orm'
import { enforceRateLimitPolicy, RATE_LIMIT_POLICIES } from '#layer/server/utils/rateLimit'
import { soberProfiles } from '#server/database/app-schema'
import { useAppDatabase } from '#server/utils/database'
import { toPublicProfileDto } from '#server/utils/sober-profile'

export default defineEventHandler(async (event) => {
  await enforceRateLimitPolicy(event, RATE_LIMIT_POLICIES.notifications)

  const slugParam = getRouterParam(event, 'slug')
  const slug =
    typeof slugParam === 'string' ? slugParam : Array.isArray(slugParam) ? slugParam[0] : ''
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Missing slug.' })
  }

  const db = useAppDatabase(event)
  const row = await db
    .select()
    .from(soberProfiles)
    .where(eq(soberProfiles.publicSlug, slug.toLowerCase()))
    .get()

  if (!row || row.pageVisibility === 'private') {
    throw createError({ statusCode: 404, message: 'Profile not found.' })
  }

  return toPublicProfileDto(row)
})

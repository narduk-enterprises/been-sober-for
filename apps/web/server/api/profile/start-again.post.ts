import { eq } from 'drizzle-orm'
import { defineUserMutation, withValidatedBody } from '#layer/server/utils/mutation'
import { RATE_LIMIT_POLICIES } from '#layer/server/utils/rateLimit'
import { soberProfiles } from '#server/database/app-schema'
import { useAppDatabase } from '#server/utils/database'
import { buildOwnerProfileResponse, ensureSoberProfile } from '#server/utils/sober-profile'
import { startAgainSchema } from '#server/utils/sober-profile-schemas'

export default defineUserMutation(
  {
    rateLimit: RATE_LIMIT_POLICIES.authProfile,
    parseBody: withValidatedBody((body) => startAgainSchema.parse(body)),
  },
  async ({ event, user, body }) => {
    const db = useAppDatabase(event)
    await ensureSoberProfile(db, user)
    const now = new Date().toISOString()
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    if (body.startedAt > todayStr) {
      throw createError({ statusCode: 400, message: 'Start date cannot be in the future.' })
    }

    await db
      .update(soberProfiles)
      .set({
        sobrietyStartedAt: body.startedAt,
        updatedAt: now,
      })
      .where(eq(soberProfiles.userId, user.id))

    const appUrl = String(useRuntimeConfig(event).public.appUrl || '')
    const updated = await db
      .select()
      .from(soberProfiles)
      .where(eq(soberProfiles.userId, user.id))
      .get()
    if (!updated) {
      throw createError({ statusCode: 500, message: 'Could not update your start date.' })
    }

    return buildOwnerProfileResponse(updated, user.email, appUrl)
  },
)

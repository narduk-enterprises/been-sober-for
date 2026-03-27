import { eq } from 'drizzle-orm'
import { defineUserMutation, withValidatedBody } from '#layer/server/utils/mutation'
import { RATE_LIMIT_POLICIES } from '#layer/server/utils/rateLimit'
import { soberProfiles } from '#server/database/app-schema'
import { useAppDatabase } from '#server/utils/database'
import {
  assertSlugAvailable,
  buildOwnerProfileResponse,
  ensureSoberProfile,
  syncUserDisplayName,
} from '#server/utils/sober-profile'
import { profilePatchSchema } from '#server/utils/sober-profile-schemas'

export default defineUserMutation(
  {
    rateLimit: RATE_LIMIT_POLICIES.authProfile,
    parseBody: withValidatedBody((body) => profilePatchSchema.parse(body)),
  },
  async ({ event, user, body }) => {
    const db = useAppDatabase(event)
    const row = await ensureSoberProfile(db, user)
    const now = new Date().toISOString()

    let publicSlug = row.publicSlug
    if (body.publicSlug !== undefined) {
      publicSlug = await assertSlugAvailable(db, body.publicSlug, user.id)
    }

    const pageVisibility = body.pageVisibility ?? row.pageVisibility
    let allowSearchIndexing = body.allowSearchIndexing ?? row.allowSearchIndexing
    if (pageVisibility !== 'public') {
      allowSearchIndexing = false
    }

    const next = {
      displayName: body.displayName ?? row.displayName,
      publicSlug,
      avatarUrl: body.avatarUrl !== undefined ? body.avatarUrl : row.avatarUrl,
      sobrietyStartedAt:
        body.sobrietyStartedAt !== undefined ? body.sobrietyStartedAt : row.sobrietyStartedAt,
      shortMessage: body.shortMessage !== undefined ? body.shortMessage : row.shortMessage,
      pageVisibility,
      allowSearchIndexing,
      showStartDate: body.showStartDate ?? row.showStartDate,
      showAvatar: body.showAvatar ?? row.showAvatar,
      showQr: body.showQr ?? row.showQr,
      shareLayout: body.shareLayout ?? row.shareLayout,
      updatedAt: now,
    }

    await db.update(soberProfiles).set(next).where(eq(soberProfiles.userId, user.id))

    if (body.displayName !== undefined) {
      await syncUserDisplayName(db, user.id, body.displayName)
    }

    const appUrl = String(useRuntimeConfig(event).public.appUrl || '')
    const updated = await db
      .select()
      .from(soberProfiles)
      .where(eq(soberProfiles.userId, user.id))
      .get()
    if (!updated) {
      throw createError({ statusCode: 500, message: 'Profile update failed.' })
    }

    return buildOwnerProfileResponse(updated, user.email, appUrl)
  },
)

import { eq } from 'drizzle-orm'
import { users } from '#layer/server/database/schema'
import { requireAuth } from '#layer/server/utils/auth'
import { useAppDatabase } from '#server/utils/database'
import { buildOwnerProfileResponse, ensureSoberProfile } from '#server/utils/sober-profile'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = useAppDatabase(event)
  const row = await ensureSoberProfile(db, user)
  const account = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, user.id))
    .get()
  const appUrl = String(useRuntimeConfig(event).public.appUrl || '')
  return buildOwnerProfileResponse(row, account?.email ?? user.email, appUrl)
})

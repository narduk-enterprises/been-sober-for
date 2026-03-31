import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import type { AuthUser } from '#layer/server/utils/auth'
import { users } from '#layer/orm-tables'
import { verifyUserPassword } from '#layer/server/utils/password'

export interface DeleteAccountInput {
  currentPassword?: string
}

/**
 * Extension hooks for the account deletion flow.
 *
 * Apps that back user identity with an external provider (e.g. Supabase Auth)
 * can supply `beforeDelete` to clean up the upstream identity before the local
 * DB row is removed.  If the hook throws, the deletion is aborted and the
 * local user record is left intact.
 */
export interface AccountDeletionHooks {
  /**
   * Called after credential verification but before the local DB row is
   * deleted.  Use this to remove the user from an external identity provider
   * (e.g. `supabase.admin.deleteUser`).  Throwing here will abort the entire
   * deletion so the two sides stay in sync.
   */
  beforeDelete?: (event: H3Event, userId: string) => Promise<void>
}

function isForeignKeyConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    /foreign key/i.test(error.message)
  )
}

export async function deleteCurrentUserAccount(
  event: H3Event,
  user: AuthUser,
  input: DeleteAccountInput = {},
  hooks?: AccountDeletionHooks,
): Promise<void> {
  const log = useLogger(event).child('Auth')
  const db = useDatabase(event)
  const dbUser = await db.select().from(users).where(eq(users.id, user.id)).get()

  if (!dbUser) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found.',
    })
  }

  if (dbUser.passwordHash) {
    if (!input.currentPassword) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Current password is required to delete this account.',
      })
    }

    const isValid = await verifyUserPassword(input.currentPassword, dbUser.passwordHash)
    if (!isValid) {
      log.warn('Account deletion rejected — invalid current password', { userId: user.id })
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid current password.',
      })
    }
  }

  if (hooks?.beforeDelete) {
    await hooks.beforeDelete(event, user.id)
  }

  try {
    await db.delete(users).where(eq(users.id, user.id)).run()
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      throw createError({
        statusCode: 409,
        statusMessage:
          'Account deletion is blocked because app-owned records still reference this user. Configure downstream user foreign keys with ON DELETE CASCADE or clean them up before deleting the account.',
      })
    }

    throw error
  }

  await clearUserSession(event)
  log.info('User deleted account', { userId: user.id })
}

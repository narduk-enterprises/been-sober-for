import type { H3Event } from 'h3'
import type { AppSessionUser } from '#server/utils/app-auth'
import { getCurrentSessionUser, getCurrentSupabaseContext } from '#server/utils/app-auth'

function isUnauthorizedError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    error.statusCode === 401
  )
}

export async function useRefreshedSessionUser(event: H3Event): Promise<AppSessionUser | null> {
  const sessionUser = await getCurrentSessionUser(event)
  if (!sessionUser?.authSessionId) {
    return sessionUser
  }

  try {
    const context = await getCurrentSupabaseContext(event)
    return context.sessionUser
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return null
    }
    throw error
  }
}

export async function useRefreshedSessionUserResponse(event: H3Event) {
  const user = await useRefreshedSessionUser(event)
  return { user }
}

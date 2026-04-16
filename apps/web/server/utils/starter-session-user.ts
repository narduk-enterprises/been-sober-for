import type { H3Event } from 'h3'
import type { StarterAppSessionUser } from '#server/utils/starter-app-auth'
import {
  starterGetCurrentSessionUser,
  starterGetCurrentSupabaseContext,
} from '#server/utils/starter-app-auth'
import {
  starterIsRecoverableSupabaseSessionFailure,
  starterWasAuthSessionRecentlyValidated,
} from './starter-auth-session-stability'

function isUnauthorizedError(error: unknown) {
  return (
    typeof error === 'object' && error !== null && 'statusCode' in error && error.statusCode === 401
  )
}

async function useRefreshedSessionUser(event: H3Event): Promise<StarterAppSessionUser | null> {
  const sessionUser = await starterGetCurrentSessionUser(event)
  if (!sessionUser?.authSessionId) {
    return sessionUser
  }

  if (starterWasAuthSessionRecentlyValidated(sessionUser)) {
    return sessionUser
  }

  try {
    const context = await starterGetCurrentSupabaseContext(event)
    return context.sessionUser
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return null
    }
    if (starterIsRecoverableSupabaseSessionFailure(error)) {
      return sessionUser
    }
    throw error
  }
}

async function useRefreshedSessionUserResponse(event: H3Event) {
  const user = await useRefreshedSessionUser(event)
  return { user }
}

export {
  useRefreshedSessionUser as starterUseRefreshedSessionUser,
  useRefreshedSessionUserResponse as starterUseRefreshedSessionUserResponse,
}

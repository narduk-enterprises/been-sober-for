import { starterUseRefreshedSessionUserResponse as useRefreshedSessionUserResponse } from '#server/utils/starter-session-user'

export default defineEventHandler(async (event) => useRefreshedSessionUserResponse(event))

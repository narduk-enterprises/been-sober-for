import { useRefreshedSessionUserResponse } from '#server/utils/session-user'

export default defineEventHandler(async (event) => useRefreshedSessionUserResponse(event))

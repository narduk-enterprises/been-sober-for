import { getSessionUserResponse } from '#server/utils/app-auth'

export default defineEventHandler(async (event) => getSessionUserResponse(event))

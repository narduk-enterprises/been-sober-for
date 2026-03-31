import { z } from 'zod'
import { definePublicMutation, withValidatedBody } from '#layer/server/utils/mutation'
import { RATE_LIMIT_POLICIES } from '#layer/server/utils/rateLimit'
import { exchangeSupabaseCode } from '#server/utils/app-auth'

const emailVerificationTypeSchema = z.enum([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
])

const bodySchema = z.union([
  z.object({
    code: z.string().min(1),
    next: z.string().optional(),
  }),
  z.object({
    tokenHash: z.string().min(1),
    verificationType: emailVerificationTypeSchema,
    next: z.string().optional(),
  }),
])

export default definePublicMutation(
  {
    rateLimit: RATE_LIMIT_POLICIES.authLogin,
    parseBody: withValidatedBody(bodySchema.parse),
  },
  async ({ event, body }) => exchangeSupabaseCode(event, body),
)

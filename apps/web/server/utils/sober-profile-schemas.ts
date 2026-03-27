import { z } from 'zod'

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')
  .nullable()

const optionalIsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')
  .optional()
  .nullable()

const avatarUrlField = z
  .union([
    z.string().url(),
    z.string().refine((s) => s.startsWith('/images/'), 'Invalid image path'),
    z.literal(''),
  ])
  .optional()
  .nullable()
  .transform((v) => (v === '' ? null : v))

export const profilePatchSchema = z
  .object({
    displayName: z.string().min(1).max(80).optional(),
    publicSlug: z.string().min(3).max(32).optional(),
    avatarUrl: avatarUrlField,
    sobrietyStartedAt: optionalIsoDate,
    shortMessage: z.string().max(280).optional().nullable(),
    pageVisibility: z.enum(['private', 'unlisted', 'public']).optional(),
    allowSearchIndexing: z.boolean().optional(),
    showStartDate: z.boolean().optional(),
    showAvatar: z.boolean().optional(),
    showQr: z.boolean().optional(),
    shareLayout: z.enum(['minimal', 'standard', 'print_ready']).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update.',
  })

export type ProfilePatchBody = z.infer<typeof profilePatchSchema>

export const startAgainSchema = z
  .object({
    startedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.'),
    confirmed: z.literal(true),
  })
  .strict()

export type StartAgainBody = z.infer<typeof startAgainSchema>

export { isoDate }

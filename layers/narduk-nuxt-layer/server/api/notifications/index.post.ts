import { z } from 'zod'
import { defineUserMutation, withValidatedBody } from '#layer/server/utils/mutation'
import { RATE_LIMIT_POLICIES } from '#layer/server/utils/rateLimit'
import { createNotification } from '#layer/server/utils/notifications'

const createNotificationSchema = z.object({
  userId: z.string().min(1).optional(),
  kind: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  icon: z.string().min(1).optional(),
  actionUrl: z.string().min(1).optional(),
  resourceType: z.string().min(1).optional(),
  resourceId: z.string().min(1).optional(),
})

/**
 * POST /api/notifications
 *
 * Create a notification for the current user. Admins may target another user
 * by supplying `userId`.
 */
export default defineUserMutation(
  {
    rateLimit: RATE_LIMIT_POLICIES.notifications,
    parseBody: withValidatedBody(createNotificationSchema.parse),
  },
  async ({ event, user, body }) => {
    const targetUserId = body.userId ?? user.id
    if (targetUserId !== user.id && !user.isAdmin) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only admins can create notifications for other users.',
      })
    }

    const id = await createNotification(event, {
      userId: targetUserId,
      kind: body.kind,
      title: body.title,
      body: body.body,
      icon: body.icon,
      actionUrl: body.actionUrl,
      resourceType: body.resourceType,
      resourceId: body.resourceId,
    })

    return { id }
  },
)

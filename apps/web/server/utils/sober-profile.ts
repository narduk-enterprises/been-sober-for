import { eq } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { AuthUser } from '#layer/server/utils/auth'
import { users } from '#layer/server/database/schema'
import { soberProfiles, type SoberProfile } from '#server/database/app-schema'
import type * as AppSchema from '#server/database/schema'

type AppDb = DrizzleD1Database<typeof AppSchema>

export const RESERVED_PUBLIC_SLUGS = new Set(
  [
    'api',
    'login',
    'register',
    'logout',
    'dashboard',
    'about',
    'faq',
    'privacy',
    'terms',
    'contact',
    'example',
    'print',
    'u',
    'sobriety-calculator',
    '30-days-sober',
    '60-days-sober',
    '90-days-sober',
    '100-days-sober',
    '6-months-sober',
    '1-year-sober',
    '2-years-sober',
    'admin',
    'images',
    'robots.txt',
    'sitemap.xml',
  ].map((s) => s.toLowerCase()),
)

export function isValidPublicSlug(slug: string): boolean {
  const s = slug.toLowerCase()
  if (RESERVED_PUBLIC_SLUGS.has(s)) return false
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length >= 3 && s.length <= 32
}

async function slugTaken(db: AppDb, slug: string, exceptUserId?: string): Promise<boolean> {
  const row = await db
    .select({ userId: soberProfiles.userId })
    .from(soberProfiles)
    .where(eq(soberProfiles.publicSlug, slug.toLowerCase()))
    .get()
  if (!row) return false
  if (exceptUserId && row.userId === exceptUserId) return false
  return true
}

async function allocateUniqueSlug(db: AppDb): Promise<string> {
  for (let i = 0; i < 24; i += 1) {
    const part = crypto.randomUUID().replaceAll('-', '').slice(0, 8)
    const slug = `friend-${part}`
    if (!(await slugTaken(db, slug))) return slug
  }
  throw createError({ statusCode: 500, message: 'Could not allocate a profile URL. Try again.' })
}

export async function ensureSoberProfile(db: AppDb, user: AuthUser): Promise<SoberProfile> {
  const existing = await db
    .select()
    .from(soberProfiles)
    .where(eq(soberProfiles.userId, user.id))
    .get()
  if (existing) return existing

  const now = new Date().toISOString()
  const slug = await allocateUniqueSlug(db)
  await db.insert(soberProfiles).values({
    userId: user.id,
    publicSlug: slug,
    displayName: user.name,
    pageVisibility: 'unlisted',
    allowSearchIndexing: false,
    showStartDate: true,
    showAvatar: true,
    showQr: true,
    shareLayout: 'standard',
    createdAt: now,
    updatedAt: now,
  })

  const created = await db
    .select()
    .from(soberProfiles)
    .where(eq(soberProfiles.userId, user.id))
    .get()
  if (!created) {
    throw createError({ statusCode: 500, message: 'Failed to create profile.' })
  }
  return created
}

export async function assertSlugAvailable(
  db: AppDb,
  slug: string,
  userId: string,
): Promise<string> {
  const normalized = slug.toLowerCase()
  if (!isValidPublicSlug(normalized)) {
    throw createError({
      statusCode: 400,
      message: 'URL must be 3–32 characters: lowercase letters, numbers, and single hyphens only.',
    })
  }
  if (await slugTaken(db, normalized, userId)) {
    throw createError({ statusCode: 400, message: 'That URL is already taken.' })
  }
  return normalized
}

export interface OwnerProfileResponse {
  email: string
  displayName: string | null
  publicSlug: string
  avatarUrl: string | null
  sobrietyStartedAt: string | null
  shortMessage: string | null
  pageVisibility: string
  allowSearchIndexing: boolean
  showStartDate: boolean
  showAvatar: boolean
  showQr: boolean
  shareLayout: string
  publicProfileUrl: string
  updatedAt: string
}

export function buildOwnerProfileResponse(
  row: SoberProfile,
  email: string,
  appUrl: string,
): OwnerProfileResponse {
  const base = appUrl.replace(/\/$/, '')
  return {
    email,
    displayName: row.displayName,
    publicSlug: row.publicSlug,
    avatarUrl: row.avatarUrl,
    sobrietyStartedAt: row.sobrietyStartedAt,
    shortMessage: row.shortMessage,
    pageVisibility: row.pageVisibility,
    allowSearchIndexing: row.allowSearchIndexing,
    showStartDate: row.showStartDate,
    showAvatar: row.showAvatar,
    showQr: row.showQr,
    shareLayout: row.shareLayout,
    publicProfileUrl: `${base}/u/${row.publicSlug}`,
    updatedAt: row.updatedAt,
  }
}

export interface PublicProfileResponse {
  displayName: string | null
  avatarUrl: string | null
  sobrietyStartedAt: string | null
  shortMessage: string | null
  slug: string
  showStartDate: boolean
  showAvatar: boolean
  showQr: boolean
  shareLayout: string
  allowSearchIndexing: boolean
  pageVisibility: string
}

export function toPublicProfileDto(row: SoberProfile): PublicProfileResponse {
  return {
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    sobrietyStartedAt: row.sobrietyStartedAt,
    shortMessage: row.shortMessage,
    slug: row.publicSlug,
    showStartDate: row.showStartDate,
    showAvatar: row.showAvatar,
    showQr: row.showQr,
    shareLayout: row.shareLayout,
    allowSearchIndexing: row.allowSearchIndexing,
    pageVisibility: row.pageVisibility,
  }
}

export async function syncUserDisplayName(
  db: AppDb,
  userId: string,
  displayName: string | null,
): Promise<void> {
  const now = new Date().toISOString()
  await db
    .update(users)
    .set({
      name: displayName,
      updatedAt: now,
    })
    .where(eq(users.id, userId))
}

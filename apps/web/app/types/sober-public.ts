export interface PublicProfilePayload {
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

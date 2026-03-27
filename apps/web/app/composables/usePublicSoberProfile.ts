import type { PublicProfilePayload } from '~/types/sober-public'

type UntypedFetch = (url: string) => Promise<PublicProfilePayload>

/**
 * Public-safe profile by share slug (404 when private or missing).
 */
export function usePublicSoberProfile(slug: MaybeRefOrGetter<string>) {
  const resolved = computed(() => toValue(slug))
  const requestFetch = useRequestFetch() as unknown as UntypedFetch

  return useAsyncData(
    () => `public-profile-${resolved.value || 'none'}`,
    async () => {
      const s = resolved.value
      if (!s) return null
      return requestFetch(`/api/public/profile/${s}`)
    },
    { watch: [resolved] },
  )
}

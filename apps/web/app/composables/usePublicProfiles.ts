import type { PublicProfilePayload } from '~/types/sober-public'

type UntypedFetch = (url: string) => Promise<PublicProfilePayload[]>

export function usePublicProfiles(limit = 20) {
  const requestFetch = useRequestFetch() as unknown as UntypedFetch
  const resolvedLimit = computed(() => Math.min(Math.max(limit, 1), 20))

  return useAsyncData(
    () => `public-profiles-${resolvedLimit.value}`,
    async () => requestFetch(`/api/public/profiles?limit=${resolvedLimit.value}`),
    { watch: [resolvedLimit] },
  )
}
